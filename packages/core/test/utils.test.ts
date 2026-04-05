import { describe, expect, it } from 'vitest'
import { degreeToMidi } from '../src/utils/index'

describe('degreeToMidi', () => {
  it('should convert degree to MIDI note correctly in major scale', () => {
    // C4 (root 0, octave 4, degree 1) -> 48
    expect(degreeToMidi(1, 4, 0, 'major')).toBe(48)
    
    // D4 (root 0, octave 4, degree 2) -> 50
    expect(degreeToMidi(2, 4, 0, 'major')).toBe(50)
    
    // E4 (root 0, octave 4, degree 3) -> 52
    expect(degreeToMidi(3, 4, 0, 'major')).toBe(52)
  })

  it('should handle octave offsets correctly', () => {
    // C5 (root 0, octave 4, degree 8) -> 60
    expect(degreeToMidi(8, 4, 0, 'major')).toBe(60)
  })

  it('should handle different scales', () => {
    // C4 minor (root 0, octave 4, degree 3) -> 51 (Eb4)
    expect(degreeToMidi(3, 4, 0, 'minor')).toBe(51)
  })
})
