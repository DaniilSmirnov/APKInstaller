import fs from 'node:fs';
import path from 'node:path';

describe('Electron foundation package', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );

  it('uses APKInstaller identity without boilerplate publishing', () => {
    expect(packageJson.build.productName).toBe('APKInstaller');
    expect(packageJson.build.appId).toBe('com.daniilsmirnov.apkinstaller');
    expect(JSON.stringify(packageJson)).not.toContain('ElectronReact');
    expect(packageJson.build.publish).toBeUndefined();
  });
});
