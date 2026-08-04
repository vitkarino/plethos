#include "protocol.h"

#include <ArduinoJson.h>
#include <math.h>

namespace plethos {
namespace {

size_t serialize(JsonDocument &document, char *output, size_t capacity) {
  const size_t needed = measureJson(document) + 1;
  if (needed > capacity) {
    return 0;
  }
  const size_t written = serializeJson(document, output, capacity);
  return written > 0 && written < capacity ? written : 0;
}

void add_common(JsonDocument &document, const DeviceConfig &config, const char *type) {
  document["protocol_version"] = kProtocolVersion;
  document["type"] = type;
  document["device_id"] = config.device_id;
}

void add_optional(JsonDocument &document, const char *key, const char *value) {
  if (value != nullptr && value[0] != '\0') {
    document[key] = value;
  }
}

}  // namespace

bool ProtocolCodec::decode_command(const uint8_t *payload, size_t length,
                                   DeviceCommand &command, String &error) const {
  command = DeviceCommand{};
  if (length == 0 || length > kMaximumPayloadBytes) {
    error = "payload_size_invalid";
    return false;
  }

  JsonDocument document;
  const auto parse_error = deserializeJson(document, payload, length);
  if (parse_error || !document.is<JsonObject>()) {
    error = "malformed_json";
    return false;
  }

  const JsonVariant version = document["protocol_version"];
  command.legacy = version.isNull();
  if (!command.legacy && version.as<int>() != kProtocolVersion) {
    error = "unsupported_protocol_version";
    return false;
  }

  const char *type = document["type"] | "";
  if (strcmp(type, "hello_ack") == 0) {
    return true;
  }
  if (strcmp(type, "start") == 0) {
    command.type = DeviceCommand::Type::kStart;
  } else if (strcmp(type, "stop") == 0) {
    command.type = DeviceCommand::Type::kStop;
  } else {
    error = "unsupported_message_type";
    return false;
  }

  command.command_id = document["command_id"] | "";
  command.measurement_id = document["measurement_id"] | "";
  if (!command.legacy && command.command_id.isEmpty()) {
    error = "command_id_required";
    return false;
  }
  if (command.type == DeviceCommand::Type::kStart && command.measurement_id.isEmpty()) {
    error = "measurement_id_required";
    return false;
  }
  if (!command.legacy && command.type == DeviceCommand::Type::kStop &&
      command.measurement_id.isEmpty()) {
    error = "measurement_id_required";
    return false;
  }

  const double duration_seconds = document["duration"] | 0.0;
  if (duration_seconds > 0.0) {
    command.duration_ms = static_cast<uint32_t>(duration_seconds * 1000.0);
  }
  return true;
}

size_t ProtocolCodec::encode_hello(char *output, size_t capacity,
                                   const DeviceConfig &config) const {
  JsonDocument document;
  add_common(document, config, "hello");
  document["is_simulated"] = false;
  document["credential"] = config.device_token;
  document["capabilities"]["max_batch_size"] = kMaximumBatchSize;
  document["capabilities"]["sample_rate_hz"] = 100.0;
  return serialize(document, output, capacity);
}

size_t ProtocolCodec::encode_ack(char *output, size_t capacity,
                                 const DeviceConfig &config, const char *type,
                                 const char *measurement_id,
                                 const char *command_id) const {
  JsonDocument document;
  add_common(document, config, type);
  add_optional(document, "measurement_id", measurement_id);
  add_optional(document, "command_id", command_id);
  return serialize(document, output, capacity);
}

size_t ProtocolCodec::encode_log(char *output, size_t capacity,
                                 const DeviceConfig &config, const char *level,
                                 const char *code, const char *message,
                                 const char *measurement_id) const {
  JsonDocument document;
  add_common(document, config, "log");
  document["level"] = level;
  document["code"] = code;
  document["message"] = message;
  add_optional(document, "measurement_id", measurement_id);
  return serialize(document, output, capacity);
}

size_t ProtocolCodec::encode_finished(char *output, size_t capacity,
                                      const DeviceConfig &config,
                                      const char *measurement_id,
                                      const char *reason,
                                      uint64_t samples_acquired,
                                      uint32_t dropped_samples) const {
  JsonDocument document;
  add_common(document, config, "finished");
  document["measurement_id"] = measurement_id;
  document["reason"] = reason;
  document["samples_acquired"] = samples_acquired;
  document["dropped_samples"] = dropped_samples;
  return serialize(document, output, capacity);
}

size_t ProtocolCodec::encode_samples(char *output, size_t capacity,
                                     const DeviceConfig &config,
                                     const char *measurement_id,
                                     const char *batch_id, float sample_rate_hz,
                                     float temperature_c,
                                     const SampleBatch &batch) const {
  JsonDocument document;
  add_common(document, config, "samples");
  document["measurement_id"] = measurement_id;
  document["batch_id"] = batch_id;
  document["sample_rate_hz"] = sample_rate_hz;
  document["dropped_samples"] = batch.dropped_samples;
  if (!isnan(temperature_c)) {
    document["sensor_temp_c"] = temperature_c;
  }
  JsonArray samples = document["samples"].to<JsonArray>();
  for (size_t index = 0; index < batch.count; ++index) {
    JsonObject sample = samples.add<JsonObject>();
    sample["index"] = batch.samples[index].index;
    sample["ir"] = batch.samples[index].ir;
    sample["red"] = batch.samples[index].red;
  }
  return serialize(document, output, capacity);
}

}  // namespace plethos
