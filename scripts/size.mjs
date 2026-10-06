import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET = 16 * 1024;
const dist = "dist";

const html = readFileSync(join(dist, "index.html"), "utf8");
const files = [
  ...html.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="\/([^"]+\.js)"/g),
].map((m) => m[1]);

let total = 0;
for (const file of files) {
  const buf = readFileSync(join(dist, file));
  const gz = gzipSync(buf, { level: 9 }).length;
  total += gz;
  console.log(`${file}  ${buf.length} B  ${gz} B gzipped`);
}
console.log(`first-load JavaScript: ${total} B gzipped, budget ${BUDGET} B`);
if (total > BUDGET) {
  console.error("over budget");
  process.exit(1);
}
