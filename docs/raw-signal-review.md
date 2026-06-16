# Огляд шляху «сирого» PPG-сигналу (для рецензії)

Документ описує **тільки сирий сигнал** — від сенсора до відмалювання, без DSP/ML-обробки.
Мета — знайти, де псується сирий сигнал. Наприкінці — знайдені дефекти з доказами.

Реальний пристрій: ESP32 + MAX30102, `device_id = F4:65:0B:55:2E:80`.
Підключення (за словами автора): ESP32 ↔ сенсор напряму, ESP32 ↔ десктоп напряму, **без розв'язувальних конденсаторів**.

---

## 1. Загальний шлях даних

```
MAX30102 (400 Гц, IR+RED)
   → FIFO сенсора (32 семпли)
   → ESP32: читання FIFO → програмне усереднення 3→1 (133.3 Гц)
   → накопичення в батч по 64 семпли
   → БЛОКУЮЧА відправка батчу через WebSocket (JSON)
   → FastAPI: валідація схеми → буфер → збереження «as-is» у PostgreSQL
   → віддача через REST → Chart.js на фронті
```

Частоти: апаратна `hardwareSampleRate = 400` Гц, програмне усереднення `softwareSampleAverage = 3`,
звітна частота `reportedSampleRate = 400/3 = 133.33` Гц.

---

## 2. Embedded (прошивка) — `embedded/pulso_esp32/pulso_esp32.ino`

### 2.1 Конфігурація сенсора

```cpp
const byte ledBrightness = 0x30;
const byte sampleAverage = 1;            // апаратне усереднення FIFO ВИМКНЕНО
const byte softwareSampleAverage = 3;    // усереднюємо 3 семпли в коді
const byte ledMode = 2;                  // RED + IR
const int  hardwareSampleRate = 400;     // Гц
const int  pulseWidth = 411;             // мкс
const int  adcRange = 4096;
const size_t batchSize = 64;             // семплів у батчі WebSocket

void setupSensor() {
  Wire.begin();
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) { /* ... halt ... */ }
  particleSensor.setup(ledBrightness, sampleAverage, ledMode,
                       hardwareSampleRate, pulseWidth, adcRange);
  particleSensor.clearFIFO();
}
```

> Примітка: `particleSensor.setup(...)` у бібліотеці SparkFun **вмикає FIFO rollover** —
> при переповненні FIFO старі семпли мовчки перезаписуються (втрата даних без помилки).

### 2.2 Читання FIFO + усереднення 3→1

```cpp
void collectSamplesFromFIFO() {
  particleSensor.check();
  while (particleSensor.available()) {
    uint32_t irValue  = particleSensor.getFIFOIR();
    uint32_t redValue = particleSensor.getFIFORed();
    particleSensor.nextSample();
    addRawSampleToAverager(irValue, redValue);
  }
}

void addRawSampleToAverager(uint32_t irValue, uint32_t redValue) {
  averagedIrSum += irValue;
  averagedRedSum += redValue;
  averagedSampleCount++;
  if (averagedSampleCount >= softwareSampleAverage) flushAveragedSample();
}

void flushAveragedSample() {
  if (averagedSampleCount == 0) return;
  uint32_t irValue  = (uint32_t)((averagedIrSum  + averagedSampleCount/2) / averagedSampleCount);
  uint32_t redValue = (uint32_t)((averagedRedSum + averagedSampleCount/2) / averagedSampleCount);
  resetSampleAveraging();
  if (pendingDiscardSamples > 0) { pendingDiscardSamples--; return; } // скидання після темп-зчитування
  addSampleToBatch(irValue, redValue);
}
```

### 2.3 Батчинг і відправка (КРИТИЧНЕ МІСЦЕ)

