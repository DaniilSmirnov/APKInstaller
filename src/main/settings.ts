import Store from 'electron-store';
import { migrateLegacySettings, normalizePackages } from './settingsSchema';
export { migrateLegacySettings, normalizePackages } from './settingsSchema';

export interface AppSettings {
  schemaVersion: 1;
  packages: string[];
  selectedPackage?: string;
  lastSelectedSerial?: string;
}

export const createSettingsStore = (userDataPath: string): Store<AppSettings> => {
  const migrated = migrateLegacySettings(userDataPath);
  const store = new Store<AppSettings>({
    name: 'settings',
    cwd: userDataPath,
    defaults: { schemaVersion: 1, packages: migrated },
    schema: {
      schemaVersion: { type: 'number', const: 1 },
      packages: { type: 'array', items: { type: 'string' } },
      selectedPackage: { type: 'string' },
      lastSelectedSerial: { type: 'string' },
    },
  });
  store.set('packages', normalizePackages(store.get('packages')));
  return store;
};
