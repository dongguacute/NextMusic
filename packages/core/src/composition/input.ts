export function validateInput(input: string) {
  try {
    const parsed: unknown = JSON.parse(input)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false
    }

    const record = parsed as Record<string, unknown>
    const keys = Object.keys(record).sort()
    const expectedKeys = ['progression', 'tempo']

    if (keys.length !== expectedKeys.length || !keys.every((key, i) => key === expectedKeys[i])) {
      return false
    }

    const progression = record.progression
    const tempo = record.tempo

    if (!Array.isArray(progression) || progression.some((item) => typeof item !== 'string')) {
      return false
    }

    if (typeof tempo !== 'number' || !Number.isFinite(tempo)) {
      return false
    }

    return true
  } catch {
    return false
  }
}