```cpp
void addSampleToBatch(uint32_t irValue, uint32_t redValue) {
  if (!canStream) return;
  if (targetStreamSamples > 0 && streamSamplesCollected >= targetStreamSamples) return;
  if (batchCount >= batchSize && !sendBatch()) return;   // <-- БЛОКУЮЧА відправка в циклі збору
  // ...
  sampleBatch[batchCount].index = streamSamplesCollected; // індекс = лічильник, НЕ реальний час
  sampleBatch[batchCount].ir = irValue;
  sampleBatch[batchCount].red = redValue;
  batchCount++;
  streamSamplesCollected++;
  if (batchCount >= batchSize) sendBatch();               // <-- і тут теж
}

bool sendBatch() {
  // ...
  // темп-зчитування (блокуюче) робиться ВСЕРЕДИНІ відправки батчу:
  unsigned long now = millis();
  if (isnan(lastTemperatureC) || now - lastTemperatureReadMs >= temperatureReadIntervalMs) {
    lastTemperatureC = particleSensor.readTemperature();  // блокуючий виклик ~десятки мс
    lastTemperatureReadMs = now;
    particleSensor.clearFIFO();                            // (мій фікс) скидання збуреного FIFO
    resetSampleAveraging();
    pendingDiscardSamples = discardSamplesAfterTemp;
  }
  // ... серіалізація 64 семплів у JSON ...
  bool sent = webSocket.sendTXT(jsonBuffer, bytesWritten); // блокуюча TX по Wi-Fi
  batchCount = 0;
  return sent;
}
```

### 2.4 Головний цикл

```cpp
void loop() {
  reconnectWiFiIfNeeded();
  if (WiFi.status() != WL_CONNECTED) { delay(10); return; }
  webSocket.loop();
  if (!wsConnected || !canStream) { delay(5); return; }
  if (streamDurationFinished()) { /* ... */ return; }
  collectSamplesFromFIFO();   // увесь збір + відправка відбувається тут, синхронно
}
```

**Суть проблеми:** збір семплів і відправка живуть в одному синхронному потоці.
Поки `sendBatch()` блокує на серіалізації + Wi-Fi TX (а раз на 5 с — ще й на `readTemperature()`),
FIFO сенсора (32 семпли) продовжує наповнюватись на 400 Гц і переповнюється за ~80 мс.

---

## 3. Симулятор (для порівняння) — `embedded/simulator/simulator.py`

Симулятор **не моделює реальну форму PPG** — це чистий синус + білий шум:

```python
def _sample(self, sample_index, profile):
    t = sample_index / self._config.fs
    phase = 2.0 * math.pi * (profile.bpm/60.0) * t + profile.phase_offset
    red_ac = profile.spo2_ratio * profile.ir_ac * profile.red_dc / profile.ir_dc
    return {
        "index": sample_index,
        "ir":  profile.ir_dc  + profile.ir_ac * math.sin(phase) + random.gauss(0.0, profile.noise),
        "red": profile.red_dc + red_ac        * math.sin(phase) + random.gauss(0.0, profile.noise * 0.75),
    }
# noise = random.uniform(25, 90), ir_ac = random.uniform(1000, 2200)
```

Тобто в сирому вигляді симулятор — це синусоїда без систолічного фронту/дикротичної виїмки,
поверх якої накладено білий гаусів шум до ~9 % амплітуди. Виглядає «ненатурально» саме тому,
що це синус, а не пульсова хвиля.

---

## 4. Прийом на сервері

### 4.1 Схема валідації — `app/schemas/device.py`

```python
class PPGSample(BaseModel):
    index: int | None = Field(default=None, ge=0)
    ir:  float = Field(gt=0)
    red: float = Field(validation_alias=AliasChoices("red", "r"), gt=0)

class DeviceData(BaseModel):
    id: str; measurement_id: str | None; recording_id: str | None
    temp: float | None; fs: float = Field(gt=0)   # fs має бути >= 5 Гц
    samples: list[PPGSample] = Field(min_length=1)
```

### 4.2 Збереження «as-is» — `app/measurements/session.py::_append_samples`

```python
for sample in samples:
    sample_index = sample.index if sample.index is not None else self._next_sample_index
    raw_data = {"ir": float(sample.ir), "red": float(sample.red)}   # зберігаємо рівно як прийшло
    # ... append до буферів запису ...
    rows.append({"sample_index": sample_index, "raw_data": raw_data, "created_at": now})
```

Сирий сигнал у БД (`recordings_samples.raw_data`) = **точні значення з ESP32**, без модифікацій.

### 4.3 Віддача через API — `app/processing/service.py::get_recording_samples_for_api`

```python
t_ms = round(sample_index / float(sample_rate) * 1000.0, 3)   # час = індекс / частоту
output.append({"index": sample_index, "t_ms": t_ms,
               "ir": raw.get("ir"), "red": raw.get("red"),     # <-- сирий
               "ir_filtered": ..., "red_filtered": ...})        # фільтрований окремо
```

> Часова вісь графіка рахується як `index / fs`. Якщо ESP32 загубив семпли (переповнення FIFO),
> індекс усе одно йде підряд `+1`, тож **втрата стає невидимою**, а час «стискається».

