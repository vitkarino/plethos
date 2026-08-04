FROM python:3.12.11-slim-bookworm@sha256:519591d6871b7bc437060736b9f7456b8731f1499a57e22e6c285135ae657bf7

ARG PLATFORMIO_VERSION=6.1.19

RUN apt-get update \
    && apt-get install --yes --no-install-recommends build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --no-cache-dir "platformio==${PLATFORMIO_VERSION}" \
    && useradd --create-home --uid 10001 platformio \
    && mkdir -p /workspace/embedded/pulso_esp32 \
    && chown -R platformio:platformio /workspace

USER platformio
ENV PLATFORMIO_CORE_DIR=/home/platformio/.platformio
WORKDIR /workspace/embedded/pulso_esp32

COPY --chown=platformio:platformio embedded/pulso_esp32/ ./

RUN platformio test --environment native \
    && platformio run --environment ci

ENTRYPOINT ["platformio"]
CMD ["run", "--environment", "ci"]
