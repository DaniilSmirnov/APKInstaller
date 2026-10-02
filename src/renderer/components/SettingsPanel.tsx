import React from 'react';

interface Props { value: string; onChange: (value: string) => void; onSave: () => void }
export default function SettingsPanel({ value, onChange, onSave }: Props): JSX.Element {
  return <section className="settings-panel" aria-label="Настройки"><label htmlFor="packages">Пакеты (через запятую)</label><input id="packages" value={value} onChange={(event) => onChange(event.target.value)} placeholder="com.example.app" /><button type="button" onClick={onSave}>Сохранить</button></section>;
}
