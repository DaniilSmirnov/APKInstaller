import fs from 'node:fs';
import path from 'node:path';

describe('renderer entrypoint', () => {
  it('provides a root element and a restrictive CSP', () => {
    const html = fs.readFileSync(
      path.join(process.cwd(), 'src/renderer/index.ejs'),
      'utf8',
    );
    expect(html).toContain('id="root"');
    expect(html).toContain("default-src 'self'");
  });
});
