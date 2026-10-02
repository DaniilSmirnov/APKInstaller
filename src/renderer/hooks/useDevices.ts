import { useEffect, useState } from 'react';
import type { DeviceChange, DeviceInfo } from '../types';

interface DevicesError { code?: string; message: string; }

export const useDevices = (): { devices: DeviceInfo[]; loading: boolean; error: DevicesError | null } => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DevicesError | null>(null);
  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try { const snapshot = await window.electron.devices.list(); if (active) { setDevices(snapshot); setError(null); } }
      catch (cause) { if (active) setError(typeof cause === 'object' && cause !== null && 'message' in cause ? cause as DevicesError : { message: 'ADB unavailable' }); }
      finally { if (active) setLoading(false); }
      try { await window.electron.devices.startTracking(); } catch (cause) { if (active && !error) setError(typeof cause === 'object' && cause !== null && 'message' in cause ? cause as DevicesError : { message: 'ADB unavailable' }); }
    };
    void load();
    const unsubscribe = window.electron.devices.onChange((change: DeviceChange) => {
      if (!active) return;
      setDevices((current) => {
        if (change.type === 'removed') return current.filter((device) => device.serial !== change.device.serial);
        const index = current.findIndex((device) => device.serial === change.device.serial);
        return index < 0 ? [...current, change.device] : current.map((device, position) => position === index ? change.device : device);
      });
    });
    return () => { active = false; unsubscribe(); void window.electron.devices.stopTracking(); };
  }, []);
  return { devices, loading, error };
};
