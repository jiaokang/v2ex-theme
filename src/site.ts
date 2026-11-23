export const siteName = 'V2EX Theme Hub'
export const siteTitle = `${siteName} · 社区主题库`
export const siteDescription = '挑一套主题，定义你的 V2EX。'

export const ogImagePath = '/og-image.png'
export const ogImageWidth = '1200'
export const ogImageHeight = '630'
export const ogImageAlt = `${siteName} — ${siteDescription}`

export function resolveSiteUrl(path: string, origin?: string) {
  if (origin && /^https?:\/\//i.test(origin)) {
    return new URL(path, origin).toString()
  }
  return path
}

export function createSocialMeta({
  title,
  description,
  origin,
  pathname,
}: {
  title: string
  description: string
  origin?: string
  pathname?: string
}) {
  const imageUrl = resolveSiteUrl(ogImagePath, origin)
  const pageUrl = pathname && origin && /^https?:\/\//i.test(origin)
    ? resolveSiteUrl(pathname, origin)
    : undefined

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { property: 'og:locale', content: 'zh_CN' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    ...(pageUrl ? [{ property: 'og:url', content: pageUrl }] : []),
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: ogImageWidth },
    { property: 'og:image:height', content: ogImageHeight },
    { property: 'og:image:alt', content: ogImageAlt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: ogImageAlt },
  ]
}
