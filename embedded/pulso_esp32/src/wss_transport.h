#pragma once

#include <WebSocketsClient.h>

#include "transport.h"

namespace plethos {

class WssTransport final : public DeviceTransport {
 public:
  void configure(const DeviceConfig &config, TransportEventHandler handler,
                 void *context) override;
  void connect() override;
  void disconnect() override;
  void loop() override;
  bool connected() const override;
  bool send_text(const char *payload, size_t length) override;

 private:
  void handle_event(WStype_t type, uint8_t *payload, size_t length);

  WebSocketsClient client_;
  DeviceConfig config_{};
  TransportEventHandler handler_ = nullptr;
  void *context_ = nullptr;
  bool connected_ = false;
};

}  // namespace plethos
