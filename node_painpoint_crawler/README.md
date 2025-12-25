## Node 版本：关键词搜索爬取 + 痛点抽取

### 你要的“对应关系”（Python → Node）

- Python 的入口是 `MindSpider/DeepSentimentCrawling/platform_crawler.py`：把 `KEYWORDS / PLATFORM / CRAWLER_TYPE=search` 写进 MediaCrawler 配置，然后执行 `MediaCrawler/main.py`。
- Node 版本在这里做同样的事：按 `--platforms` 和 `--keywords` 逐个平台跑 `search()`，拿到“帖子/视频 + 评论”的文本后，再调用 LLM 抽取“痛点”。

### 安装

```bash
cd /workspace/node_painpoint_crawler
npm i
npx playwright install chromium
```

### 配置（.env）

```bash
OPENAI_API_KEY=xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 可选：持久化浏览器登录态（用于需要登录的平台）
USER_DATA_DIR=/workspace/node_painpoint_crawler/.browser_data
HEADLESS=true
```

### 运行

示例：只跑相对容易的 B站 + 贴吧（先把链路跑通）

```bash
npm run crawl -- --platforms bilibili,tieba --keywords "耳机,净水器,手机卡顿" --max 30
```

产物：

- `output/raw_<timestamp>.jsonl`：原始抓取结果（逐行 JSON）
- `output/painpoints_<timestamp>.json`：LLM 抽取的痛点结构化结果

### 合规提示

本项目示例代码仅用于学习/研究。不同平台有不同服务条款与反爬策略，请务必控制频率、遵守平台规则与当地法律法规。

