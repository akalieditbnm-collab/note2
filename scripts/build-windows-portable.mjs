#!/usr/bin/env node
/**
 * Builds the Windows release binary and assembles a *portable* folder:
 *
 *   dist-portable/LocalNote-portable/
 *     LocalNote.exe
 *     WebView2Loader.dll        (when present in the build output)
 *     README.txt
 *   dist-portable/LocalNote-<version>-windows-x64-portable.zip
 *
 * Portable means: no installer, no registry writes, no admin rights. Settings
 * still live in %LOCALAPPDATA%\LocalNote (SQLite), so the app behaves exactly
 * like the installed build once you launch the .exe.
 *
 * Usage (any host, including Linux via cargo-xwin):
 *   node scripts/build-windows-portable.mjs [--target x86_64-pc-windows-msvc]
 */
import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const root = path.resolve(import.meta.dirname, "..");
const target = process.argv.includes("--target")
  ? process.argv[process.argv.indexOf("--target") + 1]
  : "x86_64-pc-windows-msvc";
const cargoRunner = process.env.CARGO_XWIN === "1" ? ["xwin"] : [];

const outDir = path.join(root, "dist-portable");
const appDir = path.join(outDir, `LocalNote-${version}-windows-x64-portable`);
const targetDir = path.join(root, "src-tauri", "target", target, "release");

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, { stdio: "inherit", cwd: root, ...options });
}

async function copyIfExists(from, to) {
  try {
    await fs.copyFile(from, to);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.rm(appDir, { recursive: true, force: true });
  await fs.mkdir(appDir, { recursive: true });

  // 1. Frontend (Vite → dist/)
  run("npm", ["run", "build"]);

  // 2. Rust binary (Tauri bundler reuses the compiled exe)
  run("cargo", [...cargoRunner, "build", "--release", "--target", target], {
    cwd: path.join(root, "src-tauri"),
  });

  // 3. Portable payload
  const exe = path.join(targetDir, "LocalNote.exe");
  await fs.access(exe);
  await fs.copyFile(exe, path.join(appDir, "LocalNote.exe"));

  for (const dll of ["WebView2Loader.dll", "ffmpeg.dll"]) {
    await copyIfExists(path.join(targetDir, dll), path.join(appDir, dll));
  }

  const sizeMb = (await fs.stat(path.join(appDir, "LocalNote.exe"))).size / 1024 / 1024;
  await fs.writeFile(
    path.join(appDir, "README.txt"),
    [
      `LocalNote ${version} — portable Windows build`,
      "",
      "1. Keep LocalNote.exe anywhere you like (USB stick, Desktop, a tools folder).",
      "2. Double-click it. No installation, no admin rights, no registry entries.",
      "3. Notes and settings are stored in:",
      "     %LOCALAPPDATA%\\LocalNote\\Data\\localnote.db",
      "   Delete that folder to start completely fresh.",
      "",
      "Requirement: Microsoft Edge WebView2 Runtime (preinstalled on Windows 10/11).",
      "If the window stays blank, install it from:",
      "     https://developer.microsoft.com/microsoft-edge/webview2/",
      "",
      `Built: ${new Date().toISOString()}`,
      "License: PolyForm Noncommercial 1.0.0",
      "",
    ].join("\r\n"),
    "utf8",
  );

  // 4. Zip
  const zipPath = path.join(outDir, `LocalNote-${version}-windows-x64-portable.zip`);
  await fs.rm(zipPath, { force: true });
  run("zip", ["-r", "-9", path.basename(zipPath), path.basename(appDir)], { cwd: outDir });

  console.log(
    `\nPortable build ready: ${path.relative(root, zipPath)} ` +
      `(LocalNote.exe ${sizeMb.toFixed(1)} MB)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
