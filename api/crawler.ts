import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

export async function crawlUrl(url: string): Promise<any> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  
  const results = await new AxeBuilder({ page }).analyze();
  await browser.close();
  
  return results;
}