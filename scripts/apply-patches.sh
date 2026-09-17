#!/bin/bash
set -e
# apply-patches.sh — pre-build patches
#
# Usage:
#   ./apply-patches.sh            # all platforms (default)
#   ./apply-patches.sh mobile     # all + mobile (iOS + Android)
#   ./apply-patches.sh android    # all + mobile + android

PLATFORM="${1:-all}"

source "$(dirname "$0")/patch-lib.sh"

# ── All platforms ─────────────────────────────────────────────────────────────

# Offline client modifications
apply_patch "offline-banner.js"       all
apply_patch "update-title-labels.js"  all
apply_patch "community-menu.js"       all
apply_patch "manage-data-delete.js"   all

# ── Mobile (iOS + Android) ────────────────────────────────────────────────────
if [[ "$PLATFORM" == "mobile" || "$PLATFORM" == "android" ]]; then

  # Targeted Patches
  apply_patch "android-import-fix.js"        mobile
  apply_patch "export-fix.js"                mobile
  apply_patch "background-audio-pause.js"    mobile
fi

# ── Android only ──────────────────────────────────────────────────────────────
if [[ "$PLATFORM" == "android" ]]; then

  apply_patch "fix-android-image-paths.js"  android

fi

echo "All patches applied successfully (platform: $PLATFORM)."
