export function parseRodIndex(keyword = '') {
  const compact = String(keyword || '').replace(/\s+/g, '');
  if (/^(?:0|默认|默认鱼竿|新手|新手竿|新手杆|新手竹竿)$/.test(compact)) return 'default';
  const match = compact.match(/^(?:鱼竿|鱼杆|竿|杆)?(\d{1,3})$/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return Number.isInteger(index) && index >= 0 ? index : null;
}

export function parseBaitIndex(keyword = '') {
  const compact = String(keyword || '').replace(/\s+/g, '');
  if (/^(?:0|默认|默认鱼饵|清水|清水饵|清水团饵)$/.test(compact)) return 'default';
  const match = compact.match(/^(?:鱼饵|饵料|饵)?(\d{1,3})$/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return Number.isInteger(index) && index >= 0 ? index : null;
}

export function parseLegendaryCraftTarget(text = '') {
  const compact = String(text || '').replace(/\s+/g, '');
  const body = compact.replace(/^#炼竿/, '');
  if (!body) return null;
  if (/^\d{1,3}$/.test(body)) {
    return { mode: 'tank_index', index: Number(body) - 1 };
  }
  const match = body.match(/^(.*?)(\d{1,3})?$/);
  const fishName = String(match?.[1] || '').trim();
  const duplicateIndex = match?.[2] ? Number(match[2]) - 1 : 0;
  if (!fishName) return null;
  return { mode: 'legendary_name', fishName, duplicateIndex };
}

export function parseLegendaryPreviewTarget(text = '') {
  const body = String(text || '').replace(/^#炼竿预览\s*/, '').trim();
  if (!body) return null;
  return parseLegendaryCraftTarget(`#炼竿 ${body}`);
}

export function parseMarketPurchaseKeyword(keyword = '') {
  const text = String(keyword || '').trim();
  const compact = text.replace(/\s+/g, '');
  const match =
    text.match(/^(.*?)\s+(\d{1,3})(?:包|份|个)?$/) ||
    compact.match(/^(.*?)[*xX×](\d{1,3})(?:包|份|个)?$/) ||
    compact.match(/^(.*?)(?:包|份|个)(\d{1,3})$/) ||
    compact.match(/^(.*?)(?:包|份|个)$/);
  if (!match) return { keyword: text, compactKeyword: compact, quantity: 1 };
  const quantity = Number(match[2] || 1);
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const itemCompactKeyword = match[1];
  if (!itemCompactKeyword) return null;
  return { keyword: itemCompactKeyword, compactKeyword: itemCompactKeyword, quantity };
}

export function parseAutoRenewBaitToggle(keyword = '') {
  const text = String(keyword || '')
    .trim()
    .toLowerCase()
    .replace(/[\s　:：,，。.!！?？、_\-\\/]+/g, '');
  if (!text || /^(?:状态|查看|查询|帮助|说明|怎么用|开关|当前|help)$/.test(text)) return null;
  if (/^(?:off|close|closed|false|0|no|n|关|关闭|关掉|关了|停用|禁用|取消|停止|不要|不用|不开|不续)/.test(text)) return false;
  if (/^(?:on|open|opened|true|1|yes|y|开|开启|打开|启用|启动|使用|要|需要|续|自动|自动续|自动续饵|续饵)/.test(text)) return true;
  return null;
}

export function extractAutoRenewBaitKeyword(msg = '') {
  const text = String(msg || '').trim();
  const match = text.match(/^#\s*(?:自动\s*续\s*(?:鱼)?饵?|续\s*(?:鱼)?饵|(?:鱼饵|换饵)\s*自动\s*续(?:饵)?|自动\s*(?:换|补)\s*(?:鱼)?饵)\s*(.*)$/);
  return match ? match[1].trim() : text.replace(/^#\s*/, '').trim();
}

export function getAutoRenewBaitUsageText() {
  return '格式：#自动续饵开 / #自动续饵关；也可用 #续饵 开 / #鱼饵自动续 关闭';
}
