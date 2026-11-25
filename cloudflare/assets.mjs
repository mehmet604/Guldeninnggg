import { copyFile, mkdir } from 'node:fs/promises';

const names = ['index.html', 'app.js', 'teachers.js', 'style.css', 'sw.js',
  'manifest.webmanifest', 'vase.webp', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const directory = new URL('./public/', import.meta.url);
await mkdir(directory, { recursive: true });
await Promise.all(names.map(name =>
  copyFile(new URL('../' + name, import.meta.url), new URL(name, directory))));
