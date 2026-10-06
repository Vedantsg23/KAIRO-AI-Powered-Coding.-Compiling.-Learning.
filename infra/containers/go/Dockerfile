# Sandbox image for Go (golang 1.23 from the Ubuntu 24.04 archive).
#
# Same rules as the other sandbox images: student programs run in throw-away
# containers made from this image, with the limits set by the runner
# (read-only root filesystem, no network, all capabilities dropped, non-root
# user, memory/CPU/PID/time caps). Only the standard library is available:
# no module downloads (GOTOOLCHAIN=local, no network). The standard library is
# compiled once here (prepare-std.sh), so compiling a program takes under a
# second instead of rebuilding fmt, os and runtime in every sandbox.
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain version with every execution.
FROM ubuntu:24.04

COPY prepare-std.sh /tmp/prepare-std.sh
RUN apt-get update \
 && apt-get install -y --no-install-recommends golang-1.23-go \
 && rm -rf /var/lib/apt/lists/* \
 && ln -s /usr/lib/go-1.23/bin/go /usr/local/bin/go \
 && ln -s /usr/lib/go-1.23/bin/gofmt /usr/local/bin/gofmt \
 && sh /tmp/prepare-std.sh \
 && rm /tmp/prepare-std.sh \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "Go", "version": "%s", "languages": ["go"]}\n' \
      "$(go env GOVERSION | sed 's/^go//')" > /etc/compiler-copilot/toolchain.json \
 # Defence in depth: no setuid/setgid binaries inside the sandbox.
 && find / -xdev -perm /6000 -type f -exec chmod a-s {} + \
 # Unprivileged sandbox user; UID/GID must match SANDBOX_UID in the runner.
 && groupadd --gid 10001 sandbox \
 && useradd --uid 10001 --gid 10001 --home-dir /tmp --no-create-home \
      --shell /usr/sbin/nologin sandbox \
 && mkdir -p /workspace \
 && chown 10001:10001 /workspace \
 && chmod 0755 /workspace

ENV LANG=C.UTF-8 \
    HOME=/tmp \
    GOTOOLCHAIN=local \
    GOCACHE=/tmp/go-build \
    GOPATH=/tmp/go \
    CGO_ENABLED=0

USER 10001:10001
WORKDIR /workspace
CMD ["go", "version"]
