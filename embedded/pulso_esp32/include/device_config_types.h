#pragma once

#include <Arduino.h>

namespace plethos {

struct DeviceConfig {
  const char *wifi_ssid;
  const char *wifi_password;
  const char *device_id;
  const char *server_host;
  uint16_t server_port;
  const char *server_path;
  bool tls_enabled;
  const char *ca_certificate_pem;
  const char *device_token;
};

bool validate_config(const DeviceConfig &config, String &error);

}  // namespace plethos
