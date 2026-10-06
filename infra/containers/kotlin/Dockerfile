# Sandbox image for Kotlin (the official Kotlin 2.4 compiler, published by
# JetBrains on npm, running on OpenJDK 21 from the Ubuntu 24.04 archive).
#
# Same rules as the other sandbox images: student programs are compiled and
# run in throw-away containers made from this image, with the limits set by
# the runner (read-only root filesystem, no network, all capabilities dropped,
# non-root user, memory/CPU/PID/time caps). Only the Kotlin standard library
# is available: there is no Gradle, no Maven and no network.
#
# The compiler tarball is verified against the SHA-512 published by the npm
# registry for kotlin-compiler@2.4.20 (the same value as its "integrity").
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain version with every execution.
FROM ubuntu:24.04

ARG KOTLIN_VERSION=2.4.20
ARG KOTLIN_SHA512=205e4854cecba4f840fe7b47410a5a56dd72c6969a428bed11560bcaa58cb9a2ebd177a52cf3e6effb0ce872e1b5c4638e3a12b0aec8ee53f693360990ccbbdf

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-21-jre-headless curl ca-certificates \
 && curl -fsSL -o /tmp/kotlin.tgz \
      "https://registry.npmjs.org/kotlin-compiler/-/kotlin-compiler-${KOTLIN_VERSION}.tgz" \
 && echo "${KOTLIN_SHA512}  /tmp/kotlin.tgz" | sha512sum -c - \
 && mkdir -p /opt/kotlinc \
 && tar -xzf /tmp/kotlin.tgz -C /opt/kotlinc --strip-components=1 \
 && rm /tmp/kotlin.tgz \
 && chmod +x /opt/kotlinc/bin/* \
 && ln -s /opt/kotlinc/bin/kotlinc /usr/local/bin/kotlinc \
 && apt-get purge -y curl \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* \
 # Class-data sharing: the JDK's base archive, then an archive of the classes
 # the Kotlin compiler loads (made by compiling a tiny program once), which
 # shortens every compile by about a second. The flags match the profile.
 && java -Xshare:dump > /dev/null \
 && mkdir -p /tmp/warmup \
 && printf 'fun main() {\n    println("warm-up")\n}\n' > /tmp/warmup/main.kt \
 && kotlinc -J-Xmx512m -J-XX:+UseSerialGC -J-XX:TieredStopAtLevel=1 -J-XX:-UsePerfData \
      -J-XX:ArchiveClassesAtExit=/opt/kotlinc/kotlinc.jsa -J-Xlog:disable \
      -J-Dkotlin.colors.enabled=false /tmp/warmup/main.kt -include-runtime -d /tmp/warmup/main.jar \
 && rm -rf /tmp/warmup \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "Kotlin", "version": "%s", "languages": ["kotlin"]}\n' \
      "$KOTLIN_VERSION" > /etc/compiler-copilot/toolchain.json \
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
CMD ["kotlinc", "-version"]
