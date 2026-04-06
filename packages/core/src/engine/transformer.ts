import { Note, Track } from '../types/input'

/**
 * 音符变换器：提供移调、力度缩放、时间偏移等操作
 */
export class Transformer {
    /**
     * 移调（按半音）
     * 注意：由于 NextMusic 使用相对音级，这里的移调通常表现为 octave 的增减
     * 或者在解析为 MIDI 时增加 offset。
     */
    static transpose(notes: Note[], semitones: number): Note[] {
        // 在相对音级系统中，简单的 degree 增加可能导致调式越界
        // 这里提供基础的八度平移，更复杂的移调建议在渲染层处理或重新计算 degree
        const octaveOffset = Math.floor(semitones / 12)
        return notes.map(note => ({
            ...note,
            octave: note.octave + octaveOffset
        }))
    }

    /**
     * 力度缩放
     */
    static scaleVelocity(notes: Note[], factor: number): Note[] {
        return notes.map(note => ({
            ...note,
            expression: {
                ...note.expression,
                velocity: Math.min(1, Math.max(0, (note.expression?.velocity ?? 0.8) * factor))
            } as any // 简便起见使用 any，实际应符合 Expression 类型
        }))
    }

    /**
     * 时间整体偏移
     */
    static shiftTime(notes: Note[], offset: number): Note[] {
        return notes.map(note => ({
            ...note,
            start: Math.max(0, note.start + offset)
        }))
    }

    /**
     * 反转音符序列（逆行）
     */
    static reverse(notes: Note[]): Note[] {
        if (notes.length === 0) return []
        const maxTime = Math.max(...notes.map(n => n.start + n.duration))
        return notes.map(note => ({
            ...note,
            start: maxTime - (note.start + note.duration)
        })).sort((a, b) => a.start - b.start)
    }
}
