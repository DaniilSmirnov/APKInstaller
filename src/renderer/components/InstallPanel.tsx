import React, { useState } from 'react';
import type { DeviceInfo } from '../types';

interface InstallPanelProps { apkPath: string | null; devices: DeviceInfo[]; packages: string[]; }
const InstallPanel = ({ apkPath, devices, packages }: InstallPanelProps): JSX.Element => {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string>('');
  const packageName = packages[0];
  const install = async (device: DeviceInfo): Promise<void> => { if (!apkPath || !packageName || device.status !== 'device') return; setBusy((state) => ({ ...state, [device.serial]: true })); setMessage('Installing…'); try { await window.electron.devices.install(device.serial, apkPath, packageName); setMessage('Installed'); } catch (error) { setMessage(error instanceof Error ? error.message : (error as { message?: string }).message ?? 'Install failed'); } finally { setBusy((state) => ({ ...state, [device.serial]: false })); } };
  return <section><div role="status">{message}</div><button type="button" aria-label="Install on all" disabled={!apkPath || !packageName} onClick={() => void Promise.all(devices.filter((device) => device.status === 'device').map(install))}>Install on all</button>{devices.map((device) => <button type="button" key={device.serial} aria-label={`Install on ${device.serial}`} disabled={device.status !== 'device' || !apkPath || !packageName || busy[device.serial]} onClick={() => void install(device)}>{busy[device.serial] ? 'Installing…' : 'Install'}</button>)}</section>;
};
export default InstallPanel;
