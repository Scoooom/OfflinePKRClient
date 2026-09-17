#!/usr/bin/env node
/**
 * Patch: manage-data-delete.js
 *
 * Adds a "Delete Data" option to the pause menu's "Manage Data" submenu
 * (src/ui/handlers/menu-ui-handler.ts), for this offline client only.
 *
 * Upstream already ships a "Clear Local Data" option here, but it's gated
 * behind `!bypassLogin` (it's login-account cleanup) and its handler,
 * globalScene.gameData.clearLocalData(), early-returns a no-op whenever
 * bypassLogin is true — which this app always sets via VITE_BYPASS_LOGIN=1.
 * So upstream's own data-wipe option is silently unavailable in this build.
 *
 * This adds a separate entry, gated on `isApp` (true only in the
 * Capacitor/Electron build), that clears everything in localStorage
 * (save data, settings, any cached data) and reloads — the same
 * confirm-then-wipe UX pattern as upstream's own "Clear Local Data" option,
 * just pointed at a wipe that actually works when bypassLogin is true.
 *
 * Targets: pokerogue-src/src/ui/handlers/menu-ui-handler.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "ui", "handlers", "menu-ui-handler.ts");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");

if (src.includes("manage-data-delete")) {
  console.log("Delete Data option already present, skipping.");
  process.exit(0);
}

// ── Insert "Delete Data" right before the Manage Data "Cancel" entry ───────

const CANCEL_BLOCK = `    manageDataOptions.push({
      label: i18next.t("menuUiHandler:cancel"),
      handler: () => {
        globalScene.ui.revertMode();
        return true;
      },
      keepOpen: true,
    });

    this.manageDataConfig = {`;

if (!src.includes(CANCEL_BLOCK)) {
  console.error("ERROR: Could not find the Manage Data cancel entry in menu-ui-handler.ts.");
  console.error("The upstream file may have changed. Manual inspection required.");
  process.exit(1);
}

const DELETE_ENTRY = `    if (isApp) {
      // manage-data-delete: upstream's "Clear Local Data" option above is
      // gated behind !bypassLogin and no-ops when bypassLogin is true, which
      // this app always sets. This is the offline equivalent.
      manageDataOptions.push({
        label: "Delete Data",
        handler: () => {
          ui.revertMode();
          ui.showText(
            "This will ERASE ALL local data — save, settings, everything — and cannot be undone. Continue?",
            null,
            () => {
              const config: ConfirmModeConfig = {
                yesHandler: () => {
                  localStorage.clear();
                  window.location.reload();
                },
                noHandler: () => {
                  globalScene.ui.revertMode();
                  globalScene.ui.showText("", 0);
                },
              };
              ui.setOverlayMode(UiMode.CONFIRM, config);
            },
          );
          return true;
        },
        keepOpen: true,
      });
    }

`;

src = src.replace(CANCEL_BLOCK, DELETE_ENTRY + CANCEL_BLOCK);

fs.writeFileSync(TARGET, src, "utf8");
console.log(`Added Delete Data option to ${TARGET}`);
console.log("manage-data-delete applied successfully.");
