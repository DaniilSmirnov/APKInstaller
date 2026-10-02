import React, { useState } from 'react';
import type { DeviceInfo } from '../types';
interface InstallDialogProps { device: DeviceInfo; apkPath: string; packageName: string; onClose: () => void; }
const InstallDialog = ({ device, apkPath, packageName, onClose }: InstallDialogProps): JSX.Element => { const [error, setError] = useState<string | null>(null); const confirm = async (): Promise<void> => { try { await window.electron.devices.install(device.serial, apkPath, packageName); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : (cause as { message?: string }).message ?? 'Install failed'); } }; return <div role="dialog"><button type="button" onClick={() => void confirm()}>Confirm install</button>{error && <p role="alert">{error}</p>}</div>; };
export default InstallDialog;
