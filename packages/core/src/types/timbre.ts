import { z } from 'zod'

export const OscillatorTypeSchema = z.enum(['sine', 'square', 'sawtooth', 'triangle'])

export const EnvelopeSchema = z.object({
  attack: z.number().min(0).default(0.1),
  decay: z.number().min(0).default(0.1),
  sustain: z.number().min(0).max(1).default(0.5),
  release: z.number().min(0).default(0.3),
})

export const TimbreParamsSchema = z.object({
  oscillator: OscillatorTypeSchema.default('sine'),
  brightness: z.number().min(0).max(1).default(0.5),
  envelope: EnvelopeSchema.default({
    attack: 0.1,
    decay: 0.1,
    sustain: 0.5,
    release: 0.3,
  }),
})

export type OscillatorType = z.infer<typeof OscillatorTypeSchema>
export type Envelope = z.infer<typeof EnvelopeSchema>
export type TimbreParams = z.infer<typeof TimbreParamsSchema>
