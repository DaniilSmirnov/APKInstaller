import React, { type ChangeEvent, type DragEvent, useState } from 'react';

interface ApkInputProps { value: File | null; onChange: (file: File) => void; }

const ApkInput = ({ value, onChange }: ApkInputProps): JSX.Element => {
  const [error, setError] = useState<string | null>(null);
  const accept = (file?: File): void => {
    if (!file || !file.name.toLowerCase().endsWith('.apk')) { setError('Invalid APK file'); return; }
    setError(null); onChange(file);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>): void => { event.preventDefault(); accept(event.dataTransfer.files[0]); };
  const onFile = (event: ChangeEvent<HTMLInputElement>): void => { accept(event.target.files?.[0]); };
  return <div data-testid="apk-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><label htmlFor="apk-file">{value?.name ?? 'Choose APK'}</label><input id="apk-file" aria-label="Choose APK" type="file" accept=".apk" onChange={onFile} />{error && <p role="alert">{error}</p>}</div>;
};
export default ApkInput;
