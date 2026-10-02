import React from 'react';
import DeviceCard from './DeviceCard';
import type { DeviceInfo, OperationMessage, PackageInfo } from '../types';

interface DeviceListProps {
  devices?: DeviceInfo[];
  packageName?: string | null;
  packageInfo?: Record<string, PackageInfo | null>;
  packageLoading?: Record<string, boolean>;
  busy?: Record<string, boolean>;
  messages?: Record<string, OperationMessage | undefined>;
  apkSelected?: boolean;
  onInstall?: (serial: string) => void;
  onUninstall?: (serial: string) => void;
}

const DeviceList = ({ devices = [], packageName = null, packageInfo = {}, packageLoading = {}, busy = {}, messages = {}, apkSelected = false, onInstall = () => undefined, onUninstall = () => undefined }: DeviceListProps): JSX.Element => (
  devices.length === 0 ? (
    <section className="empty-state" aria-label="ADB devices">
      <h2>Connect an Android device</h2>
      <p>Подключите устройство с включённой USB-отладкой — оно появится здесь автоматически.</p>
    </section>
  ) : (
    <section className="device-list" aria-label="Подключённые устройства">
      {devices.map((device) => (
        <DeviceCard
          key={device.serial}
          device={device}
          packageName={packageName}
          packageInfo={packageInfo[device.serial] ?? null}
          packageLoading={packageLoading[device.serial] === true}
          busy={busy[device.serial] === true}
          message={messages[device.serial]}
          apkSelected={apkSelected}
          onInstall={() => onInstall(device.serial)}
          onUninstall={() => onUninstall(device.serial)}
        />
      ))}
    </section>
  )
);

export default DeviceList;
