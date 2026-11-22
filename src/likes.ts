import { createServerFn } from '@tanstack/react-start'
import { getCookie, getRequestHeader, setCookie } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { readLikeCounts, readThemeLike, writeThemeLike } from './server/likes-store'
import { themes } from './themes'

export type { LikeCounts, ThemeLike } from './server/likes-store'

export const RATE_LIMITED = 'RATE_LIMITED'

const VISITOR_COOKIE = 'v2ex_theme_vid'
const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function parseSlug(input: unknown) {
  const slug = (input as { slug?: unknown } | null)?.slug
  if (typeof slug !== 'string' || !themes.some(({ id }) => id === slug)) throw new Error('Unknown theme')
  return slug
}

function readVisitorId() {
  const id = getCookie(VISITOR_COOKIE)
  return id && VISITOR_ID.test(id) ? id : null
}

function ensureVisitorId() {
  const existing = readVisitorId()
  if (existing) return existing
  const id = crypto.randomUUID()
  setCookie(VISITOR_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return id
}

// Stores only an HMAC of the cookie, so a leaked table can't be replayed as cookies.
async function voterFor(visitorId: string) {
  if (!env.LIKE_SECRET) throw new Error('LIKE_SECRET is not configured')
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.LIKE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(visitorId))
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('')
}

export const getLikeCounts = createServerFn({ method: 'GET' }).handler(() => readLikeCounts(env.DB))

export const getThemeLike = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => ({ slug: parseSlug(input) }))
  .handler(async ({ data: { slug } }) => {
    const visitorId = readVisitorId()
    return readThemeLike(env.DB, slug, visitorId ? await voterFor(visitorId) : null)
  })

export const setThemeLike = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; liked: boolean }) => {
    if (typeof input?.liked !== 'boolean') throw new Error('Invalid like state')
    return { slug: parseSlug(input), liked: input.liked }
  })
  .handler(async ({ data: { slug, liked } }) => {
    const ip = getRequestHeader('cf-connecting-ip') ?? 'unknown'
    const { success } = await env.LIKE_LIMITER.limit({ key: ip })
    if (!success) throw new Error(RATE_LIMITED)
    const voter = await voterFor(ensureVisitorId())
    return writeThemeLike(env.DB, slug, voter, liked)
  })
