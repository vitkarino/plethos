# Plethos FastAPI application image.
#
# Multi-stage: dependencies are built into a virtualenv in the builder, then only
# the finished virtualenv and the application source are copied into the runtime
# stage. Compilers and package caches never reach the shipped image.
#
# Build context is the repository root, so the build can see both `server/` and
# `contracts/` (the device protocol fixtures the tests validate against):
#   docker build -f infra/docker/server/Dockerfile .

# Pinned by digest as well as tag so a rebuild resolves the same base layer.
ARG PYTHON_IMAGE=python:3.13-slim@sha256:6771159cd4fa5d9bba1258caf0b82e6b73458c694d178ad97c5e925c2d0e1a91

FROM ${PYTHON_IMAGE} AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

# psycopg[binary] ships wheels, but scipy/scikit-learn may need a toolchain on
# architectures without prebuilt wheels. Present in the builder only.
RUN apt-get update \
 && apt-get install --no-install-recommends -y build-essential \
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

# Copy only the lockfiles first: dependency layers stay cached while application
# source changes.
COPY server/requirements/base.txt /tmp/requirements/base.txt

# --require-hashes makes pip verify every artifact against the committed lockfile
# and refuse anything unpinned.
RUN python -m pip install --require-hashes -r /tmp/requirements/base.txt


FROM ${PYTHON_IMAGE} AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}" \
    APP_LOAD_DOTENV=0

# Non-root with a fixed uid/gid so mounted volumes have predictable ownership.
RUN groupadd --gid 10001 plethos \
 && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin plethos

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# `contracts/` is needed at runtime too: it is the versioned wire contract, and
# the test suite validates against its fixtures.
COPY --chown=root:root server/ /app/server/
COPY --chown=root:root contracts/ /app/contracts/

# Source is owned by root and world-readable but not writable by the runtime
# user, so a compromised process cannot rewrite its own code.
RUN chmod -R a-w /app

WORKDIR /app/server

USER 10001:10001

EXPOSE 8080

# Readiness, not liveness: an orchestrator should only route traffic once the
# database is reachable and the schema is at head.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/api/health/ready', timeout=4).status==200 else 1)"

# Exactly one worker: live device connections, measurement sessions, sample
# buffers, and browser subscribers are process-local state. See the one-worker
# rule in server/README.md.
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
