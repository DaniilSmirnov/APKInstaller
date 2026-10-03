import React, { useEffect, useMemo, useState } from 'react';
import type { DeviceManagerApkFile, DeviceManagerDevice } from '../device-manager/contract';
import { createDeviceManagerRuntime, type DeviceManagerRuntime } from '../device-manager/runtime';
import './style.css';

const DeviceManagerApp = (): JSX.Element => {
  const runtime = useMemo<DeviceManagerRuntime>(() => createDeviceManagerRuntime(), []);
  const [devices, setDevices] = useState<DeviceManagerDevice[]>([]);
  const [apk, setApk] = useState<DeviceManagerApkFile | null>(null);
  const [packageName, setPackageName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void runtime.listDevices().then((next) => { if (active) { setDevices(next); const first = next[0]; if (first) setSelected(first.id); } }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : 'Не удалось найти устройства'); });
    const unsubscribe = runtime.onDeviceChange((change) => {
      setDevices((current) => change.type === 'removed' ? current.filter((device) => device.id !== change.device.id) : [...current.filter((device) => device.id !== change.device.id), change.device]);
    });
    return () => { active = false; unsubscribe(); };
  }, [runtime]);

  const ready = devices.filter((device) => device.status === 'device' || device.status === 'emulator');
  const install = async (): Promise<void> => {
    if (!selected || !apk) return;
    setBusy(selected); setMessage('Установка APK…');
    try { await runtime.install(selected, apk); setMessage('APK успешно установлен'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Установка не выполнена'); }
    finally { setBusy(null); }
  };
  const uninstall = async (): Promise<void> => {
    if (!selected || !packageName) return;
    setBusy(selected); setMessage('Удаление приложения…');
    try { await runtime.uninstall(selected, packageName); setMessage('Приложение удалено'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Удаление не выполнено'); }
    finally { setBusy(null); }
  };

  return <main className="dm-app">
    <header><div><p className="dm-eyebrow">ANDROID TOOLING</p><h1>DeviceManager</h1></div><span className="dm-chip">{devices.length} устройств</span></header>
    <section className="dm-panel" aria-label="Операции с APK">
      <button type="button" onClick={() => void runtime.selectApk().then(setApk).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Файл не выбран'))}>{apk ? `APK: ${apk.name}` : 'Выбрать APK'}</button>
      <input aria-label="Имя пакета" placeholder="com.example.app" value={packageName} onChange={(event) => setPackageName(event.target.value)} />
      <button type="button" onClick={() => void install()} disabled={!apk || !selected || Boolean(busy)}>Установить</button>
      <button type="button" className="dm-secondary" onClick={() => void uninstall()} disabled={!selected || !packageName || Boolean(busy)}>Удалить</button>
    </section>
    {message && <p className="dm-message" role="status">{message}</p>}
    <section className="dm-devices" aria-label="Устройства">
      {ready.length === 0 ? <div className="dm-empty">Подключите Android-устройство с включённой отладкой по Wi‑Fi.</div> : ready.map((device) => <button key={device.id} type="button" className={`dm-device ${selected === device.id ? 'dm-device--selected' : ''}`} onClick={() => setSelected(device.id)}>
        <span><strong>{device.model ?? device.serial}</strong><small>{device.serial}</small></span><span className="dm-status">{busy === device.id ? 'busy' : device.status}</span>
      </button>)}
    </section>
  </main>;
};

export default DeviceManagerApp;
