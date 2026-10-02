# APKInstaller

APKInstaller is a cross-platform Electron desktop application for installing and managing Android APKs through a local ADB server.

## Requirements

- Node.js 20+ and npm
- Android SDK Platform Tools (`adb`) on `PATH`
- USB debugging enabled on a physical device, or an available emulator

The application connects to ADB at `127.0.0.1:5037`. Offline and unauthorized devices remain visible but actions are disabled until the device becomes ready.

## Development and packaging

```bash
npm ci
npm start
npm test -- --runInBand
npm run lint
npm run typecheck
npm run build
npm run package
```

Packaged artifacts are written to `release/build`. The local `npm run package` command uses the targets configured in `package.json` for the current host. To build one explicit target locally, run:

```bash
npm run build
npx electron-builder --publish never --mac dmg --x64
npx electron-builder --publish never --mac dmg --arm64
npx electron-builder --publish never --linux AppImage deb --x64
npx electron-builder --publish never --win nsis --x64
```

Cross-platform release builds run in GitHub Actions from `.github/workflows/package.yml`:

| Runner | Architecture | Outputs |
| --- | --- | --- |
| macOS | x64 | DMG |
| macOS | arm64 | DMG |
| Ubuntu | x64 | AppImage, DEB |
| Windows | x64 | NSIS installer |

Each uploaded artifact includes the product version, platform, architecture and commit SHA. Code signing is optional: configure `CSC_LINK` and `CSC_KEY_PASSWORD` for macOS/Windows signing, and `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` for macOS notarization. Without these secrets, the workflow produces unsigned packages. TeamCity is not part of this repository.

## Features

- live ADB device discovery and typed main/preload/renderer IPC;
- APK picker and drag-and-drop through the secure preload bridge;
- install, uninstall and package version lookup;
- persistent package settings through `electron-store`;
- legacy `settings.db` import with a one-time `.bak` backup and no automatic deletion;
- single-device selection by serial, with readiness revalidation in the main process;
- Android permission, density and display-size controls with validation and reset actions.

Display changes can make a device difficult to use. Confirm changes before applying them and use the reset actions to restore the device defaults.

## Architecture

```text
React renderer -> typed preload API -> Electron main process -> ADB/Android services
```

The renderer does not access Node.js, filesystem, child processes, adbkit, or arbitrary shell commands. IPC exposes only fixed typed operations and sanitized error payloads.

## Migration

The legacy Python/PyQt implementation, shell launch scripts, icons and old database file are retained temporarily for compatibility and migration verification. They are not used by the Electron entrypoint and will be removed only in the final cleanup change after feature parity is confirmed.

For troubleshooting, run `adb devices`, accept the USB debugging prompt on the device, and restart the local ADB server if necessary with `adb kill-server` followed by `adb start-server`.

## Platform support

Electron Builder targets macOS (DMG), Windows (NSIS), and Linux (AppImage). iOS is not supported yet; its implementation is planned separately around go-ios or another non-IDB backend.
