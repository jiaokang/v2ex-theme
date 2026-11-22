// @vitest-environment node
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, expect, test } from 'vitest'
import {
  type LikeDatabase,
  type LikeStatement,
  readLikeCounts,
  readThemeLike,
  sortByLikes,
  writeThemeLike,
} from './likes-store'

// A minimal D1-shaped adapter over node:sqlite, running the real migration.
function createDatabase(): LikeDatabase {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync('migrations/0001_likes.sql', 'utf8'))
  const statement = (query: string, params: unknown[] = []): LikeStatement & { run(): unknown[] } => ({
    bind: (...values) => statement(query, values),
    first: async <T,>() => (sqlite.prepare(query).get(...(params as never[])) ?? null) as T | null,
    all: async <T,>() => ({ results: sqlite.prepare(query).all(...(params as never[])) as T[] }),
    run: () => (/^\s*select/i.test(query) ? sqlite.prepare(query).all(...(params as never[])) : (sqlite.prepare(query).run(...(params as never[])), [])),
  })
  return {
    prepare: query => statement(query),
    batch: async <T,>(statements: LikeStatement[]) => {
      sqlite.exec('BEGIN')
      try {
        const results = statements.map(s => ({ results: (s as ReturnType<typeof statement>).run() as T[] }))
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  }
}

let db: LikeDatabase
beforeEach(() => {
  db = createDatabase()
})

test('同一访客重复点赞只计一次，取消后计数回落', async () => {
  expect(await writeThemeLike(db, 'geist', 'alice', true)).toEqual({ count: 1, liked: true })
  expect(await writeThemeLike(db, 'geist', 'alice', true)).toEqual({ count: 1, liked: true })
  expect(await writeThemeLike(db, 'geist', 'bob', true)).toEqual({ count: 2, liked: true })
  expect(await writeThemeLike(db, 'geist', 'alice', false)).toEqual({ count: 1, liked: false })
  expect(await writeThemeLike(db, 'geist', 'alice', false)).toEqual({ count: 1, liked: false })
})

test('读取单个主题时区分访客是否赞过，没有访客 ID 时视为未赞', async () => {
  await writeThemeLike(db, 'claude', 'alice', true)
  expect(await readThemeLike(db, 'claude', 'alice')).toEqual({ count: 1, liked: true })
  expect(await readThemeLike(db, 'claude', 'bob')).toEqual({ count: 1, liked: false })
  expect(await readThemeLike(db, 'claude', null)).toEqual({ count: 1, liked: false })
  expect(await readThemeLike(db, 'platinum', null)).toEqual({ count: 0, liked: false })
})

test('首页计数只包含大于零的主题', async () => {
  await writeThemeLike(db, 'geist', 'alice', true)
  await writeThemeLike(db, 'geist', 'bob', true)
  await writeThemeLike(db, 'claude', 'alice', true)
  await writeThemeLike(db, 'claude', 'alice', false)
  expect(await readLikeCounts(db)).toEqual({ geist: 2 })
})

test('按点赞数降序排列，同票保持原有顺序', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  expect(sortByLikes(items, { c: 5, b: 1, d: 1 }).map(({ id }) => id)).toEqual(['c', 'b', 'd', 'a'])
})
