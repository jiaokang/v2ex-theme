import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const root = new URL('../', import.meta.url)
const rootDir = fileURLToPath(root)
const outputPath = fileURLToPath(new URL('public/og-image.png', root))

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function waitForServer(url, child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Dev server exited early with code ${child.exitCode}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Server still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const port = await findFreePort()
const url = `http://127.0.0.1:${port}/`
const serverLogs = []
const server = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('node_modules/vite/bin/vite.js', root)),
    'dev',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

server.stdout.on('data', (chunk) => serverLogs.push(chunk.toString()))
server.stderr.on('data', (chunk) => serverLogs.push(chunk.toString()))

let browser
try {
  await waitForServer(url, server)
  browser = await chromium.launch()

  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'zh-CN',
  })

  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    await document.fonts.ready
    const images = Array.from(document.querySelectorAll('img'))
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true })
              img.addEventListener('error', resolve, { once: true })
            }),
      ),
    )
  })

  const png = await page.screenshot({ animations: 'disabled' })
  const { size } = await sharp(png)
    .resize(1200, 630, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath)

  console.log(`public/og-image.png (1200x630, ${size} bytes)`)
} catch (error) {
  if (serverLogs.length > 0) {
    console.error(serverLogs.join(''))
  }
  throw error
} finally {
  await browser?.close()
  if (server.exitCode === null) {
    server.kill('SIGTERM')
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (server.exitCode === null) server.kill('SIGKILL')
        resolve()
      }, 3000)
      server.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }
}
