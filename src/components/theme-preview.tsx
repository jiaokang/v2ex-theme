import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs'
import Check from 'lucide-react/icons/check'
import home from '../../scripts/fixtures/v2ex-home.html?raw'
import topic from '../../scripts/fixtures/v2ex-topic.html?raw'
import settings from '../../scripts/fixtures/v2ex-settings.html?raw'

const THEME_STYLE_ID = 'v2ex-theme-override'

const scenes = [
  { id: 'home', label: '首页', html: home },
  { id: 'topic', label: '帖子详情', html: topic },
  { id: 'settings', label: '设置页', html: settings },
]

function previewDocument(html: string, css: string) {
  const styles = css.replace(/<(?=\/style)/gi, '\\3c ')
  return html.replace('</head>', () => `<style id="${THEME_STYLE_ID}">${styles}</style></head>`)
}

function PreviewFrame({
  html,
  css,
  baseline,
  title,
}: {
  html: string
  css: string
  baseline: boolean
  title: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const srcDoc = useMemo(() => previewDocument(html, css), [html, css])

  const syncThemeState = useCallback(() => {
    const style = iframeRef.current?.contentDocument?.getElementById(THEME_STYLE_ID)
    if (style && 'disabled' in style) {
      ;(style as HTMLStyleElement).disabled = baseline
    }
  }, [baseline])

  useEffect(() => {
    syncThemeState()
  }, [syncThemeState])

  return (
    <iframe
      ref={iframeRef}
      className="preview-frame"
      // Allow parent to toggle the injected <style> without reloading srcDoc; scripts remain blocked by sandbox & CSP.
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      title={title}
      srcDoc={srcDoc}
      onLoad={syncThemeState}
    />
  )
}

export function ThemePreview({ name, css }: { name: string; css: string }) {
  const [baseline, setBaseline] = useState(false)

  return (
    <section className="detail-panel" aria-labelledby="preview-title">
      <div className="detail-panel-heading">
        <div>
          <h2 id="preview-title">主题预览</h2>
          <p>使用离线示例内容，不连接 V2EX。</p>
        </div>
      </div>
      <Tabs defaultValue="home" className="preview-tabs">
        <div className="preview-toolbar">
          <TabsList aria-label="预览场景">
            {scenes.map(({ id, label }) => <TabsTab key={id} value={id}>{label}</TabsTab>)}
          </TabsList>
          <label className="preview-baseline-option">
            <Checkbox
              className="preview-checkbox"
              checked={baseline}
              onCheckedChange={(next) => setBaseline(next === true)}
            >
              <CheckboxIndicator className="preview-checkbox-indicator">
                <Check className="preview-checkbox-icon" aria-hidden="true" />
              </CheckboxIndicator>
            </Checkbox>
            <span>查看原版</span>
          </label>
        </div>
        {scenes.map(({ id, label, html }) => (
          <TabsPanel key={id} value={id}>
            <PreviewFrame
              html={html}
              css={css}
              baseline={baseline}
              title={`${baseline ? '原样' : name} · ${label}预览`}
            />
          </TabsPanel>
        ))}
      </Tabs>
    </section>
  )
}
