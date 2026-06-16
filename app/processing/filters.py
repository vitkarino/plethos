from collections import deque

import numpy as np
from scipy import signal

from app.core.config import AppConfig


class PPGNoiseFilter:
    def __init__(self, config: AppConfig) -> None:
        self._config = config

    def filter_pair(self, ir: np.ndarray, red: np.ndarray, fs: float) -> tuple[np.ndarray, np.ndarray]:
        filtered_ir = self.filter_channel(ir, fs)
        filtered_red = self.filter_channel(red, fs)
        if self._config.auto_invert_reflectance and self._is_reflectance_inverted(filtered_ir, fs):
            filtered_ir = -filtered_ir
            filtered_red = -filtered_red
        return filtered_ir, filtered_red

    def decide_inversion(self, ir: np.ndarray, fs: float) -> bool:
        """Whether the IR channel should be inverted (raw reflectance polarity).

        Used by the live path to lock polarity once, instead of re-deciding per
        window (which can flip and create a discontinuity).
        """
        if not self._config.auto_invert_reflectance:
            return False
        return self._is_reflectance_inverted(self.filter_channel(ir, fs), fs)

    def _remove_dc_steps(self, values: np.ndarray, fs: float) -> np.ndarray:
        """Subtract isolated baseline steps (e.g. from sensor temperature reads).

        A real step is a large single-sample jump whose level shift *persists*: the
        median over a full beat before and after the jump differ by about the jump
        size. A systolic edge produces a large jump too, but the waveform returns
        within the beat, so the before/after medians match and it is left alone.
        """
        x = np.asarray(values, dtype=float)
        window = int(round(fs * 1.5))
        if x.size < 4 * window:
            return x

        diffs = np.diff(x)
        mad = float(np.median(np.abs(diffs - np.median(diffs))))
        if mad <= 0.0:
            return x
        threshold = self._config.step_detect_sigma * 1.4826 * mad

        steps: list[tuple[int, float]] = []
        i = window
        while i < x.size - window:
            jump = x[i] - x[i - 1]
            if abs(jump) > threshold:
                before = float(np.median(x[i - window : i]))
                after = float(np.median(x[i : i + window]))
                shift = after - before
                persistent = (
                    np.sign(shift) == np.sign(jump)
                    and abs(shift) > 0.5 * threshold
                    and abs(shift) < 2.0 * abs(jump)
                )
                if persistent:
                    steps.append((i, shift))
                    i += window  # one correction per event; skip its settling region
                    continue
            i += 1

        if not steps:
            return x

        corrected = x.copy()
        cumulative = 0.0
        cursor = 0
        for index in range(1, x.size):
            while cursor < len(steps) and steps[cursor][0] == index:
                cumulative += steps[cursor][1]
                cursor += 1
            corrected[index] = x[index] - cumulative
        return corrected

    def _is_reflectance_inverted(self, filtered: np.ndarray, fs: float) -> bool:
        """Detect raw reflectance polarity (slow diastolic rise, fast systolic fall).

        The IR channel drives the decision and the RED channel follows so the two
        stay in phase. Decision uses upstroke/downstroke timing — the only feature
        that separates real reflectance signals from the symmetric simulator sine.
        """
        if filtered.size < int(round(fs * 2.0)):
            return False
        std = float(np.std(filtered))
        if std < 1e-9:
            return False

        peaks, _ = signal.find_peaks(
            filtered,
            distance=max(1, int(round(fs * 0.4))),
            prominence=std * 0.35,
        )
        if peaks.size < 3:
            return False

        rises: list[int] = []
        falls: list[int] = []
        for start, end in zip(peaks[:-1], peaks[1:]):
            trough = start + int(np.argmin(filtered[start:end]))
            falls.append(trough - start)   # peak -> systolic trough (fast if inverted)
            rises.append(end - trough)     # trough -> next peak (slow if inverted)

        mean_fall = float(np.mean(falls))
        mean_rise = float(np.mean(rises))
        if mean_fall <= 0:
            return False
        return mean_rise > self._config.polarity_rise_fall_ratio * mean_fall

    def filter_channel(self, values: np.ndarray, fs: float) -> np.ndarray:
        if values.size < 3:
            return values.astype(float)

        cleaned = self._remove_dc_steps(values, fs) if self._config.remove_dc_steps else np.asarray(values, dtype=float)
        centered = cleaned - float(np.mean(cleaned))

        nyquist = fs / 2.0
        high = min(self._config.bandpass_high_hz, nyquist * 0.95)
        low = min(self._config.bandpass_low_hz, high * 0.5)
        if low <= 0 or high <= low:
            return centered

        b, a = signal.butter(
            self._config.filter_order,
            [low, high],
            btype="bandpass",
            fs=fs,
        )

        try:
            return signal.filtfilt(b, a, centered)
        except ValueError:
            return centered


