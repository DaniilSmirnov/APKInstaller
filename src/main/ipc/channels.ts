export const IPC_CHANNELS = {
  appGetVersion: 'app:get-version',
  dialogOpenApk: 'dialog:open-apk',
  devicesList: 'devices:list',
  devicesStartTracking: 'devices:start-tracking',
  devicesStopTracking: 'devices:stop-tracking',
  deviceChange: 'devices:change',
  deviceInstall: 'device:install',
  deviceUninstall: 'device:uninstall',
  packageInfo: 'package:info',
} as const;

export const ALLOWED_IPC_CHANNELS = Object.values(IPC_CHANNELS);
