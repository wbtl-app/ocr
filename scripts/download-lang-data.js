import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const langDataDir = join(__dirname, '..', 'lang-data');

// Tesseract language data URLs (tessdata_fast for smaller files)
const LANG_DATA_BASE = 'https://github.com/naptha/tessdata/raw/gh-pages/4.0.0';

const languages = [
  'eng', // English - required
];

async function downloadFile(url, dest) {
  console.log(`Downloading: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  writeFileSync(dest, Buffer.from(buffer));
  console.log(`  Saved: ${dest}`);
}

async function main() {
  if (!existsSync(langDataDir)) {
    mkdirSync(langDataDir, { recursive: true });
  }

  for (const lang of languages) {
    const filename = `${lang}.traineddata.gz`;
    const dest = join(langDataDir, filename);

    if (existsSync(dest)) {
      console.log(`Language data already exists: ${filename}`);
      continue;
    }

    try {
      await downloadFile(`${LANG_DATA_BASE}/${filename}`, dest);
    } catch (err) {
      console.error(`Failed to download ${lang}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('Language data download complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
