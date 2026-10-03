import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApkDropZone from './components/ApkDropZone';
import DeviceList from './components/DeviceList';
import PackageSelector from './components/PackageSelector';
import SettingsPanel from './components/SettingsPanel';
import type { DeviceChange, DeviceInfo, OperationMessage, PackageInfo } from './types';
import type { DeviceManagerApkFile, DeviceManagerDevice } from '../device-manager/contract';
import { createDeviceManagerRuntime, type DeviceManagerRuntime } from '../device-manager/runtime';

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Операция не выполнена';

const App = (): JSX.Element => {
  const runtime = useMemo<DeviceManagerRuntime>(() => createDeviceManagerRuntime(), []);
  const [apk, setApk] = useState<DeviceManagerApkFile | null>(null);
  const [packageInput, setPackageInput] = useState('');
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [packageInfo, setPackageInfo] = useState<Record<string, PackageInfo | null>>({});
  const [packageLoading, setPackageLoading] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, OperationMessage | undefined>>({});
  const [globalMessage, setGlobalMessage] = useState<OperationMessage | null>(null);
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const packageNames = useMemo(() => packageInput.split(',').map((value) => value.trim()).filter(Boolean), [packageInput]);
  const selectedPackage = packageNames[0] ?? null;
  const saveSettings = async (): Promise<void> => { try { await window.electron.settings.set({ packages: packageNames, selectedPackage: selectedPackage ?? undefined }); setGlobalMessage({ tone: 'success', text: 'Настройки сохранены' }); } catch { setGlobalMessage({ tone: 'error', text: 'Настройки не сохранены' }); } };

  const toDeviceInfo = (device: DeviceManagerDevice): DeviceInfo => ({
    serial: device.serial,
    status: device.status,
    rawStatus: device.status,
    manufacturer: device.manufacturer,
    model: device.model,
    androidVersion: device.androidVersion,
    sdkVersion: device.sdkVersion,
  });
  const fromPath = (path: string): DeviceManagerApkFile => ({ id: path, name: path.split(/[\\/]/).pop() ?? 'app.apk', size: 0, nativeToken: path });

  const refreshPackageInfo = useCallback(async (nextDevices: DeviceInfo[], packageName: string | null): Promise<void> => {
    if (!packageName) { setPackageInfo({}); return; }
    const available = nextDevices.filter((device) => device.status === 'device');
    setPackageLoading(Object.fromEntries(available.map((device) => [device.serial, true])));
    const entries = await Promise.all(available.map(async (device) => {
      try { return [device.serial, await runtime.getPackageInfo(device.serial, packageName)] as const; }
      catch { return [device.serial, null] as const; }
    }));
    setPackageInfo(Object.fromEntries(entries));
    setPackageLoading({});
  }, [runtime]);

  const applyDevices = useCallback((nextDevices: DeviceInfo[]): void => {
    setDevices(nextDevices);
    setSelectedSerial((current) => current && nextDevices.some((device) => device.serial === current && (device.status === 'device' || device.status === 'emulator')) ? current : (nextDevices.filter((device) => device.status === 'device' || device.status === 'emulator').length === 1 ? nextDevices.find((device) => device.status === 'device' || device.status === 'emulator')?.serial ?? null : null));
    void refreshPackageInfo(nextDevices, selectedPackage);
  }, [refreshPackageInfo, selectedPackage]);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const initial = await runtime.listDevices();
        if (active) applyDevices(initial.map(toDeviceInfo));
      } catch (error) { if (active) setGlobalMessage({ tone: 'error', text: errorMessage(error) }); }
    };
    void load();
    const unsubscribe = runtime.onDeviceChange((change) => {
      const normalized: DeviceChange = { type: change.type, device: toDeviceInfo(change.device) };
      setDevices((current) => {
        const index = current.findIndex((device) => device.serial === normalized.device.serial);
        if (normalized.type === 'removed') return current.filter((device) => device.serial !== normalized.device.serial);
        if (index === -1) return [...current, normalized.device];
        return current.map((device, currentIndex) => currentIndex === index ? normalized.device : device);
      });
      if (normalized.type === 'removed' || (normalized.device.status !== 'device' && normalized.device.status !== 'emulator')) setSelectedSerial((current) => current === normalized.device.serial ? null : current);
      if (normalized.type === 'removed') setPackageInfo((current) => Object.fromEntries(Object.entries(current).filter(([serial]) => serial !== normalized.device.serial)));
      else if (normalized.device.status === 'device') void refreshPackageInfo([normalized.device], selectedPackage);
    });
    return () => { active = false; unsubscribe(); };
  }, [applyDevices, refreshPackageInfo, runtime, selectedPackage]);

  useEffect(() => { void refreshPackageInfo(devices, selectedPackage); }, [devices, refreshPackageInfo, selectedPackage]);

  const chooseApk = async (): Promise<void> => {
    try {
      const selected = await runtime.selectApk();
      if (selected) { setApk(selected); setGlobalMessage({ tone: 'success', text: 'APK-файл выбран' }); }
    } catch (error) { setGlobalMessage({ tone: 'error', text: errorMessage(error) }); }
  };
  const setOperationMessage = (serial: string, message: OperationMessage): void => setMessages((current) => ({ ...current, [serial]: message }));
  const install = async (serial: string): Promise<void> => {
    if (selectedSerial !== serial) return;
    if (!apk) return;
    setBusy((current) => ({ ...current, [serial]: true })); setOperationMessage(serial, { tone: 'info', text: 'Установка APK…' });
    try { await runtime.install(serial, apk); setOperationMessage(serial, { tone: 'success', text: 'APK успешно установлен' }); void refreshPackageInfo(devices, selectedPackage); }
    catch (error) { setOperationMessage(serial, { tone: 'error', text: errorMessage(error) }); }
    finally { setBusy((current) => ({ ...current, [serial]: false })); }
  };
  const uninstall = async (serial: string): Promise<void> => {
    if (selectedSerial !== serial) return;
    if (!selectedPackage) return;
    setBusy((current) => ({ ...current, [serial]: true })); setOperationMessage(serial, { tone: 'info', text: 'Удаление приложения…' });
    try { await runtime.uninstall(serial, selectedPackage); setPackageInfo((current) => ({ ...current, [serial]: null })); setOperationMessage(serial, { tone: 'success', text: 'Приложение удалено' }); }
    catch (error) { setOperationMessage(serial, { tone: 'error', text: errorMessage(error) }); }
    finally { setBusy((current) => ({ ...current, [serial]: false })); }
  };
  const installAll = async (): Promise<void> => { await Promise.all(devices.filter((device) => device.status === 'device' && !busy[device.serial]).map((device) => install(device.serial))); };

  return (
    <main className="app-shell">
      <header className="app-header"><div><p className="eyebrow">ANDROID TOOLING</p><h1>DeviceManager</h1></div><span className="status-chip">{devices.length} устройств</span></header>
      <section className="control-panel" aria-label="Установка приложения">
        <ApkDropZone apkPath={apk?.name ?? null} onSelect={() => void chooseApk()} resolveFile={(file) => runtime.resolveDroppedApk(file)?.nativeToken ?? null} onDrop={(path) => setApk(fromPath(path))} />
        <PackageSelector value={packageInput} onChange={(value) => setPackageInput(typeof value === 'string' ? value : value.join(', '))} />
        <SettingsPanel value={packageInput} onChange={setPackageInput} onSave={() => void saveSettings()} />
        <button type="button" className="install-all-button" onClick={() => void installAll()} disabled={!apk || devices.every((device) => device.status !== 'device')}>Установить на все</button>
      </section>
      {globalMessage && <p className={`global-message global-message--${globalMessage.tone}`} role="alert">{globalMessage.text}</p>}
      <DeviceList devices={devices} packageName={selectedPackage} packageInfo={packageInfo} packageLoading={packageLoading} busy={busy} messages={messages} apkSelected={Boolean(apk)} selectedSerial={selectedSerial} onSelect={setSelectedSerial} onInstall={(serial) => void install(serial)} onUninstall={(serial) => void uninstall(serial)} />
    </main>
  );
};

export default App;
