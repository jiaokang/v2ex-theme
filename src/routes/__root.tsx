import '@ui-sdk/core/web.css'
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'

import { ThemeModeToggle, colorModeInitScript } from '../components/theme-mode-toggle'
import { siteDescription, siteName } from '../site'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: `${siteName} · 社区主题图册`,
      },
      {
        name: 'description',
        content: siteDescription,
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: colorModeInitScript }} />
      </head>
      <body>
        <header className="site-topbar">
          <div className="site-topbar-inner">
            <Link className="site-brand" to="/" activeOptions={{ exact: true }}>
              <span className="site-mark" aria-hidden="true">V</span>
              {siteName}
            </Link>
            <div className="site-topbar-end">
              <nav className="site-nav" aria-label="主题导航">
                <span role="link" aria-disabled="true">提交主题</span>
                <span role="link" aria-disabled="true">创作主题</span>
              </nav>
              <ThemeModeToggle />
            </div>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="site-footer-main">
              <div className="site-footer-about">
                <strong>{siteName}</strong>
                <p>{siteDescription}</p>
              </div>
              <nav className="site-footer-nav" aria-label="页脚导航">
                <div className="site-footer-group">
                  <span>图册</span>
                  <ul>
                    <li><Link to="/" hash="theme-catalog">全部主题</Link></li>
                  </ul>
                </div>
                <div className="site-footer-group">
                  <span>项目</span>
                  <ul>
                    <li>
                      <a href="https://github.com/yuyinws/v2ex-theme">
                        GitHub<ArrowUpRight className="ui-icon" aria-hidden="true" />
                      </a>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
            <div className="site-footer-bottom">
              <p>独立主题图册，与 V2EX 官方无关。</p>
            </div>
          </div>
        </footer>

        <Scripts />
      </body>
    </html>
  )
}
