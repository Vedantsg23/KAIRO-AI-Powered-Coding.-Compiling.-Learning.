# Sandbox image for JavaScript (Node.js from the Ubuntu 24.04 archive) and
# TypeScript (Microsoft's official TypeScript 7 native compiler from npm).
#
# Same rules as the other sandbox images: student programs run in throw-away
# containers made from this image, with the limits set by the runner
# (read-only root filesystem, no network, all capabilities dropped, non-root
# user, memory/CPU/PID/time caps). Only Node's built-in modules are available:
# there is no npm and no network at run time.
#
# The TypeScript compiler and the Node.js type definitions (@types/node, so
# TypeScript programs can use `fs`, `process` and `readline`) are downloaded
# from the npm registry and verified against the SHA-512 values the registry
# publishes (the same values as their "integrity" fields).
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain versions with every execution.
FROM ubuntu:24.04

ARG TS_VERSION=7.0.2
ARG TS_SHA512_AMD64=11875fd9c360eeb8025899f109d27e177577f4ef2285bdfb78702ed4b2bca00162ce04d06cf38aef31c75db3edf2b5f6e023aa3835de237b087f47c25c6ec7fc
ARG TS_SHA512_ARM64=421e1e538ff2df20e39df8e3c8f62284c8f9fce0c8966b7e073bb5ece23e7e24910d6e7b4265394a237addec4f44d24f294cdc73520d6b535776b27e32a1e351
ARG TYPES_NODE_VERSION=18.19.130
ARG TYPES_NODE_SHA512=191697431ea319f2fcb0a7da2030fa3aea5b20706bf63bfb2676a697db41ee5e2fd3af0f00e5ea7dcba330ca393e16c8b3a8204755ce0c42ea6a14f647cbf47e
ARG UNDICI_TYPES_VERSION=5.26.5
ARG UNDICI_TYPES_SHA512=26508c3be7a174420aaa517193a21f568014566833edc53bcc3fe1f57674ab37a8b121e650954ecd242fbd84985979055c2f887cb29221f7e1bf4b1566ea7aa4

RUN apt-get update \
 && apt-get install -y --no-install-recommends nodejs curl ca-certificates \
 && case "$(dpkg --print-architecture)" in \
      amd64) ts_pkg=linux-x64; ts_sha="$TS_SHA512_AMD64" ;; \
      arm64) ts_pkg=linux-arm64; ts_sha="$TS_SHA512_ARM64" ;; \
      *) echo "unsupported architecture" >&2; exit 1 ;; \
    esac \
 && curl -fsSL -o /tmp/ts.tgz \
      "https://registry.npmjs.org/@typescript/typescript-${ts_pkg}/-/typescript-${ts_pkg}-${TS_VERSION}.tgz" \
 && echo "${ts_sha}  /tmp/ts.tgz" | sha512sum -c - \
 && mkdir -p /opt/typescript \
 && tar -xzf /tmp/ts.tgz -C /opt/typescript --strip-components=1 \
 && rm /tmp/ts.tgz \
 && ln -s /opt/typescript/lib/tsc /usr/local/bin/tsc \
 && curl -fsSL -o /tmp/types-node.tgz \
      "https://registry.npmjs.org/@types/node/-/node-${TYPES_NODE_VERSION}.tgz" \
 && echo "${TYPES_NODE_SHA512}  /tmp/types-node.tgz" | sha512sum -c - \
 && curl -fsSL -o /tmp/undici-types.tgz \
      "https://registry.npmjs.org/undici-types/-/undici-types-${UNDICI_TYPES_VERSION}.tgz" \
 && echo "${UNDICI_TYPES_SHA512}  /tmp/undici-types.tgz" | sha512sum -c - \
 && mkdir -p /opt/typescript-types/node_modules/@types/node /opt/typescript-types/node_modules/undici-types \
 && tar -xzf /tmp/types-node.tgz -C /opt/typescript-types/node_modules/@types/node --strip-components=1 \
 && tar -xzf /tmp/undici-types.tgz -C /opt/typescript-types/node_modules/undici-types --strip-components=1 \
 && rm /tmp/types-node.tgz /tmp/undici-types.tgz \
 && apt-get purge -y curl \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "Node.js", "version": "node %s, tsc %s", "languages": ["javascript", "typescript"]}\n' \
      "$(node --version | sed 's/^v//')" "$(tsc --version | sed 's/^Version //')" \
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
    HOME=/tmp

USER 10001:10001
WORKDIR /workspace
CMD ["node", "--version"]
