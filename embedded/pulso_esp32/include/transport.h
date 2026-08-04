#pragma once

#include <stddef.h>
#include <stdint.h>

#include "device_config_types.h"

namespace plethos {

enum class TransportEvent { kConnected, kDisconnected, kText };
using TransportEventHandler =
    void (*)(void *context, TransportEvent event, const uint8_t *payload, size_t length);

// Transport is the seam used by DeviceRuntime. Sampling rules never cross it.
class DeviceTransport {
 public:
  virtual ~DeviceTransport() = default;
  virtual void configure(const DeviceConfig &config, TransportEventHandler handler,
                         void *context) = 0;
  virtual void connect() = 0;
  virtual void disconnect() = 0;
  virtual void loop() = 0;
  virtual bool connected() const = 0;
  virtual bool send_text(const char *payload, size_t length) = 0;
};

}  // namespace plethos
