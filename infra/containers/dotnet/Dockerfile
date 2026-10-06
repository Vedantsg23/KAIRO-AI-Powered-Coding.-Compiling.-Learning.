# Sandbox image for C# (.NET 8 SDK from the Ubuntu 24.04 archive).
#
# Same rules as the other sandbox images: student programs are compiled and
# run in throw-away containers made from this image, with the limits set by
# the runner (read-only root filesystem, no network, all capabilities dropped,
# non-root user, memory/CPU/PID/time caps).
#
# A single main.cs is compiled with the Roslyn compiler (csc) directly, not
# with `dotnet build`: no project file, no MSBuild and no NuGet restore (so no
# network is ever needed). The references are the .NET 8 reference assemblies
# listed in /opt/code-drishti/csharp/refs.rsp, and the program is started
# with `dotnet exec --runtimeconfig .../app.runtimeconfig.json main.dll`.
#
# W^X double mapping is off (DOTNET_EnableWriteXorExecute=0): it backs JIT
# code with a large memory file, which the sandbox's file-size limit refuses.
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact toolchain version with every execution.
FROM ubuntu:24.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends dotnet-sdk-8.0 \
 && rm -rf /var/lib/apt/lists/* \
 && dotnet_root=/usr/lib/dotnet \
 && sdk="$(ls -d $dotnet_root/sdk/8.0.* | sort -V | tail -n1)" \
 && refs="$(ls -d $dotnet_root/packs/Microsoft.NETCore.App.Ref/8.0.*/ref/net8.0 | sort -V | tail -n1)" \
 && runtime="$(ls -d $dotnet_root/shared/Microsoft.NETCore.App/8.0.* | sort -V | tail -n1)" \
 && mkdir -p /opt/code-drishti/csharp \
 && ln -s "$sdk/Roslyn/bincore/csc.dll" /opt/code-drishti/csharp/csc.dll \
 && for dll in "$refs"/*.dll; do echo "-reference:$dll"; done > /opt/code-drishti/csharp/refs.rsp \
 && printf '{"runtimeOptions": {"tfm": "net8.0", "framework": {"name": "Microsoft.NETCore.App", "version": "%s"}}}\n' \
      "$(basename "$runtime")" > /opt/code-drishti/csharp/app.runtimeconfig.json \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": ".NET", "version": "%s", "languages": ["csharp"]}\n' \
      "$(basename "$sdk")" > /etc/compiler-copilot/toolchain.json \
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
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_EnableWriteXorExecute=0

USER 10001:10001
WORKDIR /workspace
CMD ["dotnet", "--info"]
