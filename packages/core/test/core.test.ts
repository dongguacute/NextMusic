import { describe, it, expect } from 'vitest'
import { processMusicProject } from '../src/index'

describe('Music Core Engine', () => {
  it('should correctly process a valid music project', () => {
    const testData = {
      "tempo": 120,
      "timeSignature": [4, 4],
      "key": {
        "root": 60,
        "scale": "major"
      },
      "tracks": [
        {
          "id": "track_1",
          "name": "Lead",
          "instrument": "basic",
          "notes": [
            { "degree": 1, "octave": 0, "start": 0, "duration": 1 },
            { "degree": 2, "octave": 0, "start": 1, "duration": 1 },
            { "degree": 3, "octave": 0, "start": 2, "duration": 1 },
            { "degree": 5, "octave": 0, "start": 3, "duration": 2 }
          ]
        }
      ]
    }

    const result = processMusicProject(testData)

    expect(result.success).toBe(true)
    if (result.success) {
      const { data } = result
      expect(data.tempo).toBe(120)
      expect(data.timeSignature).toEqual([4, 4])
      expect(data.tracks).toHaveLength(1)
      
      const track = data.tracks[0]
      expect(track.id).toBe('track_1')
      expect(track.events).toHaveLength(4)

      // 验证 MIDI 计算 (C Major: 1=60, 2=62, 3=64, 5=67)
      expect(track.events[0].midi).toBe(60)
      expect(track.events[1].midi).toBe(62)
      expect(track.events[2].midi).toBe(64)
      expect(track.events[3].midi).toBe(67)

      // 验证时间
      expect(track.events[0].time).toBe(0)
      expect(track.events[3].duration).toBe(2)
    }
  })

  it('should handle different scales correctly', () => {
    const testData = {
      "tempo": 120,
      "timeSignature": [4, 4],
      "key": {
        "root": 60,
        "scale": "minor" // C Minor: C, D, Eb, F, G, Ab, Bb
      },
      "tracks": [
        {
          "id": "track_2",
          "name": "Bass",
          "instrument": "basic",
          "notes": [
            { "degree": 3, "octave": -1, "start": 0, "duration": 1 } // Eb2
          ]
        }
      ]
    }

    const result = processMusicProject(testData)
    expect(result.success).toBe(true)
    if (result.success) {
      // 60 (C4) - 12 (octave) + 3 (minor 3rd) = 51
      expect(result.data.tracks[0].events[0].midi).toBe(51)
    }
  })

  it('should fail on invalid data', () => {
    const invalidData = {
      "tempo": 10, // Too low
      "tracks": []
    }
    const result = processMusicProject(invalidData)
    expect(result.success).toBe(false)
  })
})
