const fs = require("fs");
const path = require("path");
const { pinyin } = require("pinyin-pro");

const root = path.resolve(__dirname, "..");
const catalog = require(path.join(root, "src/data/generated/catalog.json"));
const names = Array.from(new Set(catalog.map((player) => player.name))).filter(Boolean).sort();
const out = {};

for (const name of names) {
  const clean = name.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "");
  if (!clean) continue;
  const full = pinyin(clean, { toneType: "none", type: "array", nonZh: "consecutive" })
    .join("")
    .toLowerCase();
  const initials = pinyin(clean, {
    pattern: "first",
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  })
    .join("")
    .toLowerCase();
  out[name] = { f: full, i: initials };
}

fs.writeFileSync(
  path.join(root, "src/data/generated/pinyin.json"),
  JSON.stringify(out),
  "utf8",
);
console.log(`pinyin index: ${Object.keys(out).length} names`);
