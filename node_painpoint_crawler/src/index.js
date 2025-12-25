import "dotenv/config";
import { chromium } from "playwright";

import { parseArgs, normalizeCsv, nowStamp, ensureDir, appendJsonl, writeJson, sleep } from "./utils.js";
import { resolvePlatforms } from "./platforms/index.js";
import { extractPainPoints } from "./painpoints/extractPainPoints.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const platformsArg = args.platforms || process.env.PLATFORMS || "bilibili,tieba";
  const keywordsArg = args.keywords || process.env.KEYWORDS || "";

  const platforms = normalizeCsv(platformsArg);
  const keywords = normalizeCsv(keywordsArg);

  if (!keywords.length) {
    throw new Error("请提供 --keywords（逗号分隔），例如：--keywords \"耳机,净水器,手机卡顿\"");
  }

  const perPlatformMax = Math.max(1, parseInt(args.max || process.env.MAX_RESULTS || "30", 10));
  const delayMs = Math.max(0, parseInt(args.sleep || process.env.SLEEP_MS || "1200", 10));
  const headless = String(args.headless ?? process.env.HEADLESS ?? "true").toLowerCase() !== "false";
  const queryContext = args.context || process.env.QUERY_CONTEXT || "";

  const { resolved, unknown } = resolvePlatforms(platforms);
  if (unknown.length) {
    console.warn(`⚠️ 未实现的平台: ${unknown.join(", ")}（目前仅内置 bilibili,tieba 适配器）`);
  }
  if (!resolved.length) {
    throw new Error("没有可用的平台适配器，请检查 --platforms 参数");
  }

  const stamp = nowStamp();
  const outDir = new URL("../output/", import.meta.url).pathname;
  ensureDir(outDir);
  const rawPath = `${outDir}raw_${stamp}.jsonl`;
  const painPath = `${outDir}painpoints_${stamp}.json`;

  const browser = await chromium.launch({ headless });

  const allItems = [];
  try {
    for (const keyword of keywords) {
      for (const p of resolved) {
        console.log(`\n=== 平台: ${p.label} (${p.id}) | 关键词: ${keyword} ===`);
        try {
          const items = await p.search({
            browser,
            keyword,
            max: perPlatformMax,
          });

          for (const item of items) {
            appendJsonl(rawPath, item);
            allItems.push(item);
          }

          console.log(`抓到 ${items.length} 条`);
        } catch (e) {
          console.error(`抓取失败: platform=${p.id}, keyword=${keyword}:`, e?.message || e);
        }

        if (delayMs) await sleep(delayMs);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n✅ 原始数据已写入: ${rawPath}（共 ${allItems.length} 条）`);

  // 用 LLM 做“痛点抽取”
  const pain = await extractPainPoints({
    queryContext,
    items: allItems,
    maxItemsForLLM: Math.min(allItems.length, 120),
  });
  writeJson(painPath, pain);
  console.log(`✅ 痛点抽取结果已写入: ${painPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

