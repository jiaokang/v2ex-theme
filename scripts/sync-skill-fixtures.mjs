import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync, gunzipSync } from 'node:zlib'

const ROOT = new URL('../', import.meta.url)
const SRC_DIR = new URL('scripts/fixtures/', ROOT)
const DEST_DIR = new URL('skills/v2ex-theme/fixtures/', ROOT)
const SCENES = ['home', 'topic', 'settings']
const STYLE_RE = /<style[^>]*>[\s\S]*?<\/style>/g

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

const originals = new Map(
  await Promise.all(
    SCENES.map(async (scene) => [
      scene,
      await readFile(new URL(`v2ex-${scene}.html`, SRC_DIR), 'utf8'),
    ]),
  ),
)

// Collect <style> blocks present in every scene so duplicated V2EX base CSS/fonts are stored once.
const styleSets = SCENES.map((scene) => {
  const map = new Map()
  for (const [block] of originals.get(scene).matchAll(STYLE_RE)) {
    const hash = sha256(block)
    if (!map.has(hash)) map.set(hash, block)
  }
  return map
})

const sharedBlocks = []
const hashToIndex = new Map()
for (const [hash, block] of styleSets[0]) {
  if (styleSets.every((set) => set.has(hash))) {
    hashToIndex.set(hash, sharedBlocks.length)
    sharedBlocks.push(block)
  }
}

assert.ok(sharedBlocks.length > 0, '未找到三份快照共享的 <style> 块')

await mkdir(DEST_DIR, { recursive: true })

const sharedPayload = gzipSync(Buffer.from(JSON.stringify(sharedBlocks), 'utf8'), { level: 9 })
await writeFile(new URL('shared-styles.json.gz', DEST_DIR), sharedPayload)

let totalOut = sharedPayload.length
let totalIn = 0

for (const scene of SCENES) {
  const html = originals.get(scene)
  totalIn += Buffer.byteLength(html, 'utf8')
  assert.ok(!html.includes('<!--V2EX_SHARED_STYLE:'), `${scene} 包含冲突的占位标记`)

  const skeleton = html.replace(STYLE_RE, (block) => {
    const idx = hashToIndex.get(sha256(block))
    return idx === undefined ? block : `<!--V2EX_SHARED_STYLE:${idx}-->`
  })

  // Verify lossless round-trip before writing.
  const roundTrip = skeleton.replace(
    /<!--V2EX_SHARED_STYLE:(\d+)-->/g,
    (_, idx) => sharedBlocks[Number(idx)],
  )
  assert.equal(roundTrip, html, `${scene} 去重还原校验失败`)

  const compressed = gzipSync(Buffer.from(skeleton, 'utf8'), { level: 9 })
  assert.equal(gunzipSync(compressed).toString('utf8'), skeleton)
  await writeFile(new URL(`v2ex-${scene}.html.gz`, DEST_DIR), compressed)
  totalOut += compressed.length
  console.log(`skills/v2ex-theme/fixtures/v2ex-${scene}.html.gz (${compressed.length} bytes)`)
}

console.log(
  `skills/v2ex-theme/fixtures/shared-styles.json.gz (${sharedPayload.length} bytes) — total ${(totalOut / 1024).toFixed(1)} KB from ${(totalIn / 1024).toFixed(1)} KB`,
)
