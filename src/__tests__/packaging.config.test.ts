import fs from 'node:fs';
import path from 'node:path';
import {
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
  it('declares installable targets and versioned artifact naming', () => {
    expect(validatePackagingConfig(packageJson)).toEqual([]);
    expect(packageJson.build).toMatchObject({
      artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
    });
  });

  it('bundles ESM-only main-process dependencies instead of requiring them at runtime', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mainConfig = require(path.join(repositoryRoot, 'config', 'webpack.main.js')) as { externals?: Record<string, string> };
    for (const dependency of Object.keys(mainConfig.externals ?? {})) {
      const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'node_modules', dependency, 'package.json'), 'utf8')) as { type?: string };
      expect({ dependency, type: manifest.type }).not.toEqual({ dependency, type: 'module' });
    }
  });

  it('validates every GitHub Actions workflow when workflows are present', () => {
    const failures = findWorkflowFiles(repositoryRoot)
      .filter((file) => path.basename(file) === 'package.yml')
      .flatMap((file) => validateWorkflowSmoke(file).errors);
    expect(failures).toEqual([]);
    const deviceManagerWorkflow = fs.readFileSync(path.join(repositoryRoot, '.github', 'workflows', 'device-manager.yml'), 'utf8');
    expect(deviceManagerWorkflow).toContain('pull_request:');
    expect(deviceManagerWorkflow).toContain('npm run build:all');
  });

  it('documents native runner packaging commands', () => {
    const readme = fs.readFileSync(path.join(repositoryRoot, 'README.md'), 'utf8');
    for (const command of ['npm ci', 'npm start', 'npm test', 'npm run lint', 'npm run typecheck', 'npm run build', 'npm run package']) {
      expect(readme).toContain(command);
    }
    expect(readme).toContain('native runner');
    expect(readme).toContain('macOS');
    expect(readme).toContain('Windows');
    expect(readme).toContain('Ubuntu');
  });

  it('contains no TeamCity configuration or references', () => {
    expect(findTeamCityReferences(repositoryRoot)).toEqual([]);
  });
});
