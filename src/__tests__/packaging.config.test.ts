import fs from 'node:fs';
import path from 'node:path';
import {
  expectedArtifactNames,
  findTeamCityReferences,
  findWorkflowFiles,
  validatePackagingConfig,
  validateWorkflowSmoke,
} from '../test-utils/packagingValidation';

const repositoryRoot = path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
  build: Record<string, unknown>;
};

describe('packaging configuration', () => {
  it('declares installable targets for macOS, Windows and Ubuntu/Linux', () => {
    expect(validatePackagingConfig(packageJson)).toEqual([]);
  });

  it('uses stable artifact names for all supported desktop platforms', () => {
    expect(expectedArtifactNames(packageJson)).toEqual({
      macos: 'APKInstaller-1.0.0.dmg',
      windows: 'APKInstaller-1.0.0.exe',
      ubuntu: 'APKInstaller-1.0.0.AppImage',
    });
  });

  it('validates every GitHub Actions workflow when workflows are present', () => {
    const failures = findWorkflowFiles(repositoryRoot).flatMap((file) => validateWorkflowSmoke(file).errors);
    expect(failures).toEqual([]);
  });

  it('documents the commands required to build and package the app', () => {
    const readme = fs.readFileSync(path.join(repositoryRoot, 'README.md'), 'utf8');
    for (const command of ['npm ci', 'npm start', 'npm test', 'npm run lint', 'npm run typecheck', 'npm run build', 'npm run package']) {
      expect(readme).toContain(command);
    }
  });

  it('contains no TeamCity configuration or references', () => {
    expect(findTeamCityReferences(repositoryRoot)).toEqual([]);
  });
});
