# Sandbox image for scripting languages: PHP 8.3, Ruby 3.2, Lua 5.4,
# Bash 5.2 and SQLite 3.45 (from the Ubuntu 24.04 archive).
#
# Same rules as the other sandbox images: student programs run in throw-away
# containers made from this image, with the limits set by the runner
# (read-only root filesystem, no network, all capabilities dropped, non-root
# user, memory/CPU/PID/time caps). One image for several small interpreters; each language
# profile runs only its own interpreter.
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain version with every execution.
FROM ubuntu:24.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends php8.3-cli ruby3.2 lua5.4 sqlite3 \
      # The "Sandbox Formatters" extension formats Bash with it.
      shfmt \
 && rm -rf /var/lib/apt/lists/* \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "Scripting", "version": "php %s, ruby %s, lua %s, bash %s, sqlite %s", "languages": ["php", "ruby", "lua", "bash", "sql"]}\n' \
      "$(php -r 'echo PHP_VERSION;')" "$(ruby -e 'print RUBY_VERSION')" \
      "$(lua5.4 -v 2>&1 | cut -d' ' -f2)" "$(bash -c 'echo ${BASH_VERSION%%(*}')" \
      "$(sqlite3 --version | cut -d' ' -f1)" > /etc/compiler-copilot/toolchain.json \
 # Defence in depth: no setuid/setgid binaries inside the sandbox.
 && find / -xdev -perm /6000 -type f -exec chmod a-s {} + \
 # Unprivileged sandbox user; UID/GID must match SANDBOX_UID in the runner.
 && groupadd --gid 10001 sandbox \
 && useradd --uid 10001 --gid 10001 --home-dir /tmp --no-create-home \
      --shell /usr/sbin/nologin sandbox \
 && mkdir -p /workspace \
 && chown 10001:10001 /workspace \
 && chmod 0755 /workspace

# Loaded by the Ruby profile before main.rb: unbuffered standard output, so
# text printed before an error or a time limit is not lost.
RUN mkdir -p /opt/code-drishti/ruby \
 && printf '$stdout.sync = true\n$stderr.sync = true\n' > /opt/code-drishti/ruby/sync.rb

ENV LANG=C.UTF-8 \
    HOME=/tmp

USER 10001:10001
WORKDIR /workspace
CMD ["bash", "--version"]
