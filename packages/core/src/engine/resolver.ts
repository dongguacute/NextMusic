import {validateMusicProject} from '../io/json'
import {degreeToMidi} from '../utils'
import { NoteSchema } from '../types/input'

export function resolveMusicProject(data: unknown) {
    try {
        const musicProject = validateMusicProject(data)
        return {
            success: true,
            data: musicProject
        }
    } catch (err) {
        console.error(err)
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
        }
    }
}

export function resolveNote(data: unknown, root: number = 60, scale: string = 'major') {
    try {
        const note = NoteSchema.parse(data)
        const midi = degreeToMidi(
            note.degree,
            note.octave,
            root,
            scale,
            note.accidental || 0
        )
        return {
            success: true,
            data: midi
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
        }
    }
}