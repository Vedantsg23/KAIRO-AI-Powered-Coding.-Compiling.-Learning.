# Sandbox image for Rust (rustc 1.75 from the Ubuntu 24.04 archive).
#
# Same rules as the other sandbox images: student programs run in throw-away
# containers made from this image, with the limits set by the runner
# (read-only root filesystem, no network, all capabilities dropped, non-root
# user, memory/CPU/PID/time caps). Single-file programs are compiled with rustc directly
# (no cargo, no crates, no network).
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain version with every execution.
FROM ubuntu:24.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends rustc gcc libc6-dev \
 && rm -rf /var/lib/apt/lists/* \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "rustc", "version": "%s", "languages": ["rust"]}\n' \
      "$(rustc --version | cut -d' ' -f2)" > /etc/compiler-copilot/toolchain.json \
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
    HOME=/tmp

USER 10001:10001
WORKDIR /workspace
CMD ["rustc", "--version"]
