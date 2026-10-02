# APKInstaller

APKInstaller is being migrated from the legacy Python/PyQt application to a cross-platform Electron desktop application.

## Current foundation

This branch introduces the Electron foundation:

- React renderer and TypeScript main/preload processes;
- isolated, allowlisted preload API;
- secure BrowserWindow defaults;
- Webpack and Electron Builder configuration for macOS, Windows, and Linux;
- Jest smoke and contract tests;
- the original Python implementation remains in the repository temporarily and is not used by the Electron entrypoint.

The main process now owns the ADB client, device tracker, device metadata, APK install/uninstall operations, and typed IPC boundary. The React renderer only receives serializable device DTOs and error payloads through the preload API.

ADB must be installed and available on `PATH`. The application connects to the local ADB server on `127.0.0.1:5037`; missing or unavailable ADB is reported as a typed backend error. Devices in `offline`, `unauthorized`, or unknown states remain visible but are not treated as ready for operations.

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm start
```

Run checks:

```bash
npm test
npm run lint
npm run build
npm run package
```

Packaged artifacts are written to `release/build`.

## Architecture

```
React renderer
    -> typed preload API
    -> Electron main process
    -> ADB services in the main process
```

The renderer has no direct access to Node.js, filesystem, child-process, or ADB APIs.

## Migration notes

Legacy `install.sh`, `launch.sh`, Python/PyQt code, and the existing settings storage are retained for the later cleanup and migration MRs. The Electron foundation does not require Python, PyQt, pip, SQLite, or TeamCity.

TeamCity configuration was not present in the repository, so no TeamCity replacement CI was added in this MR.
