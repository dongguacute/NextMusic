import { describe, it, expect } from 'vitest'
import { degreeToMidi, midiToFrequency } from '../src/utils'
import { renderTrack, renderNote } from '../src/engine/renderer'
import { MusicProject, Note } from '../src/types/input'

describe('Core System - Phase 1', () => {
  
  describe('1~7 -> Pitch (MIDI & Frequency)', () => {
    const root = 60 // Middle C
    const scale = 'major'

    it('should convert degree 1 to MIDI 60 (C4)', () => {
      const midi = degreeToMidi(1, 0, root, scale)
      expect(midi).toBe(60)
    })

    it('should convert degree 3 to MIDI 64 (E4)', () => {
      const midi = degreeToMidi(3, 0, root, scale)
      expect(midi).toBe(64)
    })

    it('should convert MIDI 69 to 440Hz', () => {
      expect(midiToFrequency(69)).toBeCloseTo(440)
    })
  })

  describe('Timeline & Sequencing', () => {
    it('should render notes at correct start times', () => {
      const project: MusicProject = {
        tempo: 120,
        timeSignature: [4, 4],
        key: { root: 60, scale: 'major' },
        tracks: [{
          id: 't1',
          name: 'Lead',
          instrument: 'synth',
          notes: [
            { degree: 1, octave: 0, start: 0, duration: 1 },
            { degree: 2, octave: 0, start: 1, duration: 1 }
          ]
        }]
      }

      const events = renderTrack(project.tracks[0], project)
      expect(events).toHaveLength(2)
      expect(events[0].time).toBe(0)
      expect(events[1].time).toBe(1)
    })
  })

  describe('Realtime Input -> AudioEvent', () => {
    it('should render a single note from raw frontend data', () => {
      // 模拟前端传来的原始 JSON 数据
      const rawNoteData = {
        degree: 1,
        octave: 0,
        start: 0,
        duration: 0.5,
        expression: { velocity: 0.9 }
      }

      const context = { root: 60, scale: 'major' }
      
      // 核心测试：验证实时渲染函数
      const event = renderNote(rawNoteData as Note, context)

      expect(event.midi).toBe(60)
      expect(event.velocity).toBe(0.9)
      expect(event.duration).toBe(0.5)
    })
  })
})
