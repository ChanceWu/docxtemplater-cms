import puppeteer from 'puppeteer';

export async function renderUrl(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 0,
  });
}

export async function renderHtmlContent(htmlContent: string) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent);

  return await saveScreenshot(page, browser);
}

async function saveScreenshot(
  page: puppeteer.Page,
  browser: puppeteer.Browser,
) {
  // await page.setViewport({
  //   width: 1920,
  //   height: 1080,
  // });
  const buffer = await page.screenshot({
    fullPage: true,
    encoding: 'binary',
  });

  await browser.close();

  return buffer as Buffer;
}
