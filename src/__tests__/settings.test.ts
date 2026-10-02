import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateLegacySettings, normalizePackages } from '../main/settingsSchema';

describe('settings migration helpers', () => {
  it('normalizes package lists and removes duplicates', () => {
    expect(normalizePackages([' com.example.app,com.example.app ', 'invalid name', 'org.example.tool'])).toEqual(['com.example.app', 'org.example.tool']);
  });

  it('backs up and imports the legacy settings file idempotently', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'apkinstaller-settings-'));
    const file = path.join(directory, 'settings.db');
    fs.writeFileSync(file, "package='com.example.app'");
    expect(migrateLegacySettings(directory)).toEqual(['com.example.app']);
    expect(fs.existsSync(`${file}.bak`)).toBe(true);
    expect(migrateLegacySettings(directory)).toEqual(['com.example.app']);
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
