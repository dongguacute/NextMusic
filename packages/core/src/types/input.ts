import { z } from 'zod'
import { TimbreParamsSchema } from './timbre'
import { ExpressionSchema } from './expression'

// 音阶类型：音乐理论中的常见音阶
type ScaleType = 'major' | 'minor' | 'pentatonic' | 'blues';

// 乐器类型：当前支持的乐器
type InstrumentType = 'basic' | 'piano' | 'guitar' | 'synth';

export const KeySchema = z.object({
    root: z.number().int().min(0).max(127),
    scale: z.enum(['major', 'minor', 'pentatonic', 'blues']),
})

export const TimeSignatureSchema = z.tuple([
    z.number().int().min(1),
    z.number().int().min(1),
])

export const NoteSchema = z.object({
    degree: z.number().int().min(1).max(7),
    octave: z.number().int().min(-2).max(2),
    start: z.number().min(0),
    duration: z.number().positive(),
    expression: ExpressionSchema.optional(),
})
export const TrackSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    instrument: z.enum(['basic', 'piano', 'guitar', 'synth']),
    timbre: TimbreParamsSchema.optional(),
    notes: z.array(NoteSchema),
})
export const SongSchema = z.object({
    name: z.string(),
    tracks: z.array(TrackSchema),
})

export const MusicProjectSchema = z.object({
    tempo: z.number().int().min(20).max(300),
    timeSignature: TimeSignatureSchema,
    key: KeySchema,
    tracks: z.array(TrackSchema).min(1),
})

export type MusicProject = z.infer<typeof MusicProjectSchema>
export type Track = z.infer<typeof TrackSchema>
export type Note = z.infer<typeof NoteSchema>
export type Key = z.infer<typeof KeySchema>
export type TimeSignature = z.infer<typeof TimeSignatureSchema>