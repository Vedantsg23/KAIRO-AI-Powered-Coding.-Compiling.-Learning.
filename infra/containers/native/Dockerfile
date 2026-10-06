# Sandbox image for compiled languages from the Ubuntu 24.04 archive:
#   Fortran (gfortran 13), x86-64 Assembly (NASM 2.16 + GNU ld), Pascal (Free
#   Pascal 3.2), COBOL (GnuCOBOL 3.1), Lex (flex 2.6 + GCC 13), Verilog
#   (Icarus Verilog 12), Nim (1.6), D (GDC 13) and Ada (GNAT 13).
#
# Same rules as the other sandbox images: student programs are compiled and
# run in throw-away containers made from this image, with the limits set by
# the runner (read-only root filesystem, no network, all capabilities dropped,
# non-root user, memory/CPU/PID/time caps). Each language profile runs only
# its own compiler.
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain versions with every execution.
FROM ubuntu:24.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc-13 libc6-dev gfortran-13 nasm binutils fp-compiler gnucobol3 flex libfl-dev iverilog nim gdc-13 gnat-13 \
 && rm -rf /var/lib/apt/lists/* \
 && ln -sf /usr/bin/gcc-13 /usr/local/bin/gcc \
 && ln -sf /usr/bin/gcc-13 /usr/local/bin/cc \
 && ln -sf /usr/bin/gfortran-13 /usr/local/bin/gfortran \
 && ln -sf /usr/bin/gdc-13 /usr/local/bin/gdc \
 && for t in gnatmake gnatbind gnatlink gnatls; do [ -e /usr/bin/$t-13 ] && ln -sf /usr/bin/$t-13 /usr/local/bin/$t || true; done \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "Native", "version": "gfortran %s, nasm %s, fpc %s, cobc %s, flex %s, iverilog %s, nim %s, gdc %s, gnat %s", "languages": ["fortran", "asm", "pascal", "cobol", "lex", "verilog", "nim", "d", "ada"]}\n' \
      "$(gfortran -dumpfullversion)" "$(nasm -v | cut -d' ' -f3)" "$(fpc -iV)" \
      "$(cobc --version | head -n1 | awk '{print $NF}')" "$(flex --version | cut -d' ' -f2)" \
      "$(iverilog -V 2>&1 | head -n1 | awk '{print $4}')" "$(nim --version | head -n1 | awk '{print $4}')" \
      "$(gdc -dumpfullversion)" "$(gnatls -v 2>/dev/null | sed -n 's/^GNATLS \([0-9.]*\).*/\1/p' | head -n1)" \
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
    TMPDIR=/tmp

USER 10001:10001
WORKDIR /workspace
CMD ["cat", "/etc/compiler-copilot/toolchain.json"]
