import { useState, useEffect, useRef } from 'react'

interface Props {
  onClose: () => void
}

const PHASES = [
  { label: 'вдох', duration: 4000, scale: 1.8, color: '#4d8bc4' },
  { label: 'задержка', duration: 4000, scale: 1.8, color: '#8b5cf6' },
  { label: 'выдох', duration: 6000, scale: 0.6, color: '#c44d8b' },
  { label: 'пауза', duration: 2000, scale: 0.6, color: '#6b6c9a' },
]

export function BreathingGuide({ onClose }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [scale, setScale] = useState(0.6)
  const [color, setColor] = useState(PHASES[0].color)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const phase = PHASES[phaseIdx]
    setScale(phase.scale)
    setColor(phase.color)

    timerRef.current = setTimeout(() => {
      setPhaseIdx(prev => (prev + 1) % PHASES.length)
    }, phase.duration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [phaseIdx])

  const phase = PHASES[phaseIdx]

  return (
    <div className="fixed bottom-24 right-6 z-30 flex flex-col items-center gap-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-xs text-abyss-dim uppercase tracking-wider">{phase.label}</span>
        <button
          onClick={onClose}
          className="text-abyss-dim hover:text-abyss-text transition-colors text-sm"
          data-tooltip="Закрыть дыхательный гид"
        >
          ✕
        </button>
      </div>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div
          className="absolute rounded-full transition-all ease-in-out"
          style={{
            width: 48,
            height: 48,
            transform: `scale(${scale})`,
            background: `radial-gradient(circle, ${color}30, ${color}08)`,
            border: `1px solid ${color}40`,
            transitionDuration: `${phase.duration}ms`,
          }}
        />
        <div
          className="absolute rounded-full transition-all ease-in-out"
          style={{
            width: 24,
            height: 24,
            transform: `scale(${scale * 0.7})`,
            background: `${color}20`,
            transitionDuration: `${phase.duration}ms`,
          }}
        />
      </div>
    </div>
  )
}
