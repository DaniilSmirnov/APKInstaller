# DeviceManager UI artifact

`APKInstaller` remains the source repository for the shared React UI. The UI is
published as a separate, versioned directory artifact and is not copied into
`adb-ios`, vendored as a submodule, or bundled into the Swift package source.

Build it with:

```sh
npm ci
npm run build:device-manager-ui
```

The artifact root is `dist/DeviceManagerUI` and must contain:

- `index.html`
- `device-manager.js`
- `device-manager.js.map` (when source maps are enabled)

An iOS application consumes the artifact by placing that directory in its
application resources as `DeviceManagerUI/`. `DeviceManagerWebViewController`
loads `DeviceManagerUI/index.html` and exposes the JSON bridge named
`deviceManager`.

The bridge protocol is request/response JSON. Request payloads are base64
encoded UTF-8 JSON because Swift `Codable` encodes `Data` that way. The UI
resolves responses through `window.__deviceManagerResolve(message)`.
