#pragma once

#include <Arduino.h>

#include "device_config_types.h"
#include "sample_pipeline.h"

namespace plethos {

constexpr uint8_t kProtocolVersion = 1;
constexpr size_t kMaximumPayloadBytes = 8192;

struct DeviceCommand {
  enum class Type { kNone, kStart, kStop };
  Type type = Type::kNone;
  String command_id;
  String measurement_id;
  uint32_t duration_ms = 0;
  bool legacy = false;
};

class ProtocolCodec {
 public:
  bool decode_command(const uint8_t *payload, size_t length, DeviceCommand &command,
                      String &error) const;
  size_t encode_hello(char *output, size_t capacity, const DeviceConfig &config) const;
  size_t encode_ack(char *output, size_t capacity, const DeviceConfig &config,
                    const char *type, const char *measurement_id,
                    const char *command_id) const;
  size_t encode_log(char *output, size_t capacity, const DeviceConfig &config,
                    const char *level, const char *code, const char *message,
                    const char *measurement_id = nullptr) const;
  size_t encode_finished(char *output, size_t capacity, const DeviceConfig &config,
                         const char *measurement_id, const char *reason,
                         uint64_t samples_acquired, uint32_t dropped_samples) const;
  size_t encode_samples(char *output, size_t capacity, const DeviceConfig &config,
                        const char *measurement_id, const char *batch_id,
                        float sample_rate_hz, float temperature_c,
                        const SampleBatch &batch) const;
};

}  // namespace plethos
