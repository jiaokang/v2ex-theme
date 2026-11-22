import { glob, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { renderV2exFixture } from './render-v2ex-fixture.mjs'

const root = new URL('../', import.meta.url)
const output = new URL('public/theme-previews/', root)
const themes = []
for await (const file of glob('*/theme.json', { cwd: fileURLToPath(new URL('public/themes/', root)) })) {
  themes.push(dirname(file))
}

await mkdir(output, { recursive: true })
const browser = await chromium.launch()

try {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 580 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'zh-CN',
    offline: true,
  })
  await context.route('**/*', (route) => route.abort())

  for (const theme of themes.sort()) {
    const page = await context.newPage()
    await renderV2exFixture(page, 'home', theme)
    const png = await page.screenshot({ animations: 'disabled' })
    const { size } = await sharp(png)
      .webp({ quality: 88 })
      .toFile(fileURLToPath(new URL(`${theme}.webp`, output)))
    console.log(`public/theme-previews/${theme}.webp (${size} bytes)`)
    await page.close()
  }
} finally {
  await browser.close()
}
