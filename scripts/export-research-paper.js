/**
 * Export research-paper.html to PDF (Playwright).
 * Run from repo root: npm run export-paper
 * Output:
 *   - assets/downloads/JetLagPro_Research_Paper.pdf (open in any viewer)
 */

const fs = require('fs');
const path = require('path');
const { createServer } = require('http');

const ROOT = path.resolve(__dirname, '..');
const PAPER_HTML = path.join(ROOT, 'research-paper.html');
const OUT_DIR = path.join(ROOT, 'assets', 'downloads');
const PDF_PATH = path.join(OUT_DIR, 'JetLagPro_Research_Paper.pdf');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

async function main() {
  if (!fs.existsSync(PAPER_HTML)) {
    console.error('Not found:', PAPER_HTML);
    process.exit(1);
  }
  ensureDir(OUT_DIR);
  await generatePdf();
  console.log('Done. PDF: assets/downloads/JetLagPro_Research_Paper.pdf');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
