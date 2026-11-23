import { Link } from '@tanstack/react-router'
import ArrowRight from 'lucide-react/icons/arrow-right'
import Heart from 'lucide-react/icons/heart'
import type { ThemeSummary } from '../themes'

export function ThemeCardGrid({
  themes,
  counts,
}: {
  themes: ThemeSummary[]
  counts: Record<string, number> | null
}) {
  return (
    <div className="theme-grid">
      {themes.map(({ id, name, author, description }) => (
        <Link
          key={id}
          className="theme-card"
          to="/t/$slug"
          params={{ slug: id }}
          aria-labelledby={`theme-name-${id}`}
        >
          <div className="theme-card-media">
            <img
              src={`/theme-previews/${id}.webp`}
              alt={`${name} 主题的 V2EX 首页样张`}
              width={1000}
              height={580}
            />
          </div>
          <div className="theme-card-info">
            <h3 id={`theme-name-${id}`}>{name}</h3>
            <p>{description}</p>
            <div className="theme-card-meta">
              <span>作者：<span className="theme-card-author">{author}</span></span>
              <span className="theme-card-end">
                {counts && (
                  <span className="theme-card-likes">
                    <Heart className="ui-icon" aria-hidden="true" />
                    {counts[id] ?? 0}
                    <span className="visually-hidden"> 个赞</span>
                  </span>
                )}
                <ArrowRight className="ui-icon theme-card-arrow" aria-hidden="true" />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
