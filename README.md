# Offline Client — PokéRogue Build Template

A fully offline, installable wrapper for [PokéRogue](https://pokerogue.net) and PokéRogue-derived forks — buildable for iOS, Android, Windows, macOS, and Linux from a single GitHub Actions pipeline.

This repo isn't a finished app — it's a **template**. It contains no game code of its own; every build clones a source repo (yours, or upstream PokéRogue) fresh, applies a small set of patches on top, and packages the result for each platform. Fork it, set a handful of repository variables, and you have your own offline client tracking whatever source repo you point it at.

> **A note on scope:** "generic" here means the *source repo* and *branding* are configurable — it does not mean this works unmodified for any arbitrary game. The patches in `patches/` target specific files and code shapes in PokéRogue's actual source (`menu-ui-handler.ts`, `title-ui-handler.ts`, `game-data.ts`, etc.), so this is built for PokéRogue and close PokéRogue forks, not an engine-agnostic wrapper.

> This README was drafted with AI assistance (Claude, Anthropic) based on the actual repo contents and workflow behavior at the time of writing. It has not been independently proofread end-to-end — if something here doesn't match what a workflow actually does, the workflow is the source of truth.

---

## Features

- Fully offline — no internet required after install, beyond the one-time download
- Local saves that persist between sessions
- Import a save from your source repo's hosted instance (e.g. [pokerogue.net](https://pokerogue.net)), or export one back out
- A **Delete Data** option under Pause → Manage Data, for a clean local wipe
- Build number shown in the title-screen banner, for support/bug-report purposes
- Pulls the source repo fresh on every build and applies a small, targeted patch set on top — no manually-maintained fork to keep in sync

---

## For players: installing a build

Go to this repo's [Releases](../../releases) page and grab the file for your platform from the latest release. Exact filenames depend on how the person running this fork named their build (see `APP_FILENAME` below) — look for the platform in the name (`...-iOS`, `...-Android`, `...-Windows`, `...-macOS`, `...-AppImage`).

### iOS

**Option 1: LiveContainer + SideStore (recommended — unlimited apps)**

LiveContainer runs IPAs inside a container without using up your sideloading slots.

1. Install **iLoader** on your PC/Mac from [GitHub](https://github.com/nab138/iloader)
2. Connect your iPhone via USB and open iLoader
3. Sign in with your Apple ID
4. Select **LiveContainer + SideStore** and install it
5. Open LiveContainer on your device and complete setup (import the certificate from SideStore)
6. Download the `.ipa` to your iPhone (via Safari or Files)
7. Open LiveContainer, tap **+** in the top right, and select the IPA
8. Tap the app to launch it

LiveContainer signs the app with your SideStore certificate automatically — no manual signing needed.

**Option 2: SideStore (without LiveContainer)**

SideStore sideloads up to 3 apps and refreshes them wirelessly without a PC after initial setup.

1. Install SideStore using iLoader or AltServer
2. Open SideStore, tap **+** in My Apps, and select the `.ipa`
3. Apps must be refreshed every 7 days (can be automated with a Shortcuts automation)

**Option 3: Feather / Sideloadly**

If you already use one of these, sign and install the IPA as you normally would.

### Android

- Enable "Install from Unknown Sources" in Settings
- Download and install the `.apk`
- The APK is debug-signed — you may need to explicitly allow the install

### Windows

- Run the `.exe` directly — no installation required
- **Requires WebView2**, which ships with Windows 11 and installs automatically on Windows 10 via Windows Update. If launch fails, grab it from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Linux

- Make the file executable: `chmod +x <file>.AppImage`
- Run it: `./<file>.AppImage`
- **Requires WebKitGTK.** Most modern desktop distros (Ubuntu 24.04+, Fedora 40+, etc.) include this already. If launch fails:
  - Ubuntu/Debian: `sudo apt install libwebkit2gtk-4.1`
  - Fedora: `sudo dnf install webkitgtk6.0`
  - Arch: `sudo pacman -S webkit2gtk-4.1`

### Importing a save

1. On [pokerogue.net](https://pokerogue.net) (or wherever your source repo is hosted), log in and go to **Pause → Manage Data → Export Save**
2. Open the offline client and go to **Pause → Manage Data → Import Save**
3. Select the exported file

---

## For forkers: setting up your own build

Everything below happens in your fork's **Settings → Secrets and variables → Actions**.

### Repository variables (Settings → Actions → Variables)

| Variable | Example | Used for |
|---|---|---|
| `PKR_SRC_REPO` | `https://github.com/pagefaultgames/pokerogue` | The source repo cloned and patched on every build. No trailing slash or `.git` — both get stripped automatically if you include them anyway. |
| `PKG_NAME` | `xyz.example.pkr` | Reverse-DNS package/bundle ID for iOS, Android, and desktop builds. Dev builds get `dev` appended automatically. |
| `APP_FILENAME` | `MyPokeGameOffline` | No spaces — used for every output artifact and file name across all platforms (`.ipa`, `.apk`, `.exe`, `.AppImage`, `.dmg`) and in the release notes. |
| `APP_DISPLAY_NAME` | `My PokéGame Offline` | Can have spaces — the name shown on-device (home screen / dock), plus the release title and package metadata. |
| `BUILD_NAME` | `Unofficial Offline Client` | Shown in the title-screen version banner, followed by the build number. |

No secrets to set up. `GITHUB_TOKEN` is provided automatically by Actions. Android signing uses a debug keystore that's generated automatically the first time any Android build runs on your fork, then committed back to `configs/android/debug.keystore` and reused by every build after — signing has to stay consistent across builds, or Android refuses to install an update over the app you already have installed. Nothing to do here manually; the first Android build (or the first `create-release.yaml` run) handles it.

### App icon

Every platform's icon is derived from one master image at build time — see `scripts/generate-icons.sh` for the full breakdown. In short:

- Put a square icon (1024×1024 recommended) at **`docs/appIcon-master.png`**. That's the only file required.
- Optionally add `docs/appIcon-master-dev.png` if you want dev builds to carry a visually distinct icon (iOS/Android only — desktop builds don't have a dev icon variant).
- If the automatic derivation doesn't look right for a specific target — the Android adaptive-icon foreground especially, since it's a generic "shrink and center" approximation — drop a hand-made replacement in `docs/icon-overrides/`:
  - `legacy.png` — overrides the derived main icon (used everywhere: iOS, Android legacy, Windows, macOS, AppImage)
  - `legacy-dev.png` — overrides the dev variant
  - `adaptive-foreground.png` — overrides just the Android adaptive foreground layer

Generated icons aren't committed — they're produced fresh on every build and are gitignored. Only the master and any overrides should be checked in.

### Running a build

- **A full release**: run **Create Release** (`create-release.yaml`) from the Actions tab. It fans out to all five platform builds, waits for them, and — if run from `main` with `dev` left unchecked — publishes a single GitHub Release with every platform's output attached. With `dev` checked (or run from a branch other than `main`), it still builds everything but only attaches the outputs as workflow artifacts, without publishing a release.
- **A single platform**: run any of `build-ios.yml`, `build-android.yml`, `build-macos.yml`, `build-exe.yml`, or `build-appimage.yml` directly. Useful for testing one platform without triggering the other four.

All of these accept a `branch` input (which branch of `PKR_SRC_REPO` to build from — defaults to `main`) and a `dev` toggle (dev builds get a distinct package ID, `-dev` file naming, and a `DEV` marker appended to the build number).

### How the patch system works

Nothing in this repo modifies the source game directly — `PKR_SRC_REPO` is cloned fresh into `pokerogue-src/` on every run, and `scripts/apply-patches.sh <category>` runs each patch script against that clone. Patches live under `patches/`:

- `patches/all/` — applied on every platform (title-screen banner, community menu, the Manage Data "Delete Data" option, etc.)
- `patches/mobile/` — iOS + Android only (WebView/Capacitor fixes: save export/import, canvas scaling, background audio, notch handling, external links)
- `patches/android/` — Android only (manifest keyboard fix, broken image paths)

`scripts/apply-post-build-patches.sh` runs a second, smaller pass after the Vite build completes, for patches that need to touch built output rather than source.

Most patches are small Node scripts that do a literal string-anchor find-and-replace against a specific upstream file — see any file under `patches/` for the pattern, including how they fail loudly (rather than silently no-op) if upstream changes enough that the anchor text no longer matches.

---

## Notes

- Personal/non-commercial use — this is an unofficial fan project and isn't affiliated with the PokéRogue team
- Saves are stored locally on-device and aren't synced to any server by this client
- There's currently no `LICENSE` file in this repo — if you're publishing your own fork for others to use or build on, you may want to add one
