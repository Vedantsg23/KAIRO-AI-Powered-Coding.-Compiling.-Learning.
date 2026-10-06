# Sandbox image for C and C++ (GCC 13).
#
# Untrusted student programs are compiled and run in containers made from this
# image, with limits set by the runner (read-only root filesystem, no network,
# all capabilities dropped, non-root user, memory/CPU/PID/time caps).
#
# Reproducibility: for a deployment, pin the base image by digest, e.g.
#   FROM ubuntu:24.04@sha256:<digest>
# and record the digest in docs/architecture.md. The runner also records the
# image ID used for every execution.
FROM ubuntu:24.04

ARG GCC_MAJOR=13

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc-${GCC_MAJOR} g++-${GCC_MAJOR} libc6-dev \
      # The "Sandbox Formatters" extension formats C, C++, Java and C# with it.
      clang-format \
 && rm -rf /var/lib/apt/lists/* \
 && ln -s /usr/bin/gcc-${GCC_MAJOR} /usr/local/bin/gcc \
 && ln -s /usr/bin/g++-${GCC_MAJOR} /usr/local/bin/g++ \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "GCC", "version": "%s", "languages": ["c", "cpp"]}\n' \
      "$(gcc -dumpfullversion)" > /etc/compiler-copilot/toolchain.json \
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
CMD ["gcc", "--version"]
