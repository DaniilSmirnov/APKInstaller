import type { DeviceInfo } from '../renderer/types';

export const deviceFixtures: Record<'device' | 'offline' | 'unauthorized', DeviceInfo> & {
  unknown: DeviceInfo & { status: 'unknown' };
} = {
  device: {
    serial: 'emulator-5554',
    status: 'device',
    rawStatus: 'device',
    manufacturer: 'Google',
    model: 'Pixel 7',
    androidVersion: '14',
    sdkVersion: 34,
  },
  offline: {
    serial: 'R58M1234',
    status: 'offline',
    rawStatus: 'offline',
    manufacturer: null,
    model: null,
    androidVersion: null,
    sdkVersion: null,
  },
  unauthorized: {
    serial: 'ZX1G22',
    status: 'unauthorized',
    rawStatus: 'unauthorized',
    manufacturer: null,
    model: null,
    androidVersion: null,
    sdkVersion: null,
  },
  unknown: {
    serial: 'unknown-device',
    status: 'unknown',
    rawStatus: 'unknown',
    manufacturer: null,
    model: null,
    androidVersion: null,
    sdkVersion: null,
  } as DeviceInfo & { status: 'unknown' },
};

export const createElectronMock = () => ({
  app: { getVersion: jest.fn().mockResolvedValue('1.0.0') },
  devices: {
    list: jest.fn().mockResolvedValue([]),
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    getPackageInfo: jest.fn().mockResolvedValue(null),
    onChange: jest.fn().mockReturnValue(jest.fn()),
  },
});

export type ElectronMock = ReturnType<typeof createElectronMock>;
