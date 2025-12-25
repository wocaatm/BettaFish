import fs from "node:fs";
import path from "node:path";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function appendJsonl(filePath, obj) {
  fs.appendFileSync(filePath, JSON.stringify(obj, null, 0) + "\n", "utf-8");
}

export function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf-8");
}

export function parseArgs(argv) {
  // very small argv parser:
  // --platforms a,b --keywords "x,y" --max 30 --headless true
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

export function normalizeCsv(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function safeText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

export function projectRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

