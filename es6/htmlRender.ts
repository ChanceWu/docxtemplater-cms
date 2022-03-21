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
  console.log('1 ', Date())
  const browser = await puppeteer.launch();
  console.log('1.3 ', Date())
  const page = await browser.newPage();
  console.log('1.7 ', Date())
  await page.setContent(htmlContent);
  console.log('2 ', Date())

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
