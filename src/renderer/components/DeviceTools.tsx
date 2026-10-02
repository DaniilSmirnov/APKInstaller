import React, { useState } from 'react';
import type { DisplaySettings } from '../../main/android/types';

interface Props { serial: string; packageName: string | null; onMessage: (message: string) => void }
export default function DeviceTools({ serial, packageName, onMessage }: Props): JSX.Element {
  const [display, setDisplay] = useState<DisplaySettings | null>(null);
  const [density, setDensity] = useState('');
  const [resolution, setResolution] = useState('');
  const run = async (action: () => Promise<DisplaySettings>): Promise<void> => { try { setDisplay(await action()); onMessage('Настройки экрана обновлены'); } catch { onMessage('Не удалось изменить настройки экрана'); } };
  return <details className="device-tools"><summary>Инструменты устройства</summary>
    <div className="tool-row"><button type="button" onClick={() => void run(() => window.electron.android.getDisplaySettings(serial))}>Обновить экран</button><span>{display ? `DPI: ${display.overrideDensity ?? display.physicalDensity ?? '—'}` : '—'}</span></div>
    <div className="tool-row"><input aria-label="DPI" value={density} onChange={(event) => setDensity(event.target.value)} placeholder="DPI" /><button type="button" disabled={!density} onClick={() => void run(() => window.electron.android.setDensity(serial, Number(density)))}>Применить DPI</button><button type="button" onClick={() => void run(() => window.electron.android.setDensity(serial, null))}>Сбросить DPI</button></div>
    <div className="tool-row"><input aria-label="Разрешение" value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="1080x1920" /><button type="button" disabled={!/^\d+x\d+$/.test(resolution)} onClick={() => { const [width, height] = resolution.split('x').map(Number); void run(() => window.electron.android.setResolution(serial, width ?? null, height)); }}>Применить размер</button><button type="button" onClick={() => void run(() => window.electron.android.setResolution(serial, null))}>Сбросить размер</button></div>
    {packageName && <small>Пакет: {packageName}</small>}
  </details>;
}
