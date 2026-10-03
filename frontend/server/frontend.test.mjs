import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
let temporaryDirectory;
let render;

before(async () => {
  temporaryDirectory = mkdtempSync(join(root, '.stage1-render-'));
  const screens = {};
  const names = ['GlobalSearchScreen', 'SettingsScreen', 'SpeciesDetailScreen', 'Header'];
  // Compile these existing TSX screens for Node rendering; no browser or new test framework.
  for (const relative of ['lib/useDialogFocus.ts', ...names.map((name) => `components/${name}.tsx`)]) {
    const output = join(temporaryDirectory, relative.replace(/\.tsx?$/, '.mjs'));
    mkdirSync(dirname(output), { recursive: true });
    const source = readFileSync(join(root, 'src', relative), 'utf8');
    const { code } = transformSync(source, { loader: 'tsx', format: 'esm', jsx: 'automatic', target: 'es2022' });
    writeFileSync(output, code.replace('../lib/useDialogFocus"', '../lib/useDialogFocus.mjs"'));
  }
  for (const name of names) {
    const module = await import(pathToFileURL(join(temporaryDirectory, 'components', `${name}.mjs`)).href);
    screens[name] = module[name];
  }
  render = (name, props) => renderToStaticMarkup(createElement(screens[name], props));
});

after(() => {
  // Only remove the directory created by this test, inside this workspace.
  if (temporaryDirectory && dirname(temporaryDirectory) === root.replace(/[\\/]$/, '')) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

const noop = () => {};
const searchProps = { speciesList: [], hotspots: [], posts: [], onSelectSpecies: noop, onSelectHotspot: noop, onNavigate: noop };

test('search renders its only matching hotspot and every matching bird', () => {
  const html = render('GlobalSearchScreen', {
    ...searchProps,
    speciesList: [
      { id: 'roller-a', name: 'First Roller', scientificName: 'First scientific name', image: '/first.jpg', sightingsThisWeek: 0 },
      { id: 'roller-b', name: 'Second Roller', scientificName: 'Second scientific name', image: '/second.jpg', sightingsThisWeek: 3 },
    ],
    hotspots: [{ id: 'only', name: 'Roller Wetland', region: 'Test region', distanceKm: 2, activeTodayCount: 0 }],
  });
  assert.match(html, /First Roller/);
  assert.match(html, /Second Roller/);
  assert.match(html, /Roller Wetland/);
  assert.match(html, /0 local sightings this week/);
  assert.match(html, /0 species active today/);
});

test('unrelated people and posts do not suppress the empty search state', () => {
  const html = render('GlobalSearchScreen', {
    ...searchProps,
    posts: [{ id: 'unrelated', authorName: 'Maya Singh', authorHandle: '@maya', authorAvatar: '/maya.jpg', speciesName: 'Kingfisher', speciesScientific: 'Alcedo atthis', location: 'River', caption: 'Fishing', imageUrl: '/bird.jpg' }],
  });
  assert.match(html, /No wanderings found/);
  assert.doesNotMatch(html, /Maya Singh/);
  assert.doesNotMatch(html, /src="\/bird.jpg"/);
});

test('species details preserve a genuine zero sightings count', () => {
  const html = render('SpeciesDetailScreen', {
    species: { id: 'zero', name: 'Test Bird', scientificName: 'Test scientific name', image: '/test.jpg', sightingsThisWeek: 0 },
    onNavigate: noop, onQuickLog: noop, showToast: noop,
  });
  assert.match(html, />0<\/span>/);
});

test('settings and header display the supplied account identity', () => {
  const userProfile = { name: 'Test Observer', avatarUrl: '/observer.jpg', locationPrivacy: 'approximate', profileVisibility: 'public' };
  const html = render('SettingsScreen', { email: 'observer@example.test', userProfile, onUpdateProfile: noop, onLogout: noop, onNavigate: noop, showToast: noop });
  assert.match(html, /observer@example.test/);
  assert.doesNotMatch(html, /sourabh@wanderer.in/);
  const header = render('Header', { currentScreen: 'explore', userProfile, onNavigate: noop, onBack: noop, showToast: noop });
  assert.match(header, /alt="Test Observer profile"/);
  assert.match(header, /src="\/observer.jpg"/);
});
