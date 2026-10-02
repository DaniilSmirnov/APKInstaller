import fs from 'node:fs';
import path from 'node:path';

describe('preload contract', () => {
  it('exposes only the named bridge and no generic IPC methods', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/main/preload.ts'),
      'utf8',
    );
    expect(source).toContain("exposeInMainWorld('electron'");
    expect(source).toContain("ipcRenderer.invoke('app:get-version')");
    expect(source).not.toContain('ipcRenderer.send');
    expect(source).not.toContain('ipcRenderer.on');
  });
});
