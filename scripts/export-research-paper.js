/**
 * Export research-paper.html to PDF (Playwright) and Word-friendly HTML.
 * Run from repo root: npm run export-paper
 * Output:
 *   - assets/downloads/JetLagPro_Research_Paper.pdf (open in any viewer)
 *   - assets/downloads/JetLagPro_Research_Paper_for_Word.html (open in Word, then Save As → .docx)
 *
 * We do not use html-to-docx or similar libraries; they produce corrupt/unreadable DOCX.
 * Word opens HTML natively and can save as .docx with full fidelity.
 */

const fs = require('fs');
const path = require('path');
const { createServer } = require('http');

const ROOT = path.resolve(__dirname, '..');
const PAPER_HTML = path.join(ROOT, 'research-paper.html');
const OUT_DIR = path.join(ROOT, 'assets', 'downloads');
const PDF_PATH = path.join(OUT_DIR, 'JetLagPro_Research_Paper.pdf');
const WORD_HTML_PATH = path.join(OUT_DIR, 'JetLagPro_Research_Paper_for_Word.html');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function imageToBase64DataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif' }[ext] || 'image/png';
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function embedImagesInHtml(html, baseDir) {
  let out = html;
  const imgRegex = /<img([^>]*)\ssrc=["']([^"']+)["']/gi;
  out = out.replace(imgRegex, (match, attrs, src) => {
    if (src.startsWith('data:')) return match;
    const absolute = path.resolve(baseDir, src.replace(/\//g, path.sep));
    if (!fs.existsSync(absolute)) return match;
    const dataUrl = imageToBase64DataUrl(absolute);
    return `<img${attrs} src="${dataUrl}"`;
  });
  return out;
}

function embedSvgAsImgInHtml(html) {
  const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
  return html.replace(svgRegex, (svg) => {
    const b64 = Buffer.from(svg, 'utf8').toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${b64}`;
    return `<img src="${dataUrl}" alt="Figure" style="max-width:100%;height:auto;display:block;margin:0 auto;" />`;
  });
}

function extractPaperBody(html) {
  const openTag = /<div\s+class="research-paper"[^>]*>/i;
  const startMatch = html.match(openTag);
  if (!startMatch) return html;
  const start = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = start;
  while (depth > 0 && i < html.length) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return html.slice(start, nextClose).trim();
      i = nextClose + 6;
    }
  }
  return html.slice(start, html.length).trim();
}

/** Remove scripts so the file is safe and Word doesn't try to run anything. */
function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

async function generatePdf() {
  const { chromium } = require('playwright');
  const server = createServer((req, res) => {
    const filePath = req.url === '/' || req.url === '/research-paper.html' ? PAPER_HTML : path.join(ROOT, req.url.replace(/^\//, ''));
    if (!fs.existsSync(filePath) || !filePath.startsWith(ROOT)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(filePath);
    const ct = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(fs.readFileSync(filePath));
  });
  await new Promise((resolve) => server.listen(0, () => resolve()));
  const portActual = server.address().port;
  const baseUrl = `http://127.0.0.1:${portActual}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/research-paper.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => {
    const btn = document.querySelector('.export-button-container');
    if (btn) btn.remove();
  });
  ensureDir(OUT_DIR);
  await page.pdf({
    path: PDF_PATH,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground: true,
  });
  await browser.close();
  server.close();
  console.log('PDF written:', PDF_PATH);
}

async function generateWordHtml() {
  let html = fs.readFileSync(PAPER_HTML, 'utf8');
  html = embedImagesInHtml(html, ROOT);
  html = embedSvgAsImgInHtml(html);
  const paperBody = extractPaperBody(html);
  if (!paperBody || paperBody.length < 100) {
    throw new Error('extractPaperBody returned too little content (length ' + (paperBody ? paperBody.length : 0) + ')');
  }
  const bodyNoScripts = stripScripts(paperBody);

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JetLagPro Research Paper</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; font-size: 12pt; }
    h1 { text-align: center; margin-bottom: 20px; font-size: 18pt; }
    h2 { font-size: 14pt; font-weight: bold; margin-top: 30px; margin-bottom: 15px; }
    h3, h4 { margin-top: 20px; margin-bottom: 10px; }
    p { margin-bottom: 15px; }
    table { border-collapse: collapse; margin: 20px 0; width: 100%; }
    th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    img { max-width: 100%; height: auto; display: block; margin: 15px auto; }
    .abstract { background: #f8f9fa; padding: 20px; margin-bottom: 30px; }
    ul, ol { margin: 15px 0; padding-left: 25px; }
    li { margin-bottom: 6px; }
    caption { font-weight: bold; padding: 10px 0; text-align: center; }
  </style>
</head>
<body>
${bodyNoScripts}
</body>
</html>`;

  ensureDir(OUT_DIR);
  fs.writeFileSync(WORD_HTML_PATH, fullHtml, 'utf8');
  console.log('Word-friendly HTML written:', WORD_HTML_PATH);
  console.log('  → Open in Microsoft Word, then File → Save As → Word Document (.docx)');
}

async function main() {
  if (!fs.existsSync(PAPER_HTML)) {
    console.error('Not found:', PAPER_HTML);
    process.exit(1);
  }
  ensureDir(OUT_DIR);
  await generateWordHtml();
  await generatePdf();
  console.log('Done. PDF: assets/downloads/JetLagPro_Research_Paper.pdf');
  console.log('      Word: assets/downloads/JetLagPro_Research_Paper_for_Word.html (open in Word, Save As .docx)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
