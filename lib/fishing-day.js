import { getLocalHour, getTodayKey } from './time.js';
import { getSegmentedReturnedCasts, isSegmentedCastReturnEnabled } from './user.js';

export const DEFAULT_DAILY_RESET_HOUR = 0;
export const SEGMENTED_CAST_RETURN_EXTRA_TICKET_HOUR = 16;

export function normalizeDailyResetHour(value, fallback = DEFAULT_DAILY_RESET_HOUR) {
  const hour = Math.floor(Number(value));
  if (!Number.isFinite(hour)) return fallback;
  return Math.max(0, Math.min(23, hour));
}

export function parseDailyResetHour(input = '') {
  const text = String(input || '').trim();
  const match = text.match(/(?:^|\s)([01]?\d|2[0-3])(?:(?:\s*[:：]\s*00)|\s*(?:点|时|:00|：00|h)?)\s*$/i);
  if (!match) return null;
  return normalizeDailyResetHour(match[1]);
}

export function parseOnOffToggle(input = '') {
  const text = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\s　:：,，。.!！?？、_\-\\/]+/g, '');
  if (!text || /^(?:状态|查看|查询|帮助|说明|怎么用|开关|当前|help)$/.test(text)) return null;
  if (/^(?:off|close|closed|false|0|no|n|关|关闭|关掉|关了|停用|禁用|取消|停止|不要|不用|不开)/.test(text)) return false;
  if (/^(?:on|open|opened|true|1|yes|y|开|开启|打开|启用|启动|使用|要|需要)/.test(text)) return true;
  return null;
}

export function getDailyResetHour(config = {}) {
  return normalizeDailyResetHour(config?.dailyResetHour, DEFAULT_DAILY_RESET_HOUR);
}

export function getFishingDayKey(config = {}, date = new Date()) {
  const resetHour = getDailyResetHour(config);
  const shifted = new Date(date.getTime() - resetHour * 60 * 60 * 1000);
  return getTodayKey(shifted);
}

export function getHoursSinceFishingDayReset(config = {}, date = new Date()) {
  const resetHour = getDailyResetHour(config);
  const currentHour = getLocalHour(date);
  return (currentHour - resetHour + 24) % 24;
}

export function getFishingUsageOptions(config = {}, options = {}) {
  return {
    elapsedHours: getHoursSinceFishingDayReset(config),
    ignoreSegments: Boolean(options.ignoreSegments)
  };
}

export function getFastFishingUsageOptions(config = {}) {
  const options = getFishingUsageOptions(config, { ignoreSegments: true });
  options.elapsedHours = getHoursSinceFishingDayReset(config);
  return options;
}

export function getSegmentedCastReturnStatusText(config, totalLimit, options = {}) {
  if (!isSegmentedCastReturnEnabled(config)) return '分段返还：关闭';
  const elapsedHours = options.elapsedHours ?? getHoursSinceFishingDayReset(config);
  const returned = getSegmentedReturnedCasts(totalLimit, elapsedHours);
  const resetHour = getDailyResetHour(config);
  const at0 = `${resetHour}:00`;
  const at6 = `${(resetHour + 6) % 24}:00`;
  const at12 = `${(resetHour + 12) % 24}:00`;
  const at16 = `${(resetHour + SEGMENTED_CAST_RETURN_EXTRA_TICKET_HOUR) % 24}:00`;
  return `分段返还：开启，当前已返还 ${returned}/${totalLimit} 次（${at0}、${at6}、${at12}；${at16} 后可用钓鱼券）`;
}
