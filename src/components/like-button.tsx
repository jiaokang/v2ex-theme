import { useId, useRef, useState } from 'react'
import { Toggle, ToggleIcon } from '@ui-sdk/react/toggle'
import Heart from 'lucide-react/icons/heart'
import { RATE_LIMITED, setThemeLike, type ThemeLike } from '../likes'

export function LikeButton({ slug, initial }: { slug: string; initial: ThemeLike }) {
  const [like, setLike] = useState(initial)
  const [status, setStatus] = useState('')
  const pending = useRef(false)
  const countId = useId()

  async function handlePressedChange(liked: boolean) {
    if (pending.current) return
    pending.current = true
    const previous = like
    setLike({ liked, count: Math.max(0, previous.count + (liked ? 1 : -1)) })
    setStatus('')
    try {
      setLike(await setThemeLike({ data: { slug, liked } }))
    } catch (error) {
      setLike(previous)
      setStatus(error instanceof Error && error.message === RATE_LIMITED
        ? '操作太频繁，请稍后再试。'
        : '点赞失败，请稍后再试。')
    } finally {
      pending.current = false
    }
  }

  return (
    <div className="like-action">
      <Toggle
        className="detail-control like-toggle"
        pressed={like.liked}
        onPressedChange={handlePressedChange}
        aria-label="点赞"
        aria-describedby={countId}
      >
        <ToggleIcon>
          <Heart className="ui-icon" />
        </ToggleIcon>
        点赞
        <span className="like-count" aria-hidden="true">{like.count}</span>
      </Toggle>
      <span id={countId} className="visually-hidden">共 {like.count} 个赞</span>
      <p role="status" className="copy-status">{status}</p>
    </div>
  )
}
