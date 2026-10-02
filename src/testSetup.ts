import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'node:util';

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  setImmediate: (callback: () => void) => setTimeout(callback, 0),
});

Object.defineProperty(window, 'electron', {
  configurable: true,
  writable: true,
  value: {
    app: {
      getDroppedApkPath: (file: File & { path?: string }): string => file.path ?? '',
      selectApk: jest.fn(),
    },
    devices: {
      list: jest.fn().mockResolvedValue([]),
      startTracking: jest.fn().mockResolvedValue(undefined),
      stopTracking: jest.fn().mockResolvedValue(undefined),
      install: jest.fn().mockResolvedValue({ success: true }),
      uninstall: jest.fn().mockResolvedValue({ success: true }),
      getPackageInfo: jest.fn().mockResolvedValue(null),
      onChange: jest.fn().mockReturnValue(() => undefined),
    },
  },
});
