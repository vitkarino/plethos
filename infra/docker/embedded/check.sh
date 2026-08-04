#!/usr/bin/env sh
set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
image=${PLETHOS_EMBEDDED_IMAGE:-plethos-embedded-check:local}
platform=${PLETHOS_EMBEDDED_PLATFORM:-linux/amd64}

docker build --file "$repository_root/infra/docker/embedded/Dockerfile" \
  --platform "$platform" \
  --tag "$image" "$repository_root"
