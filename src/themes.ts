export type ThemeSummary = {
  id: string
  name: string
  author: string
  description: string
}

type ThemeMetadata = {
  name: string
  author: string
  description: string
}

const metadata = import.meta.glob<ThemeMetadata>('../public/themes/*/theme.json', {
  eager: true,
  import: 'default',
})

export const themes: ThemeSummary[] = Object.keys(metadata).sort().map((path) => {
  const [id] = path.split('/').slice(-2)
  const { name, author, description } = metadata[path]
  return { id, name, author, description }
})
