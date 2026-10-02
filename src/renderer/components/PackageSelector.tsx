import React from 'react';

interface PackageSelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

const PackageSelector = ({ value, onChange }: PackageSelectorProps): JSX.Element => (
  <div className="package-field">
    <label htmlFor="package-name"><span>Package name</span></label>
    <input id="package-name" value={Array.isArray(value) ? '' : value} onChange={(event) => onChange(Array.isArray(value) ? event.target.value : event.target.value)} placeholder="com.example.app" aria-label="Имена пакетов приложений" />
    {Array.isArray(value) && <div className="package-tags">{value.map((name) => <button type="button" className="package-tag" key={name} aria-label={`Remove ${name}`} onClick={() => onChange(value.filter((item) => item !== name))}>{name}</button>)}</div>}
    {Array.isArray(value) && <button type="button" className="secondary-button" onClick={() => { const input = document.getElementById('package-name') as HTMLInputElement | null; const name = input?.value.trim() ?? ''; if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(name)) return; onChange([...value, name]); if (input) input.value = ''; }}>Add package</button>}
    <small>Можно указать несколько через запятую</small>
  </div>
);

export default PackageSelector;
