#include "device_runtime.h"

#include <WiFi.h>
#include <Wire.h>
#include <esp_system.h>
#include <math.h>
#include <string.h>

namespace plethos {
namespace {

constexpr uint8_t kLedBrightness = 0x30;
constexpr uint8_t kHardwareSampleAverage = 4;
constexpr uint8_t kSoftwareSampleAverage = 1;
constexpr uint8_t kLedMode = 2;
constexpr int kHardwareSampleRate = 400;
constexpr float kReportedSampleRate =
    static_cast<float>(kHardwareSampleRate) /
    (kHardwareSampleAverage * kSoftwareSampleAverage);
constexpr int kPulseWidth = 411;
constexpr int kAdcRange = 4096;
constexpr uint32_t kReconnectBaseMs = 1000;
constexpr uint32_t kReconnectMaximumMs = 30000;

bool elapsed(uint32_t now, uint32_t deadline) {
  return static_cast<int32_t>(now - deadline) >= 0;
}

}  // namespace

bool validate_config(const DeviceConfig &config, String &error) {
  if (config.wifi_ssid == nullptr || config.wifi_ssid[0] == '\0') {
    error = "wifi_ssid_required";
  } else if (config.device_id == nullptr || strncmp(config.device_id, "dev_", 4) != 0 ||
             strlen(config.device_id) >= 64) {
    error = "device_id_must_use_dev_prefix";
  } else if (config.server_host == nullptr || config.server_host[0] == '\0') {
    error = "server_hostname_required";
  } else if (config.server_path == nullptr || config.server_path[0] != '/') {
    error = "server_path_invalid";
  } else if (strstr(config.server_path, config.device_id) == nullptr) {
    error = "server_path_must_include_device_id";
  } else if (config.device_token == nullptr || config.device_token[0] == '\0') {
    error = "device_token_required";
  } else if (config.tls_enabled &&
             (config.ca_certificate_pem == nullptr || config.ca_certificate_pem[0] == '\0')) {
    error = "ca_certificate_required_for_tls";
  } else {
    return true;
  }
  return false;
}

DeviceRuntime::DeviceRuntime(DeviceTransport &transport)
    : transport_(transport), samples_(kSoftwareSampleAverage) {}

bool DeviceRuntime::configure(const DeviceConfig &config) {
  String error;
  if (!validate_config(config, error)) {
    Serial.printf("Configuration rejected: %s\n", error.c_str());
    return false;
  }
  config_ = config;
  transport_.configure(config_, &DeviceRuntime::on_transport_event, this);

  Wire.begin();
  sensor_ready_ = sensor_.begin(Wire, I2C_SPEED_FAST);
  if (!sensor_ready_) {
    Serial.println("MAX3010x sensor not found");
    return false;
  }
  sensor_.setup(kLedBrightness, kHardwareSampleAverage, kLedMode,
                kHardwareSampleRate, kPulseWidth, kAdcRange);
  sensor_.clearFIFO();
  configured_ = true;
  return true;
}

void DeviceRuntime::connect() {
  if (!configured_) {
    return;
  }
  WiFi.mode(WIFI_STA);
  reconnect_attempt_ = 0;
  next_reconnect_at_ms_ = 0;
  connect_wifi_if_due();
}

bool DeviceRuntime::start_measurement(const char *measurement_id, uint32_t duration_ms,
                                      const char *command_id) {
  if (!configured_ || measurement_id == nullptr || measurement_id[0] == '\0' ||
      strlen(measurement_id) >= sizeof(active_measurement_id_)) {
    return false;
  }
  snprintf(active_measurement_id_, sizeof(active_measurement_id_), "%s", measurement_id);
  duration_ms_ = duration_ms;
  started_at_ms_ = millis();
  target_samples_ = duration_ms == 0
                        ? 0
                        : static_cast<uint64_t>(ceil(duration_ms * kReportedSampleRate / 1000.0));
  samples_.start_measurement();
  completion_pending_ = false;
  batch_pending_ = false;
  temperature_c_ = sensor_.readTemperature();
  sensor_.clearFIFO();
  streaming_ = true;

  const size_t length = protocol_.encode_ack(payload_, sizeof(payload_), config_,
                                              "start_ack", active_measurement_id_, command_id);
  if (length > 0) {
    transport_.send_text(payload_, length);
  }
  return true;
}

bool DeviceRuntime::stop_measurement(const char *measurement_id, const char *command_id) {
  if (!streaming_) {
    return false;
  }
  if (measurement_id != nullptr && measurement_id[0] != '\0' &&
      strcmp(measurement_id, active_measurement_id_) != 0) {
    send_log("warning", "stale_stop_ignored", "Stop command targeted another measurement");
    return false;
  }
  samples_.flush_average();
  while (batch_pending_ || samples_.has_samples()) {
    if (!send_pending_batch()) {
      completion_pending_ = true;
      return false;
    }
  }
  const size_t length = protocol_.encode_ack(payload_, sizeof(payload_), config_,
                                              "stop_ack", active_measurement_id_, command_id);
  if (length > 0) {
    transport_.send_text(payload_, length);
  }
  streaming_ = false;
  completion_pending_ = false;
  active_measurement_id_[0] = '\0';
  return true;
}

void DeviceRuntime::loop() {
  if (!configured_) {
    delay(25);
    return;
  }

  connect_wifi_if_due();
  if (WiFi.status() != WL_CONNECTED) {
    if (streaming_) {
      collect_sensor_samples();
    }
    delay(2);
    return;
  }

  connect_transport_if_due();
  transport_.loop();
  if (streaming_ && !completion_pending_) {
    collect_sensor_samples();
  }
  if (streaming_) {
    if (transport_.connected() && (batch_pending_ || samples_.batch_ready())) {
      send_pending_batch();
    }
    const bool sample_target_reached =
        target_samples_ > 0 && samples_.acquired_sample_count() >= target_samples_;
    const bool duration_guard_reached =
        duration_ms_ > 0 && millis() - started_at_ms_ >= duration_ms_ + 2000;
    if (!completion_pending_ && (sample_target_reached || duration_guard_reached)) {
      completion_pending_ = true;
      samples_.flush_average();
    }
    if (completion_pending_ && transport_.connected()) {
      finish_measurement("duration_reached");
    }
  }
}

void DeviceRuntime::on_transport_event(void *context, TransportEvent event,
                                       const uint8_t *payload, size_t length) {
  static_cast<DeviceRuntime *>(context)->handle_transport_event(event, payload, length);
}

void DeviceRuntime::handle_transport_event(TransportEvent event, const uint8_t *payload,
                                           size_t length) {
  if (event == TransportEvent::kConnected) {
    reset_reconnect();
    send_hello();
  } else if (event == TransportEvent::kDisconnected) {
    schedule_reconnect();
  } else if (event == TransportEvent::kText) {
    handle_command(payload, length);
  }
}

void DeviceRuntime::handle_command(const uint8_t *payload, size_t length) {
  DeviceCommand command;
  String error;
  if (!protocol_.decode_command(payload, length, command, error)) {
    send_log("warning", error.c_str(), "Rejected device command");
    return;
  }
  if (command.type == DeviceCommand::Type::kStart) {
    if (streaming_) {
      if (command.measurement_id == active_measurement_id_) {
        const size_t ack_length = protocol_.encode_ack(
            payload_, sizeof(payload_), config_, "start_ack", active_measurement_id_,
            command.command_id.c_str());
        if (ack_length > 0) {
          transport_.send_text(payload_, ack_length);
        }
      } else {
        send_log("warning", "measurement_already_active",
                 "Start command ignored while another measurement is active");
      }
      return;
    }
    start_measurement(command.measurement_id.c_str(), command.duration_ms,
                      command.command_id.c_str());
  } else if (command.type == DeviceCommand::Type::kStop) {
    stop_measurement(command.measurement_id.c_str(), command.command_id.c_str());
  }
}

void DeviceRuntime::connect_wifi_if_due() {
  if (WiFi.status() == WL_CONNECTED || !elapsed(millis(), next_reconnect_at_ms_)) {
    return;
  }
  WiFi.disconnect();
  WiFi.begin(config_.wifi_ssid, config_.wifi_password);
  schedule_reconnect();
}

void DeviceRuntime::connect_transport_if_due() {
  if (transport_.connected() || !elapsed(millis(), next_reconnect_at_ms_)) {
    return;
  }
  transport_.connect();
  schedule_reconnect();
}

void DeviceRuntime::collect_sensor_samples() {
  if (!sensor_ready_) {
    return;
  }
  sensor_.check();
  while (sensor_.available()) {
    samples_.add_raw_sample(sensor_.getFIFOIR(), sensor_.getFIFORed());
    sensor_.nextSample();
  }
}

void DeviceRuntime::send_hello() {
  const size_t length = protocol_.encode_hello(payload_, sizeof(payload_), config_);
  if (length > 0) {
    transport_.send_text(payload_, length);
  }
}

void DeviceRuntime::send_log(const char *level, const char *code, const char *message) {
  if (!transport_.connected()) {
    return;
  }
  const size_t length = protocol_.encode_log(
      payload_, sizeof(payload_), config_, level, code, message,
      streaming_ ? active_measurement_id_ : nullptr);
  if (length > 0) {
    transport_.send_text(payload_, length);
  }
}

bool DeviceRuntime::send_pending_batch() {
  if (!transport_.connected()) {
    return false;
  }
  if (!batch_pending_) {
    if (!samples_.has_samples()) {
      return true;
    }
    pending_batch_ = samples_.take_batch();
    batch_pending_ = true;
  }
  char batch_id[160];
  snprintf(batch_id, sizeof(batch_id), "%s:%s:%lu", config_.device_id,
           active_measurement_id_, static_cast<unsigned long>(pending_batch_.sequence));
  const size_t length = protocol_.encode_samples(
      payload_, sizeof(payload_), config_, active_measurement_id_, batch_id,
      kReportedSampleRate, temperature_c_, pending_batch_);
  if (length == 0 || !transport_.send_text(payload_, length)) {
    Serial.println("Sample batch send failed; stable batch retained for reconnect");
    return false;
  }
  batch_pending_ = false;
  return true;
}

void DeviceRuntime::finish_measurement(const char *reason) {
  if (!send_pending_batch() || batch_pending_ || samples_.has_samples()) {
    return;
  }
  const size_t length = protocol_.encode_finished(
      payload_, sizeof(payload_), config_, active_measurement_id_, reason,
      samples_.acquired_sample_count(), samples_.total_dropped_sample_count());
  if (length == 0 || !transport_.send_text(payload_, length)) {
    return;
  }
  streaming_ = false;
  completion_pending_ = false;
  active_measurement_id_[0] = '\0';
}

void DeviceRuntime::schedule_reconnect() {
  next_reconnect_at_ms_ = millis() + reconnect_delay_with_jitter();
  if (reconnect_attempt_ < 6) {
    ++reconnect_attempt_;
  }
}

void DeviceRuntime::reset_reconnect() {
  reconnect_attempt_ = 0;
  next_reconnect_at_ms_ = 0;
}

uint32_t DeviceRuntime::reconnect_delay_with_jitter() const {
  const uint8_t power = reconnect_attempt_ < 5 ? reconnect_attempt_ : 5;
  const uint32_t exponent = 1UL << power;
  const uint32_t candidate = kReconnectBaseMs * exponent;
  const uint32_t bounded = candidate < kReconnectMaximumMs ? candidate : kReconnectMaximumMs;
  const uint32_t jitter = esp_random() % (bounded / 4 + 1);
  return bounded - bounded / 8 + jitter;
}

}  // namespace plethos
