import fs from 'node:fs';
import path from 'node:path';

describe('Electron foundation package', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );

  it('uses DeviceManager identity without boilerplate publishing', () => {
    expect(packageJson.build.productName).toBe('DeviceManager');
    expect(packageJson.build.appId).toBe('com.daniilsmirnov.devicemanager');
    expect(JSON.stringify(packageJson)).not.toContain('ElectronReact');
    expect(packageJson.build.publish).toBeUndefined();
  });
});
