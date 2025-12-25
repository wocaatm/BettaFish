import { searchBilibili } from "./bilibili.js";
import { searchTieba } from "./tieba.js";

/**
 * 说明：
 * - 这里先实现“较容易跑通”的平台：bilibili、tieba。
 * - xhs/douyin/weibo/zhihu/ks 在 Python 里依赖登录态 + 私有 API，Node 版需要你补齐登录与接口细节。
 */

export const PLATFORM_ADAPTERS = {
  bilibili: {
    id: "bilibili",
    label: "B站",
    search: searchBilibili,
  },
  tieba: {
    id: "tieba",
    label: "贴吧",
    search: searchTieba,
  },
};

export function resolvePlatforms(platformIds) {
  const unique = Array.from(new Set(platformIds));
  const resolved = [];
  const unknown = [];
  for (const id of unique) {
    const adapter = PLATFORM_ADAPTERS[id];
    if (adapter) resolved.push(adapter);
    else unknown.push(id);
  }
  return { resolved, unknown };
}

