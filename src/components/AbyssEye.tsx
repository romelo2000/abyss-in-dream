export type EyeState = 'sleeping' | 'listening' | 'thinking' | 'crisis' | 'silence' | 'insight' | 'egoDeath'

interface Props {
  state: EyeState
  size?: number
}

const STATE_COLORS: Record<EyeState, { ring: string; core: string; rays: string }> = {
  sleeping:   { ring: '#5d5fa0', core: '#7d7fc8', rays: '#4d4f90' },
  listening:  { ring: '#6db5e4', core: '#8fc8f0', rays: '#6db5e4' },
  thinking:   { ring: '#a78bfa', core: '#c4b5fd', rays: '#a78bfa' },
  crisis:     { ring: '#e0609a', core: '#f080b0', rays: '#e0609a' },
  silence:    { ring: '#8b8cba', core: 'transparent', rays: '#5d5fa0' },
  insight:    { ring: '#f0c060', core: '#ffd878', rays: '#f0c060' },
  egoDeath:   { ring: '#3a3b6a', core: '#2a2b4a', rays: '#3a3b6a' },
}

export function AbyssEye({ state, size = 56 }: Props) {
  const colors = STATE_COLORS[state]
  const showRays = state === 'thinking' || state === 'crisis'
  const showPulse = state !== 'sleeping' && state !== 'silence' && state !== 'egoDeath'
  const isIntense = state === 'crisis' || state === 'egoDeath'

  return (
    <div
      className={`abyss-eye abyss-eye-${state}`}
      style={{ width: size, height: size }}
      data-tooltip={
        state === 'sleeping' ? 'Бездна спит' :
        state === 'listening' ? 'Бездна слушает' :
        state === 'thinking' ? 'Бездна говорит' :
        state === 'crisis' ? 'Кризис' :
        state === 'silence' ? 'Молчание' :
        state === 'insight' ? 'Инсайт' :
        'Ego Death'
      }
    >
      <svg viewBox="0 0 56 56" width={size} height={size}>
        {/* Outer ring */}
        <circle
          cx="28" cy="28" r="24"
          fill="none"
          stroke={colors.ring}
          strokeWidth={isIntense ? 2.5 : 1.5}
          opacity={state === 'silence' ? 0.4 : 0.8}
          className="abyss-eye-ring"
        />

        {/* Rays */}
        {showRays && (
          <g className="abyss-eye-rays">
            {[0, 60, 120, 180, 240, 300].map(deg => {
              const rad = (deg * Math.PI) / 180
              const x1 = 28 + Math.cos(rad) * 16
              const y1 = 28 + Math.sin(rad) * 16
              const x2 = 28 + Math.cos(rad) * 24
              const y2 = 28 + Math.sin(rad) * 24
              return (
                <line
                  key={deg}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={colors.rays}
                  strokeWidth="1"
                  opacity="0.5"
                />
              )
            })}
          </g>
        )}

        {/* Inner ring */}
        <circle
          cx="28" cy="28" r="14"
          fill="none"
          stroke={colors.ring}
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Core */}
        <circle
          cx="28" cy="28" r={state === 'silence' || state === 'egoDeath' ? 2 : 6}
          fill={colors.core}
          className="abyss-eye-core"
          style={{
            opacity: state === 'sleeping' ? 0.7 : 1,
          }}
        />

        {/* Pulse ring for active states */}
        {showPulse && (
          <circle
            cx="28" cy="28" r="10"
            fill="none"
            stroke={colors.core}
            strokeWidth="0.5"
            className="abyss-eye-pulse"
          />
        )}

        {/* Insight flash */}
        {state === 'insight' && (
          <circle
            cx="28" cy="28" r="20"
            fill="none"
            stroke={colors.ring}
            strokeWidth="1"
            className="abyss-eye-flash"
          />
        )}
      </svg>
    </div>
  )
}
