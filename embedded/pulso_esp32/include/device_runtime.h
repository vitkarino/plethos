#pragma once

#include <Arduino.h>
#include <MAX30105.h>

#include "device_config_types.h"
#include "protocol.h"
#include "sample_pipeline.h"
#include "transport.h"

namespace plethos {

class DeviceRuntime {
 public:
  explicit DeviceRuntime(DeviceTransport &transport);

  bool configure(const DeviceConfig &config);
  void connect();
  bool start_measurement(const char *measurement_id, uint32_t duration_ms,
                         const char *command_id = nullptr);
  bool stop_measurement(const char *measurement_id = nullptr,
                        const char *command_id = nullptr);
  void loop();

 private:
  static void on_transport_event(void *context, TransportEvent event,
                                 const uint8_t *payload, size_t length);
  void handle_transport_event(TransportEvent event, const uint8_t *payload, size_t length);
  void handle_command(const uint8_t *payload, size_t length);
  void connect_wifi_if_due();
  void connect_transport_if_due();
  void collect_sensor_samples();
  void send_hello();
  void send_log(const char *level, const char *code, const char *message);
  bool send_pending_batch();
  void finish_measurement(const char *reason);
  void schedule_reconnect();
  void reset_reconnect();
  uint32_t reconnect_delay_with_jitter() const;

  DeviceTransport &transport_;
  DeviceConfig config_{};
  MAX30105 sensor_;
  SamplePipeline samples_;
  ProtocolCodec protocol_;
  bool configured_ = false;
  bool sensor_ready_ = false;
  bool streaming_ = false;
  bool completion_pending_ = false;
  bool batch_pending_ = false;
  char active_measurement_id_[64] = {};
  uint32_t duration_ms_ = 0;
  uint32_t started_at_ms_ = 0;
  uint64_t target_samples_ = 0;
  float temperature_c_ = NAN;
  SampleBatch pending_batch_{};
  uint8_t reconnect_attempt_ = 0;
  uint32_t next_reconnect_at_ms_ = 0;
  char payload_[kMaximumPayloadBytes] = {};
};

}  // namespace plethos
