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

export function resolveNote(data: unknown) {
    try {
        const note = NoteSchema.parse(data)
        // 假设这里需要一个默认的 root，或者从其他地方获取
        const defaultRoot = 60 
        const midi = degreeToMidi(
            note.degree,
            note.octave,
            defaultRoot,
            0 // accidental 默认为 0
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