### 4.4 Відмалювання — `pulso/app/controllers/components/pulseSamplesChart.ts`

Chart.js малює `raw_data.ir` / `raw_data.r` (сирий) або `ir_filtered`/`red_filtered` як є,
по осі X — `sample_index`. Жодних спотворень на боці фронта немає.

---

## 5. Знайдені дефекти сирого сигналу (з доказами)

Аналіз реальних записів 25–28 (усі — ESP32 `F4:...`).

### ⛔ A. Розриви на межах кожних 64 семплів (блокуюча відправка → переповнення FIFO)

У **кожному** записі семпл одразу після межі батчу (`sample_index % 64 == 0`) має
найбільший середній стрибок з усіх 64 позицій:

| Запис | середній \|Δ\| | на позиції 0 | у скільки разів | ранг позиції 0 |
|-------|------:|------:|:----:|:----:|
| rec25 | 45.0 | 80.3 | ×1.78 | **1 / 64** |
| rec26 | 79.8 | 144.2 | ×1.81 | **1 / 64** |
| rec27 | 80.7 | 134.4 | ×1.66 | **1 / 64** |
| rec28 | 82.3 | 136.0 | ×1.65 | **1 / 64** |

Це **детермінований** артефакт, синхронний із розміром батчу (64), а не з пульсом
(період удару ~89–97 семплів — несумісний з 64, тож не міг би стабільно потрапляти на позицію 0).
Причина — `sendBatch()` блокує цикл збору; за час серіалізації + Wi-Fi TX FIFO (32 семпли @400 Гц ≈ 80 мс)
переповнюється, спрацьовує FIFO rollover → частина семплів губиться → стрибок на стику батчів.

### ⛔ B. Періодичні сходинки DC кожні ~5.28 с (темп-зчитування)

Великі стрибки рівня (>5σ), що **зберігаються**, ідуть рівно через 704 семпли = `11×64` = 5.28 с,
що збігається з `temperatureReadIntervalMs`. Присутні досі в rec27 і rec28
(spacing = 704), тобто фікс прошивки або **не залитий**, або `readTemperature()` — не єдина причина.
`readTemperature()` блокує I²C і збурює оптичний потік.

### ⚠️ C. Індекс семпла не відображає реальний час

`sample_index = streamSamplesCollected` інкрементується на кожен *відправлений* семпл.
При втраті семплів (п. A, B) пропуску в індексі немає → часова вісь графіка (`t = index/fs`)
мовчки стискається, форма хвилі спотворюється. Немає лічильника втрачених/overflow-семплів.

### ⚠️ D. Синфазний ВЧ-шум (живлення без розв'язки)

ВЧ-шум (>40 Гц, де фізіології немає) корелює між незалежними каналами IR і RED на рівні **+0.4**,
RMS ≈ 12 одиниць. Це ознака шуму по спільній шині живлення / опорній напрузі АЦП —
узгоджується з прямим підключенням без конденсаторів і перемикальним шумом Wi-Fi.
Мережевого піку 50/60 Гц немає. У потужності цей шум ~у 100× менший за смугу пульсу
(смуговий фільтр його прибирає), але він «волохатить» сирий сигнал.

### ℹ️ E. Симулятор — синус, не пульсова хвиля

Сирий сигнал симулятора (розд. 3) — синусоїда + білий шум, без систолічного фронту.
Виглядає ненатурально за дизайном; це не баг прийому/зберігання.

---

## 6. Рекомендовані напрями (коротко)

1. **Розв'язати збір від передачі** (головне для п. A): ESP32 двоядерний —
   виносити Wi-Fi TX на окреме ядро/задачу (FreeRTOS), або double-buffering, або
   менші/частіші батчі + неблокуюча відправка. Увімкнути апаратне усереднення замість
   читання FIFO «насухо», щоб знизити темп переповнення.
2. **Темп-зчитування** (п. B): підтвердити, що прошивку перепрошито (30 с + скидання семплів);
   або винести `readTemperature()` зовсім з гарячого шляху.
3. **Лічильник overflow/втрат** (п. C): читати `OVF_COUNTER` MAX30102 і передавати пропуски в індексі,
   щоб втрати були видимі, а час — коректний.
4. **Залізо** (п. D): 100 нФ + 10 мкФ кераміка біля VIN/GND MAX30102; короткі скручені дроти.
