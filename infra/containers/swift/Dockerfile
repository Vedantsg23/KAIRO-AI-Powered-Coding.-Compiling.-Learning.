# Sandbox image for Swift (EXPERIMENTAL).
#
# Status: prepared but NOT verified. The development environment could not
# reach Docker Hub or swift.org, so this image has never been built or run
# there. The language stays hidden until an administrator builds the image
# (docker compose --profile swift build, or the "swift" CI job), adds it to
# RUNNER_ALLOWED_IMAGES and the Swift integration tests pass. See
# docs/languages.md.
#
# Base: the Docker Official Image for Swift, maintained by the Swift project,
# on Ubuntu 24.04 like the other sandbox images. For a deployment, pin it by
# digest (FROM swift:6.1-noble@sha256:<digest>).
#
# Same rules as the other sandbox images: student programs run in throw-away
# containers made from this image, with the limits set by the runner
# (read-only root filesystem, no network, all capabilities dropped, non-root
# user, memory/CPU/PID/time caps). One main.swift is compiled with swiftc
# (no Swift Package Manager, no packages, no network).
FROM swift:6.1-noble

RUN mkdir -p /etc/compiler-copilot \
 # Toolchain metadata read by the runner and stored with every execution.
 && printf '{"name": "Swift", "version": "%s", "languages": ["swift"]}\n' \
      "$(swiftc --version 2>&1 | sed -n 's/.*Swift version \([^ ]*\).*/\1/p' | head -n 1)" \
      > /etc/compiler-copilot/toolchain.json \
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
    # Swift's crash backtracer starts a helper process that inspects the
    # crashed program; inside the sandbox the plain runtime message is enough.
    SWIFT_BACKTRACE=enable=no

USER 10001:10001
WORKDIR /workspace
CMD ["swiftc", "--version"]
