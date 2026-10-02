import React, { type ChangeEvent, type DragEvent, useState } from 'react';

interface ApkDropZoneProps {
  apkPath: string | null;
  onSelect: () => void;
  onDrop: (path: string) => void;
}

const ApkDropZone = ({ apkPath, onSelect, onDrop }: ApkDropZoneProps): JSX.Element => {
  const [error, setError] = useState<string | null>(null);
  const accept = (file?: File): void => {
    const path = file ? window.electron.app.getDroppedApkPath(file) : '';
    if (!path || !path.toLowerCase().endsWith('.apk')) { setError('Выберите APK-файл'); return; }
    setError(null); onDrop(path);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    accept(event.dataTransfer.files[0]);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    accept(event.target.files?.[0]);
    event.target.value = '';
  };

  return (
    <div
      className="apk-drop-zone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Выбрать APK-файл"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
    >
      <div className="apk-drop-copy">
        <strong>{apkPath ? 'APK выбран' : 'Перетащите APK сюда'}</strong>
        <span>{apkPath ?? 'или выберите файл через системный диалог'}</span>
      </div>
      <button type="button" className="secondary-button" onClick={onSelect}>
        Выбрать APK
      </button>
      <input className="visually-hidden" type="file" accept=".apk,application/vnd.android.package-archive" onChange={handleFileInput} aria-hidden="true" />
      {error && <span role="alert">{error}</span>}
    </div>
  );
};

export default ApkDropZone;
