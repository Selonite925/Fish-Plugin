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
