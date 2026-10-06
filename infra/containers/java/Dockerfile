# Sandbox image for Java (OpenJDK 21, from the Ubuntu 24.04 archive).
#
# Same rules as the GCC image: student programs are compiled and run in
# throw-away containers made from this image, with the limits set by the
# runner (read-only root filesystem, no network, all capabilities dropped,
# non-root user, memory/CPU/PID/time caps). JVM flags live in the language
# profile (services/api/app/adapters/profiles/java.toml), not here.
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact javac version with every execution.
FROM ubuntu:24.04

ARG JDK_MAJOR=21

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-${JDK_MAJOR}-jdk-headless \
 && rm -rf /var/lib/apt/lists/* \
 # Class-data sharing archive: shortens every JVM start (javac and java).
 && java -Xshare:dump > /dev/null \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "OpenJDK", "version": "%s", "languages": ["java"]}\n' \
      "$(javac -version 2>&1 | sed 's/^javac //')" > /etc/compiler-copilot/toolchain.json \
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
CMD ["javac", "-version"]
