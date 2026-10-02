import fs from 'node:fs';
import path from 'node:path';

const PACKAGE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
export const normalizePackages = (values: string[]): string[] => [...new Set(values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter((value) => PACKAGE_PATTERN.test(value)))];
export const migrateLegacySettings = (userDataPath: string): string[] => {
  const legacyPath = path.join(userDataPath, 'settings.db');
  if (!fs.existsSync(legacyPath)) return [];
  const backupPath = `${legacyPath}.bak`;
  try {
    if (!fs.existsSync(backupPath)) fs.copyFileSync(legacyPath, backupPath);
    const content = fs.readFileSync(legacyPath, 'utf8');
    const match = content.match(/(?:package|packages)\s*[=:]\s*['"]?([^'"\n;]+)|INSERT INTO settings[^\n]*package[^\n]*['"]([^'"]+)/i);
    return normalizePackages(match ? [match[1] ?? match[2] ?? ''] : []);
  } catch { return []; }
};
