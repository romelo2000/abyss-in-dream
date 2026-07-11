import { useMemo } from 'react'

interface Props {
  content: string
  echoKeywords: string[]
}

export function EchoText({ content, echoKeywords }: Props) {
  const segments = useMemo(() => {
    if (!echoKeywords.length) return [{ text: content, echo: false }]
    
    const sorted = [...echoKeywords].sort((a, b) => b.length - a.length)
    const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
    
    return content.split(regex).map(segment => ({
      text: segment,
      echo: sorted.some(k => segment.toLowerCase() === k.toLowerCase()),
    }))
  }, [content, echoKeywords])

  return (
    <p className="whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.echo ? (
          <span key={i} className="echo-highlight" data-tooltip="Эхо из прошлой сессии">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  )
}
