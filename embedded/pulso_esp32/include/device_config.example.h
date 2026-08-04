#pragma once

#include "device_config_types.h"

// Safe compile-only values. Copy this file to device_config.h and provision
// real values locally. device_config.h is ignored by Git.
namespace plethos {

inline DeviceConfig load_device_config() {
  static const char kExampleRootCa[] = R"PEM(-----BEGIN CERTIFICATE-----
MIIBszCCAVmgAwIBAgIUExampleCertificateForCompileOnlyDoNotUsewCgYIKoZ
Izj0EAwIwEjEQMA4GA1UEAwwHZXhhbXBsZTAeFw0yNjAxMDEwMDAwMDBaFw0yNzAx
MDEwMDAwMDBaMBIxEDAOBgNVBAMMB2V4YW1wbGUwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAATExampleCertificateMaterialForCompileOnlyNotTrusted0000000
0000000000000000000000000000000000000000000000000000000000000000
o1MwUTAdBgNVHQ4EFgQUExampleCertificateForCompileOnly000000wHwYDVR0j
BBgwFoAUExampleCertificateForCompileOnly000000wDwYDVR0TAQH/BAUwAwEB
/zAKBggqhkjOPQQDAgNIADBFAiEAExampleCertificateForCompileOnly000000
000000000000000CIExampleCertificateForCompileOnly0000000000000000
-----END CERTIFICATE-----)PEM";

  return {
      "example-wifi",
      "replace-locally",
      "dev_example-device-001",
      "plethos.example.invalid",
      443,
      "/ws/devices/dev_example-device-001",
      true,
      kExampleRootCa,
      "replace-with-provisioned-token",
  };
}

}  // namespace plethos
