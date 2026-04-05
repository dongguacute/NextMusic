const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]

export function degreeToMidi(
  degree: number,
  octave: number,
  root: number,
  accidental = 0
): number {
  const base = MAJOR_SCALE[degree - 1]
  return root + base + accidental + octave * 12
}