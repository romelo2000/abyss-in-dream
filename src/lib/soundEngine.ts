export type SoundPhase = 'summoning' | 'dialogue' | 'crisis' | 'reflection' | 'completed' | 'idle'
export type SoundEvent = 'insight' | 'egoDeath' | 'modeShift' | 'silence' | 'phaseShift'

interface Layer {
  osc: OscillatorNode
  gain: GainNode
  filter: BiquadFilterNode
}

export class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private droneLayers: Layer[] = []
  private binauralL: OscillatorNode | null = null
  private binauralR: OscillatorNode | null = null
  private binauralGain: GainNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null
  private noiseFilter: BiquadFilterNode | null = null
  private currentPhase: SoundPhase = 'idle'
  private enabled = false
  private volume = 0.3

  get isEnabled() { return this.enabled }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  start() {
    this.ensureContext()
    if (this.enabled) return
    this.enabled = true

    this.startDrone()
    this.startBinaural()
    this.startNoise()

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 2)
    }
  }

  stop() {
    if (!this.enabled || !this.ctx || !this.masterGain) return
    this.enabled = false

    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1)

    setTimeout(() => this.teardown(), 1200)
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.enabled && this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.3)
    }
  }

  private teardown() {
    this.droneLayers.forEach(l => {
      try { l.osc.stop() } catch {}
      try { l.osc.disconnect() } catch {}
      try { l.gain.disconnect() } catch {}
      try { l.filter.disconnect() } catch {}
    })
    this.droneLayers = []

    try { this.binauralL?.stop() } catch {}
    try { this.binauralR?.stop() } catch {}
    this.binauralL?.disconnect()
    this.binauralR?.disconnect()
    this.binauralGain?.disconnect()
    this.binauralL = null
    this.binauralR = null
    this.binauralGain = null

    try { this.noiseSource?.stop() } catch {}
    this.noiseSource?.disconnect()
    this.noiseGain?.disconnect()
    this.noiseFilter?.disconnect()
    this.noiseSource = null
    this.noiseGain = null
    this.noiseFilter = null
  }

  private startDrone() {
    if (!this.ctx || !this.masterGain) return
    const freqs = [55, 82.5, 110]
    const types: OscillatorType[] = ['sine', 'sine', 'triangle']

    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()
      const filter = this.ctx!.createBiquadFilter()

      osc.type = types[i]
      osc.frequency.value = freq
      filter.type = 'lowpass'
      filter.frequency.value = 200
      filter.Q.value = 1
      gain.gain.value = i === 0 ? 0.4 : 0.15

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain!)
      osc.start()

      this.droneLayers.push({ osc, gain, filter })
    })
  }

  private startBinaural() {
    if (!this.ctx || !this.masterGain) return
    const baseFreq = 136.1
    const beatFreq = 4

    this.binauralL = this.ctx.createOscillator()
    this.binauralR = this.ctx.createOscillator()
    this.binauralGain = this.ctx.createGain()

    const merger = this.ctx.createChannelMerger(2)
    const gainL = this.ctx.createGain()
    const gainR = this.ctx.createGain()

    this.binauralL.type = 'sine'
    this.binauralL.frequency.value = baseFreq
    this.binauralR.type = 'sine'
    this.binauralR.frequency.value = baseFreq + beatFreq

    gainL.gain.value = 0.08
    gainR.gain.value = 0.08
    this.binauralGain.gain.value = 1

    this.binauralL.connect(gainL)
    this.binauralR.connect(gainR)
    gainL.connect(merger, 0, 0)
    gainR.connect(merger, 0, 1)
    merger.connect(this.binauralGain)
    this.binauralGain.connect(this.masterGain)

    this.binauralL.start()
    this.binauralR.start()
  }

  private startNoise() {
    if (!this.ctx || !this.masterGain) return
    const bufferSize = this.ctx.sampleRate * 4
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)

    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }

    this.noiseSource = this.ctx.createBufferSource()
    this.noiseSource.buffer = buffer
    this.noiseSource.loop = true

    this.noiseFilter = this.ctx.createBiquadFilter()
    this.noiseFilter.type = 'lowpass'
    this.noiseFilter.frequency.value = 400
    this.noiseFilter.Q.value = 0.5

    this.noiseGain = this.ctx.createGain()
    this.noiseGain.gain.value = 0.03

    this.noiseSource.connect(this.noiseFilter)
    this.noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(this.masterGain)
    this.noiseSource.start()
  }

  setPhase(phase: SoundPhase) {
    if (this.currentPhase === phase) return
    this.currentPhase = phase
    if (!this.ctx || !this.enabled) return

    const t = this.ctx.currentTime
    const configs: Record<SoundPhase, { droneFreq: number; droneQ: number; noiseFreq: number; binauralBeat: number }> = {
      idle:        { droneFreq: 200,  droneQ: 1,   noiseFreq: 400, binauralBeat: 4 },
      summoning:   { droneFreq: 120,  droneQ: 2,   noiseFreq: 300, binauralBeat: 6 },
      dialogue:    { droneFreq: 200,  droneQ: 1,   noiseFreq: 500, binauralBeat: 4 },
      crisis:      { droneFreq: 80,   droneQ: 5,   noiseFreq: 800, binauralBeat: 2 },
      reflection:  { droneFreq: 300,  droneQ: 0.5, noiseFreq: 200, binauralBeat: 7 },
      completed:   { droneFreq: 400,  droneQ: 0.5, noiseFreq: 150, binauralBeat: 8 },
    }

    const cfg = configs[phase]
    this.droneLayers.forEach((layer, i) => {
      layer.filter.frequency.linearRampToValueAtTime(cfg.droneFreq + i * 50, t + 3)
      layer.filter.Q.linearRampToValueAtTime(cfg.droneQ, t + 3)
    })
    this.noiseFilter?.frequency.linearRampToValueAtTime(cfg.noiseFreq, t + 3)

    if (this.binauralL && this.binauralR) {
      const baseFreq = 136.1
      this.binauralR.frequency.linearRampToValueAtTime(baseFreq + cfg.binauralBeat, t + 3)
    }
  }

  playEvent(event: SoundEvent) {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    const t = this.ctx.currentTime

    switch (event) {
      case 'insight':
        this.playBell(880, t, 0.15, 2)
        this.playBell(1320, t + 0.05, 0.08, 1.5)
        break
      case 'egoDeath':
        this.playGong(55, t, 0.4, 3)
        this.playGong(27.5, t + 0.1, 0.3, 4)
        break
      case 'modeShift':
        this.playGlissando(t, 0.1)
        break
      case 'silence':
        this.playBell(220, t, 0.1, 3)
        break
      case 'phaseShift':
        this.playGlissando(t, 0.2)
        this.playBell(440, t + 0.3, 0.08, 2)
        break
    }
  }

  private playBell(freq: number, start: number, vol: number, duration: number) {
    if (!this.ctx || !this.masterGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(vol, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(start)
    osc.stop(start + duration)
  }

  private playGong(freq: number, start: number, vol: number, duration: number) {
    if (!this.ctx || !this.masterGain) return
    const osc = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.value = freq
    osc2.type = 'sine'
    osc2.frequency.value = freq * 1.5
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, start)
    filter.frequency.exponentialRampToValueAtTime(100, start + duration)

    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(vol, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    osc.start(start)
    osc2.start(start)
    osc.stop(start + duration)
    osc2.stop(start + duration)
  }

  private playGlissando(start: number, vol: number) {
    if (!this.ctx || !this.masterGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, start)
    osc.frequency.exponentialRampToValueAtTime(440, start + 0.5)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(vol, start + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(start)
    osc.stop(start + 0.8)
  }
}

export const soundEngine = new SoundEngine()
