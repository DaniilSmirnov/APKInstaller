import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApkDropZone from './components/ApkDropZone';
import DeviceList from './components/DeviceList';
import PackageSelector from './components/PackageSelector';
import type { DeviceChange, DeviceInfo, OperationMessage, PackageInfo } from './types';

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Операция не выполнена';

const App = (): JSX.Element => {
  const [apkPath, setApkPath] = useState<string | null>(null);
  const [packageInput, setPackageInput] = useState('');
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [packageInfo, setPackageInfo] = useState<Record<string, PackageInfo | null>>({});
  const [packageLoading, setPackageLoading] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, OperationMessage | undefined>>({});
  const [globalMessage, setGlobalMessage] = useState<OperationMessage | null>(null);
  const packageNames = useMemo(() => packageInput.split(',').map((value) => value.trim()).filter(Boolean), [packageInput]);
  const selectedPackage = packageNames[0] ?? null;

  const refreshPackageInfo = useCallback(async (nextDevices: DeviceInfo[], packageName: string | null): Promise<void> => {
    if (!packageName) { setPackageInfo({}); return; }
    const available = nextDevices.filter((device) => device.status === 'device');
    setPackageLoading(Object.fromEntries(available.map((device) => [device.serial, true])));
    const entries = await Promise.all(available.map(async (device) => {
      try { return [device.serial, await window.electron.devices.getPackageInfo(device.serial, packageName)] as const; }
      catch { return [device.serial, null] as const; }
    }));
    setPackageInfo(Object.fromEntries(entries));
    setPackageLoading({});
  }, []);

  const applyDevices = useCallback((nextDevices: DeviceInfo[]): void => {
    setDevices(nextDevices);
    void refreshPackageInfo(nextDevices, selectedPackage);
  }, [refreshPackageInfo, selectedPackage]);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const initial = await window.electron.devices.list();
        if (active) applyDevices(initial);
        await window.electron.devices.startTracking();
      } catch (error) { if (active) setGlobalMessage({ tone: 'error', text: errorMessage(error) }); }
    };
    void load();
    const unsubscribe = window.electron.devices.onChange((change: DeviceChange) => {
      setDevices((current) => {
        const index = current.findIndex((device) => device.serial === change.device.serial);
        if (change.type === 'removed') return current.filter((device) => device.serial !== change.device.serial);
        if (index === -1) return [...current, change.device];
        return current.map((device, currentIndex) => currentIndex === index ? change.device : device);
      });
      if (change.type === 'removed') setPackageInfo((current) => Object.fromEntries(Object.entries(current).filter(([serial]) => serial !== change.device.serial)));
      else if (change.device.status === 'device') void refreshPackageInfo([change.device], selectedPackage);
    });
    return () => { active = false; unsubscribe(); void window.electron.devices.stopTracking(); };
  }, [applyDevices, refreshPackageInfo, selectedPackage]);

  useEffect(() => { void refreshPackageInfo(devices, selectedPackage); }, [devices, refreshPackageInfo, selectedPackage]);

  const chooseApk = async (): Promise<void> => {
    try {
      const selected = await window.electron.app.selectApk();
      if (selected) { setApkPath(selected); setGlobalMessage({ tone: 'success', text: 'APK-файл выбран' }); }
    } catch (error) { setGlobalMessage({ tone: 'error', text: errorMessage(error) }); }
  };
  const setOperationMessage = (serial: string, message: OperationMessage): void => setMessages((current) => ({ ...current, [serial]: message }));
  const install = async (serial: string): Promise<void> => {
    if (!apkPath) return;
    setBusy((current) => ({ ...current, [serial]: true })); setOperationMessage(serial, { tone: 'info', text: 'Установка APK…' });
    try { await window.electron.devices.install(serial, apkPath, selectedPackage ?? undefined); setOperationMessage(serial, { tone: 'success', text: 'APK успешно установлен' }); void refreshPackageInfo(devices, selectedPackage); }
    catch (error) { setOperationMessage(serial, { tone: 'error', text: errorMessage(error) }); }
    finally { setBusy((current) => ({ ...current, [serial]: false })); }
  };
  const uninstall = async (serial: string): Promise<void> => {
    if (!selectedPackage) return;
    setBusy((current) => ({ ...current, [serial]: true })); setOperationMessage(serial, { tone: 'info', text: 'Удаление приложения…' });
    try { await window.electron.devices.uninstall(serial, selectedPackage); setPackageInfo((current) => ({ ...current, [serial]: null })); setOperationMessage(serial, { tone: 'success', text: 'Приложение удалено' }); }
    catch (error) { setOperationMessage(serial, { tone: 'error', text: errorMessage(error) }); }
    finally { setBusy((current) => ({ ...current, [serial]: false })); }
  };
  const installAll = async (): Promise<void> => { await Promise.all(devices.filter((device) => device.status === 'device' && !busy[device.serial]).map((device) => install(device.serial))); };

  return (
    <main className="app-shell">
      <header className="app-header"><div><p className="eyebrow">ANDROID TOOLING</p><h1>APKInstaller</h1></div><span className="status-chip">{devices.length} устройств</span></header>
      <section className="control-panel" aria-label="Установка приложения">
        <ApkDropZone apkPath={apkPath} onSelect={() => void chooseApk()} onDrop={setApkPath} />
        <PackageSelector value={packageInput} onChange={(value) => setPackageInput(typeof value === 'string' ? value : value.join(', '))} />
        <button type="button" className="install-all-button" onClick={() => void installAll()} disabled={!apkPath || devices.every((device) => device.status !== 'device')}>Установить на все</button>
      </section>
      {globalMessage && <p className={`global-message global-message--${globalMessage.tone}`} role="alert">{globalMessage.text}</p>}
      <DeviceList devices={devices} packageName={selectedPackage} packageInfo={packageInfo} packageLoading={packageLoading} busy={busy} messages={messages} apkSelected={Boolean(apkPath)} onInstall={(serial) => void install(serial)} onUninstall={(serial) => void uninstall(serial)} />
    </main>
  );
};

export default App;
