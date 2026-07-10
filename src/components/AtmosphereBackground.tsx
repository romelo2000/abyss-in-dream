import { useMemo } from 'react'
import React from 'react'
import { DreamScene } from '../lib/types'

interface Props {
  scene: DreamScene
}

export function AtmosphereBackground({ scene }: Props) {
  const elements = useMemo(() => {
    const items: React.JSX.Element[] = []

    if (scene.elements.includes('ripple')) {
      for (let i = 0; i < 5; i++) {
        items.push(
          <div
            key={`ripple-${i}`}
            className="ripple-circle animate-ripple"
            style={{
              width: `${100 + i * 80}px`,
              height: `${100 + i * 80}px`,
              animationDelay: `${i * 0.6}s`,
              borderColor: `${scene.colors.accent}30`,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('stars')) {
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * 100
        const y = Math.random() * 100
        const delay = Math.random() * 4
        const size = Math.random() * 2 + 1
        items.push(
          <div
            key={`star-${i}`}
            className="star"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${delay}s`,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('nebula')) {
      items.push(
        <div
          key="nebula-1"
          className="mist animate-breathe"
          style={{
            width: '400px',
            height: '400px',
            background: scene.colors.accent,
            top: '20%',
            left: '10%',
          }}
        />
      )
      items.push(
        <div
          key="nebula-2"
          className="mist animate-breathe"
          style={{
            width: '300px',
            height: '300px',
            background: '#c44d8b',
            top: '60%',
            right: '15%',
            animationDelay: '3s',
          }}
        />
      )
    }

    if (scene.elements.includes('mist')) {
      for (let i = 0; i < 4; i++) {
        items.push(
          <div
            key={`mist-${i}`}
            className="mist animate-drift"
            style={{
              width: `${200 + Math.random() * 200}px`,
              height: `${200 + Math.random() * 200}px`,
              background: scene.colors.accent,
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 80}%`,
              animationDelay: `${i * 3}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('leaves')) {
      for (let i = 0; i < 15; i++) {
        items.push(
          <div
            key={`leaf-${i}`}
            className="leaf"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('petals')) {
      for (let i = 0; i < 20; i++) {
        items.push(
          <div
            key={`petal-${i}`}
            className="petal"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 12}s`,
              animationDuration: `${8 + Math.random() * 8}s`,
              background: `rgba(196, 77, 139, ${0.2 + Math.random() * 0.3})`,
            }}
          />
        )
      }
      items.push(
        <div
          key="lotus-glow"
          className="mist animate-breathe"
          style={{
            width: '500px',
            height: '500px',
            background: scene.colors.accent,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.08,
          }}
        />
      )
    }

    if (scene.elements.includes('glow')) {
      items.push(
        <div
          key="glow-1"
          className="mist animate-pulse-glow"
          style={{
            width: '350px',
            height: '350px',
            background: scene.colors.accent,
            top: '30%',
            left: '20%',
          }}
        />
      )
      items.push(
        <div
          key="glow-2"
          className="mist animate-pulse-glow"
          style={{
            width: '250px',
            height: '250px',
            background: '#8b5cf6',
            bottom: '20%',
            right: '10%',
            animationDelay: '2s',
          }}
        />
      )
    }

    if (scene.elements.includes('bubbles')) {
      for (let i = 0; i < 25; i++) {
        const size = 4 + Math.random() * 16
        items.push(
          <div
            key={`bubble-${i}`}
            className="bubble"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${Math.random() * 100}%`,
              bottom: '0',
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${6 + Math.random() * 8}s`,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('waves')) {
      items.push(
        <div
          key="wave-1"
          className="mist animate-breathe"
          style={{
            width: '600px',
            height: '200px',
            background: scene.colors.accent,
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.1,
          }}
        />
      )
    }

    if (scene.elements.includes('clouds')) {
      for (let i = 0; i < 6; i++) {
        items.push(
          <div
            key={`cloud-${i}`}
            className="mist animate-drift"
            style={{
              width: `${300 + Math.random() * 200}px`,
              height: `${100 + Math.random() * 80}px`,
              background: scene.colors.accent,
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 80}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${20 + Math.random() * 15}s`,
              opacity: 0.1,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('embers')) {
      for (let i = 0; i < 20; i++) {
        items.push(
          <div
            key={`ember-${i}`}
            className="ember"
            style={{
              left: `${30 + Math.random() * 40}%`,
              bottom: '10%',
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        )
      }
      items.push(
        <div
          key="fire-glow"
          className="mist animate-breathe"
          style={{
            width: '400px',
            height: '300px',
            background: '#d4a843',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.08,
          }}
        />
      )
    }

    if (scene.elements.includes('smoke')) {
      for (let i = 0; i < 8; i++) {
        items.push(
          <div
            key={`smoke-${i}`}
            className="mist animate-drift"
            style={{
              width: `${150 + Math.random() * 100}px`,
              height: `${150 + Math.random() * 100}px`,
              background: '#6b6c9a',
              bottom: '10%',
              left: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
              opacity: 0.05,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('mirror')) {
      items.push(
        <div
          key="mirror-glow"
          className="mist animate-pulse-glow"
          style={{
            width: '100%',
            height: '100%',
            background: scene.colors.accent,
            top: '0',
            left: '0',
            opacity: 0.03,
          }}
        />
      )
    }

    if (scene.elements.includes('sky')) {
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 100
        const y = Math.random() * 50
        items.push(
          <div
            key={`sky-star-${i}`}
            className="star"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        )
      }
    }

    if (scene.elements.includes('wind')) {
      for (let i = 0; i < 10; i++) {
        items.push(
          <div
            key={`wind-${i}`}
            className="mist animate-drift"
            style={{
              width: `${200 + Math.random() * 200}px`,
              height: `${50 + Math.random() * 50}px`,
              background: scene.colors.accent,
              top: `${Math.random() * 80}%`,
              left: '-200px',
              animationDelay: `${i * 3}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
              opacity: 0.08,
            }}
          />
        )
      }
    }

    return items
  }, [scene])

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, ${scene.colors.secondary} 0%, ${scene.colors.primary} 70%)`,
        transition: 'background 1.5s ease-in-out',
      }}
    >
      {elements}
    </div>
  )
}
