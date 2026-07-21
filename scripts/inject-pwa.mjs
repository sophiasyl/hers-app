// Injects iOS "Add to Home Screen" (PWA) meta tags into the exported web build.
// Run after `expo export -p web`, before copying index.html → 404.html.
// Expo's web output:"single" (SPA) mode ignores app/+html.tsx, so the HTML
// shell is post-processed here instead.
//
// PWA_BASE_URL is the deploy base path (e.g. "/hers-app" on GitHub Pages, ""
// for a root deploy) so the apple-touch-icon URL is absolute and correct.
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.env.PWA_BASE_URL ?? '';
const file = process.env.PWA_HTML ?? 'dist/index.html';

const tags = [
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Hers." />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="theme-color" content="#33502F" />',
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />`,
].join('\n    ');

let html = readFileSync(file, 'utf8');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Hers.</title>');
html = html.replace(
  'width=device-width, initial-scale=1, shrink-to-fit=no',
  'width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no',
);
if (!html.includes('apple-mobile-web-app-capable')) {
  html = html.replace('</head>', `    ${tags}\n  </head>`);
}
writeFileSync(file, html);
console.log(`Injected PWA meta tags into ${file} (base="${base}")`);