class LiveDisplayFilter:
    """Live display conditioning: raw morphology, DC removed, polarity corrected.

    The live view is meant to show the *raw* sensor signal, not a band-pass result —
    band-pass filtering a live stream kept introducing artifacts (boundary jumps,
    phase-warped morphology). So this only does the minimum to make the raw signal
    readable: a gentle 1st-order high-pass removes the DC offset and slow baseline
    drift (without touching the pulse morphology, since the pulse sits well above the
    0.5 Hz cut), and the channel is flipped to the conventional orientation (systole
    up) so it visually matches the stored recording. The high-pass is stateful, so the
    stream stays continuous with no boundary jumps. Polarity is locked once.
    """

    def __init__(self, noise_filter: "PPGNoiseFilter", config: AppConfig) -> None:
        self._filter = noise_filter
        self._config = config
        self._fs: float | None = None
        self._b: np.ndarray | None = None
        self._a: np.ndarray | None = None
        self._zi_unit: np.ndarray | None = None
        self._zi_ir: np.ndarray | None = None
        self._zi_red: np.ndarray | None = None
        self._invert: bool | None = None
        self._warmup_ir: deque[float] = deque()

    def reset(self) -> None:
        self._fs = None
        self._b = None
        self._zi_ir = None
        self._zi_red = None
        self._invert = None
        self._warmup_ir.clear()

    def _ensure_coeffs(self, fs: float) -> None:
        if self._fs == fs and self._b is not None:
            return
        self._fs = fs
        nyquist = fs / 2.0
        cut = min(self._config.bandpass_low_hz, nyquist * 0.5)
        self._b, self._a = signal.butter(1, cut, btype="highpass", fs=fs)
        self._zi_unit = signal.lfilter_zi(self._b, self._a)
        self._zi_ir = None
        self._zi_red = None

    def push(self, samples, fs: float) -> list[dict[str, float | int | None]]:
        self._ensure_coeffs(fs)
        indices: list[int] = []
        ir_vals: list[float] = []
        red_vals: list[float] = []
        last = -1
        for sample in samples:
            index = sample.index if sample.index is not None else last + 1
            last = int(index)
            indices.append(int(index))
            ir_vals.append(float(sample.ir))
            red_vals.append(float(sample.red))
        ir = np.asarray(ir_vals, dtype=float)
        red = np.asarray(red_vals, dtype=float)
        if ir.size == 0 or self._b is None:
            return []

        # Lock polarity once, from a short warm-up buffer of raw IR.
        if self._invert is None:
            self._warmup_ir.extend(ir_vals)
            limit = int(round(fs * 3.0))
            while len(self._warmup_ir) > limit:
                self._warmup_ir.popleft()
            if len(self._warmup_ir) >= int(round(fs * 2.0)):
                self._invert = self._filter.decide_inversion(
                    np.fromiter(self._warmup_ir, dtype=float), fs
                )
                self._warmup_ir.clear()
        invert = self._invert if self._invert is not None else False

        # Initialise from the first sample so the DC offset does not ring on start.
        if self._zi_ir is None:
            self._zi_ir = self._zi_unit * float(ir[0])
            self._zi_red = self._zi_unit * float(red[0])
        display_ir, self._zi_ir = signal.lfilter(self._b, self._a, ir, zi=self._zi_ir)
        display_red, self._zi_red = signal.lfilter(self._b, self._a, red, zi=self._zi_red)
        if invert:
            display_ir = -display_ir
            display_red = -display_red

        return [
            {
                "index": indices[k],
                "t_ms": round(indices[k] / fs * 1000.0, 3) if fs else None,
                "ir": float(ir[k]),
                "red": float(red[k]),
                "ir_filtered": float(display_ir[k]),
                "red_filtered": float(display_red[k]),
            }
            for k in range(len(indices))
        ]
