import fs from 'node:fs';
import path from 'node:path';

export type PackagingConfig = {
  name?: string;
  version?: string;
  build?: {
    productName?: string;
    artifactName?: string;
    directories?: { output?: string };
    mac?: { target?: string | string[] };
    win?: { target?: string | string[] };
    linux?: { target?: string | string[] };
  };
};

export type WorkflowSmokeResult = {
  file: string;
  errors: string[];
};

const asList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export const validatePackagingConfig = (config: PackagingConfig): string[] => {
  const errors: string[] = [];
  const targets = {
    macos: asList(config.build?.mac?.target),
    windows: asList(config.build?.win?.target),
    linux: asList(config.build?.linux?.target),
  };

  if (!targets.macos.includes('dmg')) errors.push('macOS target must include dmg');
  if (!targets.windows.includes('nsis')) errors.push('Windows target must include nsis');
  if (!targets.linux.includes('AppImage')) errors.push('Linux target must include AppImage');
  if (!targets.linux.includes('deb')) errors.push('Linux target must include deb');
  if (config.build?.directories?.output !== 'release/build') errors.push('packaging output must be release/build');
  if (config.build?.artifactName !== '\${productName}-\${version}-\${os}-\${arch}.\${ext}') errors.push('artifactName must include product version, OS and architecture');

  return errors;
};

export const findWorkflowFiles = (repositoryRoot: string): string[] => {
  const workflowDirectory = path.join(repositoryRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDirectory)) return [];

  return fs.readdirSync(workflowDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(yaml|yml)$/i.test(entry.name))
    .map((entry) => path.join(workflowDirectory, entry.name));
};

export const validateWorkflowSmoke = (workflowFile: string): WorkflowSmokeResult => {
  const content = fs.readFileSync(workflowFile, 'utf8');
  const errors: string[] = [];
  const requiredFragments = [
    /^\s*name\s*:/m,
    /^\s*on\s*:/m,
    /^\s*jobs\s*:/m,
    /runs-on\s*:/,
    /npm\s+(?:ci|install)/,
    /npm\s+run\s+build/,
    /electron-builder\s+--publish\s+never/,
    /actions\/upload-artifact@v4/,
  ];

  requiredFragments.forEach((fragment) => {
    if (!fragment.test(content)) errors.push(\`missing workflow fragment: \${fragment}\`);
  });

  if (!/workflow_dispatch/.test(content) || !/tags:\s*[\s\S]*['"]?v\*/.test(content)) {
    errors.push('workflow must support manual and v* tag triggers');
  }
  for (const fragment of ['macos-latest', 'windows-latest', 'ubuntu-latest', '--mac dmg', '--linux AppImage deb', '--win nsis', '--x64', '--arm64']) {
    if (!content.includes(fragment)) errors.push(\`workflow missing packaging matrix fragment: \${fragment}\`);
  }
  if (/teamcity|\.teamcity|jetbrains/i.test(content)) errors.push('workflow must not reference TeamCity');
  if (/\t/.test(content)) errors.push('workflow YAML must not contain tab characters');

  return { file: workflowFile, errors };
};

export const findTeamCityReferences = (repositoryRoot: string): string[] => {
  const matches: string[] = [];
  const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'release']);
  const ignoredFiles = new Set(['README.md', 'readme.md']);

  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignoredDirectories.has(entry.name)) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(entryPath); continue; }
      if (!entry.isFile()) continue;
      if (ignoredFiles.has(entry.name) || entryPath.includes(\`\${path.sep}src\${path.sep}__tests__\${path.sep}\`) || entryPath.includes(\`\${path.sep}src\${path.sep}test-utils\${path.sep}\`)) continue;
      const content = fs.readFileSync(entryPath, 'utf8');
      if (/teamcity|\.teamcity|jetbrains/i.test(content)) matches.push(entryPath);
    }
  };

  visit(repositoryRoot);
  return matches;
};
