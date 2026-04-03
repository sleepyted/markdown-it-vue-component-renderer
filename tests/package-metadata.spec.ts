import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

type PackageJson = {
  name: string;
  version: string;
  description?: string;
  license?: string;
  repository?: { type?: string; url?: string } | string;
  homepage?: string;
  bugs?: { url?: string } | string;
  exports?: Record<string, { import?: string; types?: string }>;
  files?: string[];
  sideEffects?: boolean;
  scripts?: Record<string, string>;
};

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
) as PackageJson;

describe('package metadata for npm publishing', () => {
  test('uses the chosen publishable package identity', () => {
    expect(packageJson.name).toBe('markdown-it-vue-component-renderer');
    expect(packageJson.version).toBe('0.1.0');
    expect(packageJson.license).toBe('MIT');
  });

  test('includes repository metadata for npm package pages', () => {
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/sleepyted/markdown-it-vue-component-renderer.git'
    });
    expect(packageJson.homepage).toBe(
      'https://github.com/sleepyted/markdown-it-vue-component-renderer#readme'
    );
    expect(packageJson.bugs).toEqual({
      url: 'https://github.com/sleepyted/markdown-it-vue-component-renderer/issues'
    });
  });

  test('publishes only the dist entry through exports', () => {
    expect(packageJson.exports).toEqual({
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts'
      }
    });
    expect(packageJson.files).toEqual(['dist']);
    expect(packageJson.sideEffects).toBe(false);
  });

  test('defines clean and publish guard scripts', () => {
    expect(packageJson.scripts).toMatchObject({
      clean: 'node -e "require(\'node:fs\').rmSync(\'dist\', { recursive: true, force: true })"',
      build: 'npm run clean && tsc',
      prepack: 'npm test && npm run build',
      prepublishOnly: 'npm test && npm run build'
    });
  });
});
