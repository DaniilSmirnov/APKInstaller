import React from 'react';
import type { DeviceInfo, OperationMessage, PackageInfo } from '../types';

interface DeviceCardProps {
  device: DeviceInfo;
  packageName?: string | null;
  packageInfo?: PackageInfo | null;
  packageLoading?: boolean;
  busy?: boolean;
  message?: OperationMessage;
  apkSelected?: boolean;
  onInstall: (device: DeviceInfo) => void;
  onUninstall: (device: DeviceInfo) => void;
}

const statusLabels: Record<DeviceInfo['status'], string> = {
  device: 'Готово',
  emulator: 'Готово',
  offline: 'Offline',
  unauthorized: 'Требуется разрешение',
  unknown: 'Unknown device status',
};

const DeviceCard = ({ device, packageName, packageInfo, packageLoading, busy, message, apkSelected, onInstall, onUninstall }: DeviceCardProps): JSX.Element => {
  const available = device.status === 'device';
  const title = [device.manufacturer, device.model].filter(Boolean).join(' ') || device.serial;
  const version = packageLoading ? 'Проверка…' : packageInfo ? `v${packageInfo.versionName ?? packageInfo.versionCode}` : 'Не установлено';

  return (
    <article className={`device-card device-card--${device.status}`} data-testid={`device-card-${device.serial}`} aria-label={`Устройство ${title}`}>
      <div className="device-card__header">
        <div>
          <h3>{device.manufacturer && <span>{device.manufacturer} </span>}<span>{device.model ?? device.serial}</span></h3>
          <code>{device.serial}</code>
        </div>
        <span className="device-status" aria-label={`Статус: ${statusLabels[device.status]}`}>{statusLabels[device.status]}</span>
      </div>
      <dl className="device-details">
        <div><dt>Android</dt><dd>{device.androidVersion ?? '—'}{device.sdkVersion ? ` (SDK ${device.sdkVersion})` : ''}</dd></div>
        <div><dt>Приложение</dt><dd>{packageName ? version : 'Укажите package name'}</dd></div>
      </dl>
      {!available && <p className="device-hint">{device.status === 'unauthorized' ? 'Подтвердите USB-отладку на устройстве.' : 'Операции станут доступны после подключения устройства.'}</p>}
      {message && <p className={`operation-message operation-message--${message.tone}`} role="status">{message.text}</p>}
      <div className="device-actions">
        <button type="button" onClick={() => onInstall(device)} disabled={!available || (apkSelected === false) || busy}>
          {busy ? 'Выполняется…' : 'Установить'}
        </button>
        <button type="button" className="secondary-button" onClick={() => onUninstall(device)} disabled={!available || (packageName !== undefined && !packageName) || (packageInfo !== undefined && !packageInfo) || busy}>
          Удалить
        </button>
      </div>
    </article>
  );
};

export default DeviceCard;
