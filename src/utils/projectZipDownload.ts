import JSZip from 'jszip';

import indexHtml from '../../index.html?raw';
import packageJson from '../../package.json?raw';
import viteConfig from '../../vite.config.ts?raw';
import tsconfig from '../../tsconfig.json?raw';
import metadata from '../../metadata.json?raw';
import readme from '../../README.md?raw';
import envExample from '../../.env.example?raw';

/**
 * Every file under /src is inlined as raw text at build time so the browser can
 * rebuild a downloadable copy of the repository without a backend.
 */
const srcFileModules = import.meta.glob('/src/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ROOT_FILES: Record<string, string> = {
  'index.html': indexHtml,
  'package.json': packageJson,
  'vite.config.ts': viteConfig,
  'tsconfig.json': tsconfig,
  'metadata.json': metadata,
  'README.md': readme,
  '.env.example': envExample,
};

/**
 * Packages the project source into a ZIP and triggers a browser download.
 */
export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();

  Object.entries(ROOT_FILES).forEach(([name, contents]) => {
    zip.file(name, contents);
  });

  Object.keys(srcFileModules)
    .sort()
    .forEach((modulePath) => {
      zip.file(modulePath.replace(/^\//, ''), srcFileModules[modulePath]);
    });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'chargeshare-nexathon.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
