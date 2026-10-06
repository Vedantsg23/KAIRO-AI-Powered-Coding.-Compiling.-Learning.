#!/bin/sh
# Pre-compile Go's standard library into /opt/go-std (image build time only).
#
# `go build` keeps compiled packages in a build cache. Every sandbox starts
# empty, so `go build` would recompile fmt, os, runtime... on every run (about
# 15 s). Instead the image carries the compiled standard library, and the Go
# profile compiles and links the student's main.go directly with the Go
# toolchain's `compile` and `link` tools and an import configuration that
# points at these archives (the same mechanism the go command uses internally).
set -eu
out=/opt/go-std
mkdir -p "$out/pkg" "$out/bin"
export GOCACHE=/tmp/go-std-cache CGO_ENABLED=0 GOFLAGS=-trimpath
go list -export -deps -f '{{if .Export}}{{.ImportPath}} {{.Export}}{{end}}' std > /tmp/std-export.txt
: > "$out/importcfg"
while read -r path file; do
  dest="$out/pkg/$path.a"
  mkdir -p "$(dirname "$dest")"
  cp "$file" "$dest"
  echo "packagefile $path=$dest" >> "$out/importcfg"
done < /tmp/std-export.txt
tooldir="$(go env GOTOOLDIR)"
ln -s "$tooldir/compile" "$out/bin/compile"
ln -s "$tooldir/link" "$out/bin/link"
rm -rf /tmp/go-std-cache /tmp/std-export.txt
echo "go-std: $(wc -l < "$out/importcfg") packages, $(du -sh "$out/pkg" | cut -f1)"
