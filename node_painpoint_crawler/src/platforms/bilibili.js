import { safeText, sleep } from "../utils.js";

function parseBvidOrAid(url) {
  const u = String(url || "");
  const m1 = u.match(/\/video\/(BV[0-9A-Za-z]+)/);
  if (m1) return { bvid: m1[1] };
  const m2 = u.match(/\/video\/av(\d+)/);
  if (m2) return { aid: m2[1] };
  return {};
}

export async function searchBilibili({ browser, keyword, max = 30, headlessHint }) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // B站搜索页（通常无需登录也能看到结果；若风控会出现验证码/跳转）
  const url = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}&from_source=web_search`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);

  // 尝试等待列表出现
  await page.waitForSelector(".video-list, .bili-video-card, .video-item", { timeout: 15000 }).catch(() => {});

  const items = await page.evaluate(() => {
    const results = [];

    // 新老 DOM 都兼容一下
    const cards = Array.from(document.querySelectorAll(".bili-video-card, .video-item, .bili-video-card__wrap"));
    for (const el of cards) {
      const a = el.querySelector("a[href*='/video/']") || el.querySelector("a");
      const href = a?.getAttribute("href") || "";
      const fullUrl = href.startsWith("//") ? `https:${href}` : href;

      const title =
        a?.getAttribute("title") ||
        el.querySelector(".bili-video-card__info--tit")?.textContent ||
        el.querySelector(".title")?.textContent ||
        "";

      const desc =
        el.querySelector(".bili-video-card__info--desc")?.textContent ||
        el.querySelector(".desc")?.textContent ||
        "";

      const author =
        el.querySelector(".bili-video-card__info--author")?.textContent ||
        el.querySelector(".up-name")?.textContent ||
        "";

      const meta = el.querySelector(".bili-video-card__info--icon-text")?.textContent || "";

      if (fullUrl && title) {
        results.push({
          url: fullUrl,
          title,
          text: desc || meta || "",
          author,
        });
      }
    }

    // 去重
    const seen = new Set();
    return results.filter((r) => {
      const key = r.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  await sleep(800);
  await context.close();

  return items.slice(0, max).map((it) => ({
    platform: "bilibili",
    keyword,
    itemType: "video",
    title: safeText(it.title),
    text: safeText(it.text),
    author: safeText(it.author),
    url: it.url,
    ids: parseBvidOrAid(it.url),
    capturedAt: new Date().toISOString(),
    comments: [],
    // TODO: 若你要对接评论，可参考 Python 的 bilibili client：签名参数 + /x/v2/reply/wbi/main
  }));
}

