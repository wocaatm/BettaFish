import { safeText, sleep } from "../utils.js";

export async function searchTieba({ browser, keyword, max = 30 }) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // 贴吧全站搜索结果页（相对容易获取；若触发风控会出现验证）
  const url = `https://tieba.baidu.com/f/search/res?isnew=1&ie=utf-8&qw=${encodeURIComponent(keyword)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.waitForSelector(".s_post, .s_post_list, .s_post_list .p_title", { timeout: 15000 }).catch(() => {});

  const items = await page.evaluate(() => {
    const out = [];
    const posts = Array.from(document.querySelectorAll(".s_post"));
    for (const el of posts) {
      const titleA = el.querySelector(".p_title a") || el.querySelector("a");
      const href = titleA?.getAttribute("href") || "";
      const fullUrl = href.startsWith("http") ? href : href ? `https://tieba.baidu.com${href}` : "";
      const title = titleA?.textContent || "";
      const snippet = el.querySelector(".p_content")?.textContent || "";
      const author = el.querySelector(".p_author a")?.textContent || el.querySelector(".p_author")?.textContent || "";
      const forum = el.querySelector(".p_forum a")?.textContent || "";
      const date = el.querySelector(".p_date")?.textContent || "";
      if (fullUrl && title) {
        out.push({ url: fullUrl, title, text: snippet, author, forum, date });
      }
    }
    const seen = new Set();
    return out.filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  });

  await sleep(600);
  await context.close();

  return items.slice(0, max).map((it) => ({
    platform: "tieba",
    keyword,
    itemType: "post",
    title: safeText(it.title),
    text: safeText(it.text),
    author: safeText(it.author),
    url: it.url,
    meta: {
      forum: safeText(it.forum),
      date: safeText(it.date),
    },
    capturedAt: new Date().toISOString(),
    comments: [],
    // TODO: 贴吧“帖子详情+楼层评论”抓取可在这里追加：进入 it.url，解析楼层文本/回复
  }));
}

