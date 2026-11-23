import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@ui-sdk/react/button'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@ui-sdk/react/dialog'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import Check from 'lucide-react/icons/check'
import Code from 'lucide-react/icons/code'
import Copy from 'lucide-react/icons/copy'
import X from 'lucide-react/icons/x'

export function GetThemeDialog({ slug, name }: { slug: string; name: string }) {
  const [origin, setOrigin] = useState('')
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const guideTitleId = useId()

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const snippet = `@import url(${origin}/themes/${slug}/theme.css)`

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setStatus('已复制到剪贴板。')
    } catch {
      setCopied(false)
      setStatus('复制失败，请手动选择复制。')
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false)
          setStatus('')
        }
      }}
    >
      <DialogTrigger className="detail-control detail-primary">
        <Code className="ui-icon" aria-hidden="true" />
        获取主题
      </DialogTrigger>
      <DialogBackdrop className="theme-dialog-backdrop" />
      <DialogContent
        className="theme-dialog-content"
        initialFocus={() => copyButtonRef.current}
      >
        <div className="theme-dialog-header">
          <div className="theme-dialog-heading">
            <DialogTitle className="theme-dialog-title">获取主题</DialogTitle>
            <DialogDescription className="theme-dialog-description">
              复制下方 CSS 代码，并添加到 V2EX 自定义 CSS 即可使用 {name} 主题。
            </DialogDescription>
          </div>
          <DialogClose className="dialog-icon-close" aria-label="关闭">
            <X className="ui-icon" aria-hidden="true" />
          </DialogClose>
        </div>

        <div className="theme-dialog-section">
          <div className="get-theme-head">
            <h3 className="get-theme-title">CSS 代码</h3>
            <p role="status" className="copy-status">{status}</p>
          </div>
          <div className="import-row">
            <pre className="import-code"><code>{snippet}</code></pre>
            <Button
              ref={copyButtonRef}
              className="detail-control detail-primary"
              onClick={copySnippet}
            >
              {copied
                ? <Check className="ui-icon" aria-hidden="true" />
                : <Copy className="ui-icon" aria-hidden="true" />}
              复制
            </Button>
          </div>
        </div>

        <section className="theme-dialog-guide" aria-labelledby={guideTitleId}>
          <h3 id={guideTitleId} className="get-theme-title">如何使用</h3>
          <ol className="theme-guide-steps">
            <li>
              打开{' '}
              <a
                className="theme-guide-link"
                href="https://www.v2ex.com/settings"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.v2ex.com/settings
                <ArrowUpRight className="ui-icon" aria-hidden="true" />
              </a>
            </li>
            <li>勾选「使用自定义 CSS」</li>
            <li>把上方 CSS 代码复制进去并保存</li>
          </ol>
        </section>
      </DialogContent>
    </Dialog>
  )
}
