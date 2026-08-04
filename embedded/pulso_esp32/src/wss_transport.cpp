#include "wss_transport.h"

namespace plethos {

void WssTransport::configure(const DeviceConfig &config, TransportEventHandler handler,
                             void *context) {
  config_ = config;
  handler_ = handler;
  context_ = context;
  client_.onEvent([this](WStype_t type, uint8_t *payload, size_t length) {
    handle_event(type, payload, length);
  });
  client_.setReconnectInterval(60000);
  client_.enableHeartbeat(15000, 3000, 2);
}

void WssTransport::connect() {
  connected_ = false;
  if (config_.tls_enabled) {
    client_.beginSslWithCA(config_.server_host, config_.server_port, config_.server_path,
                           config_.ca_certificate_pem);
  } else {
    client_.begin(config_.server_host, config_.server_port, config_.server_path);
  }
}

void WssTransport::disconnect() {
  connected_ = false;
  client_.disconnect();
}

void WssTransport::loop() { client_.loop(); }

bool WssTransport::connected() const { return connected_; }

bool WssTransport::send_text(const char *payload, size_t length) {
  return connected_ && client_.sendTXT(payload, length);
}

void WssTransport::handle_event(WStype_t type, uint8_t *payload, size_t length) {
  if (type == WStype_CONNECTED) {
    connected_ = true;
    if (handler_ != nullptr) {
      handler_(context_, TransportEvent::kConnected, nullptr, 0);
    }
  } else if (type == WStype_DISCONNECTED) {
    connected_ = false;
    if (handler_ != nullptr) {
      handler_(context_, TransportEvent::kDisconnected, nullptr, 0);
    }
  } else if (type == WStype_TEXT && handler_ != nullptr) {
    handler_(context_, TransportEvent::kText, payload, length);
  }
}

}  // namespace plethos
