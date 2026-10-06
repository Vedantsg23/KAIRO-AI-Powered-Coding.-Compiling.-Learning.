# Sandbox image for interpreted languages from the Ubuntu 24.04 archive:
#   R 4.3, Perl 5.38, Prolog (SWI-Prolog 9), Tcl 8.6, Scheme (GNU Guile 3.0),
#   Common Lisp (SBCL 2.2), Erlang (OTP 25) and Elixir 1.14.
#
# Same rules as the other sandbox images: student programs run in throw-away
# containers made from this image, with the limits set by the runner
# (read-only root filesystem, no network, all capabilities dropped, non-root
# user, memory/CPU/PID/time caps). Each language profile runs only its own
# interpreter.
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain versions with every execution.
FROM ubuntu:24.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      r-base-core perl swi-prolog-nox tcl guile-3.0 sbcl erlang-base elixir \
 && rm -rf /var/lib/apt/lists/* \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "Extra", "version": "R %s, perl %s, swipl %s, tcl %s, guile %s, sbcl %s, erlang %s, elixir %s", "languages": ["r", "perl", "prolog", "tcl", "scheme", "lisp", "erlang", "elixir"]}\n' \
      "$(Rscript --version 2>&1 | awk '{print $4}')" "$(perl -e 'print $^V')" "$(swipl --version | awk '{print $3}')" \
      "$(echo 'puts [info patchlevel]' | tclsh)" "$(guile --version | head -n1 | awk '{print $NF}')" \
      "$(sbcl --version | awk '{print $2}')" "$(erl -noshell -eval 'io:format("~s", [erlang:system_info(otp_release)]), halt().')" \
      "$(elixir --version 2>/dev/null | tail -n1 | awk '{print $2}')" \
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

# The R profile's syntax check runs this fixed script on main.R (no inline code).
COPY check.R /usr/local/lib/kairo/check.R

ENV LANG=C.UTF-8 \
    HOME=/tmp \
    TMPDIR=/tmp \
    R_ENVIRON_USER=/dev/null \
    R_PROFILE_USER=/dev/null

USER 10001:10001
WORKDIR /workspace
CMD ["cat", "/etc/compiler-copilot/toolchain.json"]
