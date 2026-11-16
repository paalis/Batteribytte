// Uploads assets/clips/ to Vercel Blob and points clips.json at it (sets "base"). Big clips stay out of git.
//   npm i --no-save @vercel/blob
//   BLOB_READ_WRITE_TOKEN=… node tools/upload-clips.mjs [folder]      (folder defaults to assets/clips)
// The token is in the Vercel dashboard: Storage → your Blob store → .env.local. Never commit it.
import { put } from '@vercel/blob';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIR = process.argv[2] || 'assets/clips';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
let base = '';
for (const file of walk(DIR)) {
  const path = relative('.', file).split('\\').join('/');            // same path as in clips.json
  const blob = await put(path, readFileSync(file), { access: 'public', addRandomSuffix: false, allowOverwrite: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365 });
  base = blob.url.slice(0, blob.url.length - path.length - 1);
  console.log(blob.url);
}
const m = JSON.parse(readFileSync('clips.json', 'utf8'));
m.base = base;
writeFileSync('clips.json', JSON.stringify(m, null, 2) + '\n');
console.log(`clips.json → base ${base}`);
