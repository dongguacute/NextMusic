import { describe, it, expect } from 'vitest'
import { degreeToMidi, midiToFrequency } from '../src/utils'
import { renderNote, renderTrack } from '../src/engine/renderer'
import { SynthEngine } from '../src/engine/synth'
import { Note, MusicProject } from '../src/types/input'
import { TimbreParams } from '../src/types/timbre'
import { Expression } from '../src/types/expression'

describe('NextMusic Core - Full Functional Integration Tests', () => {
  
  // 1. 基础音高转换测试 (1~7 -> MIDI -> Frequency)
  describe('Pitch System (1~7 -> Pitch)', () => {
    const context = { root: 60, scale: 'major' } // C Major

    it('should correctly convert scale degrees to frequencies', () => {
      const testCases = [
        { degree: 1, octave: 0, expectedMidi: 60 }, // C4
        { degree: 3, octave: 0, expectedMidi: 64 }, // E4
        { degree: 5, octave: 0, expectedMidi: 67 }, // G4
        { degree: 1, octave: 1, expectedMidi: 72 }, // C5
      ]

      testCases.forEach(({ degree, octave, expectedMidi }) => {
        const midi = degreeToMidi(degree, octave, context.root, context.scale)
        expect(midi).toBe(expectedMidi)
        
        const freq = midiToFrequency(midi)
        const expectedFreq = 440 * Math.pow(2, (expectedMidi - 69) / 12)
        expect(freq).toBeCloseTo(expectedFreq)
      })
    })
  })

  // 2. 表达系统集成测试 (Expression -> Realtime Parameters)
  describe('Expression System (Dynamic Control)', () => {
    it('should interpolate gain and brightness from expression curves', () => {
      const expression: Expression = {
        velocity: 0.5,
        gainCurve: [
          [0, 0.2],   // 开始时音量 0.2
          [0.5, 1.0], // 0.5秒时达到最大音量 1.0
          [1.0, 0.5]  // 1.0秒时回落到 0.5
        ],
        timbreCurve: [
          [0, 0.1],   // 开始时音色暗
          [1.0, 0.9]  // 结束时音色亮
        ]
      }

      // 测试不同时间点的插值结果
      const start = SynthEngine.getExpressionValue(0, expression)
      expect(start.gain).toBe(0.2)
      expect(start.brightness).toBe(0.1)

      const middle = SynthEngine.getExpressionValue(0.5, expression)
      expect(middle.gain).toBe(1.0)
      expect(middle.brightness).toBeCloseTo(0.5) // (0.1 + 0.9) / 2 at t=0.5

      const end = SynthEngine.getExpressionValue(1.0, expression)
      expect(end.gain).toBe(0.5)
      expect(end.brightness).toBe(0.9)
    })
  })

  // 3. 音色与包络系统测试 (Timbre & ADSR)
  describe('Timbre & Envelope (ADSR)', () => {
    const timbre: TimbreParams = {
      oscillator: 'sawtooth',
      brightness: 0.7,
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3
      }
    }

    it('should calculate correct envelope gain at different stages', () => {
      const duration = 1.0 // 音符持续 1 秒

      // Attack 阶段 (t=0.05, 处于 0.1s 的一半)
      expect(SynthEngine.applyEnvelope(0.05, duration, timbre)).toBeCloseTo(0.5)
      
      // Decay 阶段 (t=0.2, attack 0.1 + decay 0.1)
      // 从 1.0 降到 0.5 的过程中间
      expect(SynthEngine.applyEnvelope(0.2, duration, timbre)).toBeCloseTo(0.75)

      // Sustain 阶段 (t=0.5)
      expect(SynthEngine.applyEnvelope(0.5, duration, timbre)).toBe(0.5)

      // Release 阶段 (t=1.1, duration 1.0 + release 0.1)
      // 从 0.5 降到 0 的 1/3 处
      expect(SynthEngine.applyEnvelope(1.1, duration, timbre)).toBeCloseTo(0.333, 2)
    })
  })

  // 4. 完整渲染链路测试 (Realtime Note Rendering)
  describe('Full Rendering Pipeline', () => {
    it('should produce a complete AudioEvent from raw input', () => {
      const rawNote: Note = {
        degree: 1,
        octave: 0,
        start: 0,
        duration: 2.0,
        expression: {
          velocity: 0.8,
          vibrato: 0.3
        }
      }

      const context = {
        root: 60,
        scale: 'major',
        timbre: {
          oscillator: 'square' as const,
          brightness: 0.6,
          envelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.2 }
        }
      }

      const event = renderNote(rawNote, context)

      // 验证渲染出的事件是否包含所有必要信息供合成器使用
      expect(event.midi).toBe(60)
      expect(event.velocity).toBe(0.8)
      expect(event.timbre?.oscillator).toBe('square')
      expect(event.expression?.vibrato).toBe(0.3)
      expect(event.duration).toBe(2.0)
    })
  })
})
