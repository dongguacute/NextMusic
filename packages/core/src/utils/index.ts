const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
}

export function degreeToMidi(
  degree: number,
  octave: number,
  root: number,
  scale: string = 'major',
  accidental = 0
): number {
  const intervals = SCALES[scale] || SCALES.major
  const scaleLength = intervals.length
  
  // 处理 degree 超出范围的情况（例如 degree 8 是高八度的 degree 1）
  const adjustedDegree = ((degree - 1) % scaleLength + scaleLength) % scaleLength
  const octaveOffset = Math.floor((degree - 1) / scaleLength)
  
  const base = intervals[adjustedDegree]
  return root + base + accidental + (octave + octaveOffset) * 12
}
