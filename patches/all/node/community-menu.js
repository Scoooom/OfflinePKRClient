#!/usr/bin/env node
/**
 * Patch: community-menu.js
 *
 * Adjusts the pause menu's "Community" submenu (src/ui/handlers/menu-ui-handler.ts)
 * for this fork:
 *   - REMOVED "Admin" — real-account admin tooling (ban/unban, link Discord,
 *     etc. against the pokerogue API) has no meaning for an offline client.
 *   - REMOVED "Donate" — points at pagefaultgames' own GitHub Sponsors page,
 *     not relevant to this fork.
 *   - ADDED "App GitHub" — opens whichever repo is actually running this
 *     build, resolved from the GITHUB_REPOSITORY env var GitHub Actions
 *     sets automatically on every job (owner/repo). Placed right after the
 *     existing upstream "GitHub" entry so the two repo links sit together.
 *
 * Wiki/Discord/GitHub/Reddit and the Cancel entry are untouched.
 *
 * Targets: pokerogue-src/src/ui/handlers/menu-ui-handler.ts
 */

const fs = require("fs");
const path = require("path");

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Could not find ${filePath}`);
    console.error("Make sure this script is run from the repo root and all submodules are initialised.");
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`  Written: ${filePath}`);
}

function requireAnchor(src, anchor, label) {
  if (!src.includes(anchor)) {
    console.error(`ERROR: Could not find anchor for "${label}".`);
    console.error("The upstream file may have changed. Manual inspection required.");
    process.exit(1);
  }
}

const TARGET = path.join("pokerogue-src", "src", "ui", "handlers", "menu-ui-handler.ts");

let src = readFile(TARGET);

if (src.includes("appGithubUrl")) {
  console.log("Community menu already patched, skipping.");
  process.exit(0);
}

// ── Sub-patch 1: drop the now-unused AdminMode import ──────────────────────

const ADMIN_IMPORT_ANCHOR = `import { AdminMode, getAdminModeName } from "#enums/admin-mode";\n`;
requireAnchor(src, ADMIN_IMPORT_ANCHOR, "AdminMode import in menu-ui-handler.ts");
src = src.replace(ADMIN_IMPORT_ANCHOR, "");

// ── Sub-patch 2: URL constants — self-reference githubUrl + appGithubUrl, drop donateUrl ──

// GITHUB_REPOSITORY ("owner/repo") is set automatically by GitHub Actions on
// every job — no workflow changes or extra variable needed for this to
// self-reference whichever repo/fork is actually running the build.
const APP_GITHUB_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : (() => {
      console.warn(
        "WARNING: GITHUB_REPOSITORY is not set (not running under GitHub Actions?). " +
          "The 'App GitHub' community menu link will be left blank.",
      );
      return "";
    })();

// PKR_SRC_REPO is this pipeline's own repo variable (set on the "Apply
// patches" workflow step) pointing at whatever game source is being built —
// no longer necessarily pagefaultgames/pokerogue. Falls back to upstream if
// unset so this patch still runs standalone/locally.
const SRC_GITHUB_URL = process.env.PKR_SRC_REPO || "https://github.com/pagefaultgames/pokerogue";

const GITHUB_URL_ANCHOR = `const githubUrl = "https://github.com/pagefaultgames/pokerogue";\n`;
requireAnchor(src, GITHUB_URL_ANCHOR, "githubUrl constant in menu-ui-handler.ts");
src = src.replace(
  GITHUB_URL_ANCHOR,
  `const githubUrl = "${SRC_GITHUB_URL}";\nconst appGithubUrl = "${APP_GITHUB_URL}";\n`,
);

const DONATE_URL_ANCHOR = `const donateUrl = "https://github.com/sponsors/pagefaultgames";\n`;
requireAnchor(src, DONATE_URL_ANCHOR, "donateUrl constant in menu-ui-handler.ts");
src = src.replace(DONATE_URL_ANCHOR, "");

// ── Sub-patch 3: communityOptions — insert "App GitHub" after "GitHub" ─────

const GITHUB_ENTRY_ANCHOR = `      {
        label: "GitHub",
        handler: () => {
          window.open(githubUrl, "_blank")?.focus();
          return true;
        },
        keepOpen: true,
      },`;
requireAnchor(src, GITHUB_ENTRY_ANCHOR, "GitHub entry in communityOptions");
src = src.replace(
  GITHUB_ENTRY_ANCHOR,
  `${GITHUB_ENTRY_ANCHOR}
      {
        label: "App GitHub",
        handler: () => {
          window.open(appGithubUrl, "_blank")?.focus();
          return true;
        },
        keepOpen: true,
      },`,
);

// ── Sub-patch 4: communityOptions — remove "Donate" entry ──────────────────

const DONATE_ENTRY_ANCHOR = `
      {
        label: i18next.t("menuUiHandler:donate"),
        handler: () => {
          window.open(donateUrl, "_blank")?.focus();
          return true;
        },
        keepOpen: true,
      },`;
requireAnchor(src, DONATE_ENTRY_ANCHOR, "Donate entry in communityOptions");
src = src.replace(DONATE_ENTRY_ANCHOR, "");

// ── Sub-patch 5: remove the whole conditional "Admin" push block ──────────

const ADMIN_BLOCK_ANCHOR = `    if (bypassLogin || loggedInUser?.hasAdminRole) {
      communityOptions.push({
        label: "Admin",
        handler: () => {
          const skippedAdminModes: AdminMode[] = [AdminMode.ADMIN]; // this is here so that we can skip the menu populating enums that aren't meant for the menu, such as the AdminMode.ADMIN
          const options: OptionSelectItem[] = [];
          Object.values(AdminMode)
            .filter(v => !Number.isNaN(Number(v)) && !skippedAdminModes.includes(v as AdminMode))
            .forEach(mode => {
              // this gets all the enums in a way we can use
              options.push({
                label: getAdminModeName(mode as AdminMode),
                handler: () => {
                  ui.playSelect();
                  ui.setOverlayMode(
                    UiMode.ADMIN,
                    {
                      buttonActions: [
                        // we double revert here and below to go back 2 layers of menus
                        () => {
                          ui.revertMode();
                          ui.revertMode();
                        },
                        () => {
                          ui.revertMode();
                          ui.revertMode();
                        },
                      ],
                    },
                    mode,
                  ); // mode is our AdminMode enum
                  return true;
                },
              });
            });
          options.push({
            label: "Cancel",
            handler: () => {
              ui.revertMode();
              return true;
            },
          });
          globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, {
            options,
            delay: 0,
          });
          return true;
        },
        keepOpen: true,
      });
    }
`;
requireAnchor(src, ADMIN_BLOCK_ANCHOR, "conditional Admin push block in menu-ui-handler.ts");
src = src.replace(ADMIN_BLOCK_ANCHOR, "");

writeFile(TARGET, src);
console.log("Community menu patch applied successfully.");
