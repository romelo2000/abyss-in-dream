import { describe, it, expect } from 'vitest'
import { MODES, DREAM_SCENES, AWAKENING_LEVELS, KOANS, DAILY_CHALLENGES, ACHIEVEMENTS, DREAM_VOICES, SILENCE_MESSAGES } from './types'

describe('Shared Types & Constants', () => {
  it('MODES should have 6 modes', () => {
    expect(MODES).toHaveLength(6)
  })

  it('each mode should have id, name, description, icon', () => {
    for (const mode of MODES) {
      expect(mode.id).toBeTruthy()
      expect(mode.name).toBeTruthy()
      expect(mode.description).toBeTruthy()
      expect(mode.icon).toBeTruthy()
    }
  })

  it('DREAM_SCENES should have at least 4 scenes', () => {
    expect(DREAM_SCENES.length).toBeGreaterThanOrEqual(4)
  })

  it('each dream scene should have colors and elements', () => {
    for (const scene of DREAM_SCENES) {
      expect(scene.colors.primary).toBeTruthy()
      expect(scene.colors.secondary).toBeTruthy()
      expect(scene.colors.accent).toBeTruthy()
      expect(scene.elements.length).toBeGreaterThan(0)
    }
  })

  it('AWAKENING_LEVELS should cover 0-100', () => {
    expect(AWAKENING_LEVELS[0].min).toBe(0)
    expect(AWAKENING_LEVELS[AWAKENING_LEVELS.length - 1].max).toBe(100)
  })

  it('KOANS should have at least 10 entries', () => {
    expect(KOANS.length).toBeGreaterThanOrEqual(10)
  })

  it('DAILY_CHALLENGES should have at least 5 entries', () => {
    expect(DAILY_CHALLENGES.length).toBeGreaterThanOrEqual(5)
  })

  it('ACHIEVEMENTS should have at least 10 entries', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10)
  })

  it('DREAM_VOICES should have at least 5 entries', () => {
    expect(DREAM_VOICES.length).toBeGreaterThanOrEqual(5)
  })

  it('SILENCE_MESSAGES should have at least 3 entries', () => {
    expect(SILENCE_MESSAGES.length).toBeGreaterThanOrEqual(3)
  })

  it('all achievement ids should be unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all daily challenge ids should be unique', () => {
    const ids = DAILY_CHALLENGES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all dream scene ids should be unique', () => {
    const ids = DREAM_SCENES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
