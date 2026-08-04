#include <Arduino.h>

#include "device_runtime.h"
#include "wss_transport.h"

#if defined(PLETHOS_USE_EXAMPLE_CONFIG)
#include "device_config.example.h"
#else
#include "device_config.h"
#endif

namespace {

plethos::WssTransport transport;
plethos::DeviceRuntime runtime(transport);

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(100);
  if (runtime.configure(plethos::load_device_config())) {
    runtime.connect();
  }
}

void loop() { runtime.loop(); }
