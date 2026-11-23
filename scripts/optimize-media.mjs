import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { mkdir, readdir, writeFile, stat } from "node:fs/promises";

// Next already depends on Sharp; use that installed copy without a new package.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [dirname(require.resolve("next/package.json"))] }));
const root = resolve(import.meta.dirname, "..");
const media = resolve(root, "public/media");
const thumbs = resolve(media, "thumbs");
await mkdir(thumbs, { recursive: true });
const originals = ["product-card.webp", ...(await readdir(resolve(media, "su-yolu"))).filter(name => name.endsWith(".webp")).map(name => `su-yolu/${name}`)];
const manifest = {};
for (const file of originals) {
  const source = resolve(media, file);
  const metadata = await sharp(source).metadata();
  const variants = [];
  for (const width of [420, 840].filter(width => width < metadata.width)) {
    const name = `${file.replaceAll("/", "-").replace(/\.webp$/, "")}-${width}.webp`;
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 76 }).toFile(resolve(thumbs, name));
    variants.push(`/media/thumbs/${name} ${width}w`);
  }
  variants.push(`/media/${file} ${metadata.width}w`);
  manifest[`/media/${file}`] = variants.join(", ");
}
await sharp(resolve(media, "steppe-poster.jpg")).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 60 }).toFile(resolve(media, "steppe-poster.webp"));
await writeFile(resolve(root, "lib/card-image-variants.json"), JSON.stringify(manifest, null, 2) + "\n");
const before = (await stat(resolve(media, "steppe-poster.jpg"))).size;
const after = (await stat(resolve(media, "steppe-poster.webp"))).size;
console.log(`Poster: ${before} -> ${after} bytes. Responsive card sources: ${Object.keys(manifest).length}. Originals preserved.`);
