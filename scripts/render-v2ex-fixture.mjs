import { readFile } from 'node:fs/promises'

export async function renderV2exFixture(page, scene, theme) {
  const [sample, themeCss] = await Promise.all([
    readFile(new URL(`fixtures/v2ex-${scene}.html`, import.meta.url), 'utf8'),
    readFile(new URL(`../public/themes/${theme}/theme.css`, import.meta.url), 'utf8'),
  ])
  await page.setContent(sample)
  await page.evaluate(async ({ themeCss }) => {
    const style = document.createElement('style')
    style.textContent = themeCss
    document.head.append(style)
    await document.fonts.ready
  }, { themeCss })
}
