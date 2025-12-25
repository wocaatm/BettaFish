import OpenAI from "openai";

function buildClient() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY（请在环境变量或 .env 中设置）");
  }
  return new OpenAI({ apiKey, baseURL });
}

function safeJsonParse(maybeJson) {
  if (!maybeJson) return null;
  const text = String(maybeJson).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = text.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      return null;
    }
  }
  return null;
}

export async function extractPainPoints({ queryContext, items, maxItemsForLLM = 120 }) {
  const client = buildClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // 只把最关键的文本喂给模型：标题+摘要+（可选）少量评论
  const picked = items.slice(0, maxItemsForLLM).map((it, idx) => {
    const evidence = [
      `#${idx + 1}`,
      `platform=${it.platform}`,
      `keyword=${it.keyword}`,
      `title=${it.title || ""}`,
      `text=${it.text || ""}`,
      `url=${it.url || ""}`,
    ].join("\n");
    return evidence;
  });

  const system = [
    "你是用户研究/产品经理助手，任务是从多平台搜索到的帖子/视频描述/评论片段中提炼“用户痛点”。",
    "输出必须是 JSON，且必须可被严格 JSON.parse。",
    "不要输出 markdown、不要输出解释过程。",
  ].join("\n");

  const user = [
    `研究主题/产品/领域（可能为空）: ${queryContext || ""}`,
    "",
    "数据样本（每条包含 platform/keyword/title/text/url）：",
    picked.join("\n\n---\n\n"),
    "",
    "请输出 JSON，结构如下：",
    `{
  "pain_points": [
    {
      "pain_point": "一句话描述（尽量具体）",
      "who": "主要人群/场景",
      "severity": 1,
      "frequency": 1,
      "evidence": [
        {"platform": "bilibili", "url": "...", "quote": "原文摘录（短）", "keyword": "..." }
      ],
      "suggested_followups": ["后续验证问题1", "后续验证问题2"]
    }
  ],
  "top_keywords": ["..."],
  "notes": "一句话提醒可能的偏差/样本局限"
}`,
    "",
    "要求：severity/frequency 取 1~5；pain_points 按重要性排序；evidence 至少 2 条（如果样本不足请说明）。",
  ].join("\n");

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
  });

  const content = resp.choices?.[0]?.message?.content || "";
  const parsed = safeJsonParse(content);
  if (!parsed) {
    return {
      error: "LLM 输出不是合法 JSON（已返回原文）",
      raw: content,
    };
  }
  return parsed;
}

