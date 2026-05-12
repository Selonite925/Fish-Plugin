import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  BACKGROUND_DIR,
  PANEL_PADDING,
  PANEL_SECTION_LINE_HEIGHT,
  PANEL_WIDTH,
  TEMPLATE_DIR
} from './constants.js';
import { ensureGeneratedDir, getBackgroundFiles } from './storage.js';

let puppeteerRendererPromise = null;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizePanelSections(sections = []) {
  return sections.map((section, index) => {
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      const type = String(section.type || 'item');
      return {
        index,
        type,
        text: section.text == null ? '' : String(section.text),
        html: section.html == null ? '' : String(section.html),
        title: section.title == null ? '' : String(section.title),
        titleStyle: section.titleStyle == null ? '' : String(section.titleStyle)
      };
    }
    const text = String(section);
    const trimmed = text.trim();
    let type = 'item';
    if (!trimmed) type = 'spacer';
    else if (!/[：:|#]/.test(trimmed) && trimmed.length <= 18) type = 'heading';
    else if (/^[•\[]/.test(trimmed)) type = 'fish';
    return { index, text, type, html: '', title: '', titleStyle: '' };
  });
}

function pickBackgroundFile() {
  const files = getBackgroundFiles();
  if (!files.length) return null;
  return files[Math.floor(Math.random() * files.length)];
}

function ensureTemplateFile() {
  ensureGeneratedDir();
  const file = path.join(TEMPLATE_DIR, 'panel.html');

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}}</title>
  <style>
    * { box-sizing: border-box; }
    html {
      width: ${PANEL_WIDTH}px;
      min-height: 100%;
      margin: 0;
      background: #0a1325;
      overflow: hidden;
    }
    body {
      margin: 0;
      width: ${PANEL_WIDTH}px;
      min-height: 720px;
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      color: #111827;
      background: #ffffff;
      overflow: hidden;
    }
    body.has-bg {
      color: #f6fbff;
      background-color: #0a1325;
      background-image:
        linear-gradient(rgba(8, 14, 24, 0.58), rgba(8, 14, 24, 0.78)),
        var(--panel-bg);
      background-size: 100% 100%, 100% auto;
      background-position: center, top center;
      background-repeat: no-repeat, repeat-y;
    }
    .page {
      width: 100%;
      min-height: 720px;
      padding: 24px;
    }
    .shell {
      min-height: 672px;
      border-radius: 18px;
      border: 1px solid rgba(15, 23, 42, 0.10);
      background: rgba(255,255,255,0.96);
      box-shadow: 0 12px 48px rgba(15, 23, 42, 0.10);
      padding: 44px 48px 32px;
    }
    body.has-bg .shell {
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(7, 12, 20, 0.56);
      box-shadow: 0 12px 48px rgba(0,0,0,0.26);
    }
    .title {
      margin: 0;
      font-size: 46px;
      line-height: 1.1;
      font-weight: 700;
    }
    .subtitle {
      margin-top: 14px;
      color: #475569;
      font-size: 22px;
      line-height: 1.5;
    }
    body.has-bg .subtitle {
      color: #b6c9e8;
    }
    .card {
      margin-top: 24px;
      border-radius: 8px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: #f8fafc;
      padding: ${PANEL_PADDING - 12}px ${PANEL_PADDING - 10}px;
    }
    body.has-bg .card {
      border: 1px solid rgba(255,255,255,0.08);
      background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
    }
    .line {
      min-height: ${PANEL_SECTION_LINE_HEIGHT}px;
      font-size: 24px;
      line-height: 1.45;
      color: #111827;
      word-break: break-word;
      white-space: pre-wrap;
      padding: 6px 12px;
      border-radius: 8px;
    }
    body.has-bg .line {
      color: #eaf2ff;
    }
    .line + .line {
      margin-top: 6px;
    }
    .line.item,
    .line.fish {
      background: rgba(255,255,255,0.62);
      border: 1px solid rgba(15, 23, 42, 0.06);
    }
    body.has-bg .line.item,
    body.has-bg .line.fish {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.08);
    }
    .line.heading {
      min-height: 30px;
      margin-top: 14px;
      padding: 0 4px 4px;
      color: #0f766e;
      font-size: 22px;
      font-weight: 700;
      border-bottom: 1px solid rgba(15, 118, 110, 0.24);
    }
    .line.heading:first-child {
      margin-top: 0;
    }
    body.has-bg .line.heading {
      color: #7dd3fc;
      border-bottom-color: rgba(125, 211, 252, 0.28);
    }
    .line.spacer {
      min-height: 10px;
      padding: 0;
      margin-top: 0;
    }
    .line.collection {
      padding: 0;
      background: transparent;
      border: none;
      min-height: auto;
    }
    .collection-title {
      margin: 14px 0 10px;
      padding: 0 4px 4px;
      font-size: 24px;
      font-weight: 700;
      color: var(--collection-text, #0f172a);
      border-bottom: 1px solid var(--collection-accent-soft, rgba(15, 23, 42, 0.12));
    }
    .collection-title:first-child {
      margin-top: 0;
    }
    .collection-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 2px 0 2px;
    }
    .collection-chip {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 5px 12px;
      border-radius: 999px;
      border: 1px dashed rgba(148, 163, 184, 0.46);
      background: rgba(226, 232, 240, 0.52);
      color: #94a3b8;
      font-size: 20px;
      line-height: 1.2;
    }
    .collection-chip.owned {
      border-style: solid;
      background: var(--chip-bg, rgba(255,255,255,0.9));
      border-color: var(--chip-border, rgba(15, 23, 42, 0.12));
      color: var(--chip-color, #111827);
      box-shadow: inset 0 0 0 1px var(--chip-shadow, rgba(255,255,255,0));
      font-weight: 700;
    }
    body.has-bg .collection-chip {
      border-color: rgba(148, 163, 184, 0.38);
      background: rgba(15, 23, 42, 0.34);
      color: #8fa2bf;
    }
    body.has-bg .collection-chip.owned {
      color: var(--chip-color, #f8fafc);
      box-shadow: inset 0 0 0 1px var(--chip-shadow, rgba(255,255,255,0.08));
    }
    .footer {
      margin-top: 22px;
      color: #64748b;
      font-size: 20px;
      line-height: 1.5;
    }
    body.has-bg .footer {
      color: #90a8c9;
    }
    .watermark {
      margin-top: 14px;
      text-align: right;
      color: rgba(100, 116, 139, 0.72);
      font-size: 15px;
      line-height: 1.4;
    }
    body.has-bg .watermark {
      color: rgba(203, 213, 225, 0.68);
    }
  </style>
</head>
  <body class="{{bodyClass}}" style="{{bodyStyle}}">
  <div class="page">
    <div class="shell">
      <h1 class="title">{{title}}</h1>
      <div class="subtitle">{{subtitle}}</div>
      <div class="card">
        {{each sections section}}
        {{if section.type === 'collection'}}
        <div class="line collection">
          <div class="collection-title" style="{{section.titleStyle}}">{{section.title}}</div>
          {{@ section.html}}
        </div>
        {{else}}
        <div class="line {{section.type}}">{{section.text}}</div>
        {{/if}}
        {{/each}}
      </div>
      <div class="footer">{{footer}}</div>
      <div class="watermark">Fish-Plugin 作者QQ：2691431889</div>
    </div>
  </div>
</body>
</html>`;

  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) {
    fs.writeFileSync(file, html, 'utf8');
  }
  return file;
}

function getTemplateFile() {
  const file = ensureTemplateFile();
  const relative = path.relative(process.cwd(), file).replace(/\\/g, '/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function normalizeSaveId(text = 'panel') {
  const value = String(text).trim() || 'panel';
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
}

async function getRenderer() {
  if (!puppeteerRendererPromise) {
    puppeteerRendererPromise = import('../../../lib/puppeteer/puppeteer.js')
      .then(mod => mod.default || mod)
      .catch(() => null);
  }
  return puppeteerRendererPromise;
}

function createRenderPayload(panel) {
  const backgroundFile = pickBackgroundFile();
  return {
    title: panel.title,
    subtitle: panel.subtitle || '',
    footer: panel.footer || '',
    sections: normalizePanelSections(panel.sections),
    tplFile: getTemplateFile(),
    saveId: normalizeSaveId(panel.key || panel.title || 'panel'),
    background: backgroundFile ? pathToFileURL(backgroundFile).href : '',
    bodyClass: backgroundFile ? 'has-bg' : '',
    bodyStyle: backgroundFile ? `--panel-bg: url(${pathToFileURL(backgroundFile).href});` : '',
    pageGotoParams: { waitUntil: 'networkidle0' },
    viewport: {
      width: PANEL_WIDTH,
      height: Math.max(720, 260 + (panel.sections?.length || 0) * PANEL_SECTION_LINE_HEIGHT)
    }
  };
}

async function tryRendererScreenshot(renderer, panel) {
  const payload = createRenderPayload(panel);
  const candidates = [['Fish-plugin/panel', payload]];

  for (const [name, data] of candidates) {
    try {
      const img = await renderer.screenshot(name, data);
      if (img) return img;
    } catch {}
  }

  return null;
}

export async function replyWithPanel(ctx, panel, fallbackText) {
  try {
    const renderer = await getRenderer();
    if (renderer?.screenshot) {
      const img = await tryRendererScreenshot(renderer, panel);
      if (img) {
        await ctx.reply(img);
        return;
      }
    }
  } catch {}

  await ctx.reply(fallbackText);
}

export function ensureResourceDirs() {
  ensureGeneratedDir();
  if (!fs.existsSync(BACKGROUND_DIR)) {
    fs.mkdirSync(BACKGROUND_DIR, { recursive: true });
  }
  ensureTemplateFile();
}
