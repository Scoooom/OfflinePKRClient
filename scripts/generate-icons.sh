#!/bin/bash
set -e
# generate-icons.sh — derives every platform's source app icon from a single
# master icon, so forking this client only requires supplying one image.
#
# Reads (all under docs/):
#   appIcon-master.png       (required) — square, 1024x1024 recommended.
#                              Keep the artwork away from the very edges —
#                              it gets scaled down and re-padded differently
#                              per target below.
#   appIcon-master-dev.png   (optional) — used for the dev-build icon
#                              variant instead of deriving one from the main
#                              master. If absent, dev builds just reuse the
#                              prod icon — they're still distinguishable via
#                              bundle id and the banner text, this only
#                              affects the icon itself.
#
# Per-target overrides (docs/icon-overrides/) — drop a file here to use it
# verbatim instead of having this script derive it from the master. Useful
# when the generic transform below doesn't look right for your art (the
# adaptive foreground especially — a plain center-and-shrink often isn't
# what you actually want):
#   legacy.png              -> appIcon.png          (iOS / Android legacy /
#                                                      Windows / macOS /
#                                                      AppImage source)
#   legacy-dev.png          -> appIcon-dev.png       (iOS / Android dev icon)
#   adaptive-foreground.png -> appIcon-adaptive.png  (Android adaptive icon
#                                                      foreground layer)
#
# Writes (consumed by the existing per-platform steps in each build
# workflow — none of those needed to change):
#   docs/appIcon.png          — square, 1024x1024, flattened onto a solid
#                                background (no alpha). Used directly for
#                                iOS's AppIcon-512@2x.png, and as the source
#                                for Android's legacy launcher pngs, the
#                                Windows .ico, macOS .icns, and the AppImage
#                                icon.
#   docs/appIcon-dev.png      — same, for dev builds (iOS/Android only —
#                                desktop builds don't have a dev icon
#                                variant today).
#   docs/appIcon-adaptive.png — Android adaptive icon foreground layer:
#                                master content scaled to ~66% and centered
#                                on a transparent canvas, approximating
#                                Android's recommended adaptive-icon safe
#                                zone. Generic and often not quite right —
#                                override it if the result looks off.
#
# These three outputs are regenerated fresh every CI run and are gitignored
# — the master and any overrides are what should be committed.

DOCS_DIR="${DOCS_DIR:-docs}"
OVERRIDES_DIR="$DOCS_DIR/icon-overrides"
MASTER="$DOCS_DIR/appIcon-master.png"
MASTER_DEV="$DOCS_DIR/appIcon-master-dev.png"

if command -v magick >/dev/null 2>&1; then
  IM="magick"
elif command -v convert >/dev/null 2>&1; then
  IM="convert"
else
  echo "ERROR: ImageMagick (magick/convert) not found on PATH." >&2
  exit 1
fi

if [ ! -f "$MASTER" ]; then
  echo "ERROR: $MASTER not found." >&2
  echo "Forking this client requires one master icon at $MASTER (square, 1024x1024+ recommended)." >&2
  exit 1
fi

# ── Legacy square icon (prod) ───────────────────────────────────────────────
if [ -f "$OVERRIDES_DIR/legacy.png" ]; then
  echo "generate-icons: using override for appIcon.png"
  cp "$OVERRIDES_DIR/legacy.png" "$DOCS_DIR/appIcon.png"
else
  "$IM" "$MASTER" -resize 1024x1024^ -gravity center -extent 1024x1024 \
    -background black -alpha remove -alpha off \
    "$DOCS_DIR/appIcon.png"
fi

# ── Legacy square icon (dev) ─────────────────────────────────────────────────
if [ -f "$OVERRIDES_DIR/legacy-dev.png" ]; then
  echo "generate-icons: using override for appIcon-dev.png"
  cp "$OVERRIDES_DIR/legacy-dev.png" "$DOCS_DIR/appIcon-dev.png"
elif [ -f "$MASTER_DEV" ]; then
  "$IM" "$MASTER_DEV" -resize 1024x1024^ -gravity center -extent 1024x1024 \
    -background black -alpha remove -alpha off \
    "$DOCS_DIR/appIcon-dev.png"
else
  cp "$DOCS_DIR/appIcon.png" "$DOCS_DIR/appIcon-dev.png"
fi

# ── Android adaptive icon foreground layer ──────────────────────────────────
if [ -f "$OVERRIDES_DIR/adaptive-foreground.png" ]; then
  echo "generate-icons: using override for appIcon-adaptive.png"
  cp "$OVERRIDES_DIR/adaptive-foreground.png" "$DOCS_DIR/appIcon-adaptive.png"
else
  "$IM" "$MASTER" -resize 66% -gravity center -background none -extent 1024x1024 \
    "$DOCS_DIR/appIcon-adaptive.png"
fi

echo "generate-icons: wrote appIcon.png, appIcon-dev.png, appIcon-adaptive.png to $DOCS_DIR/"
