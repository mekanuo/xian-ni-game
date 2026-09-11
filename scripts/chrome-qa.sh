#!/bin/sh
# Deterministic CPU graphics for this headless QA host only. Never shipped.
# https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/docs/gpu/swiftshader.md
exec /usr/bin/google-chrome --use-gl=angle --use-angle=swiftshader "$@"
