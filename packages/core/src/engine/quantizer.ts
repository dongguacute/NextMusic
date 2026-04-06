import { Note } from '../types/input'

export type QuantizeGrid = 1 | 2 | 4 | 8 | 16 | 32 | 64 // 1/n 拍

export interface QuantizeOptions {
    grid: QuantizeGrid
    strength: number // 0-1, 1 为完全对齐
    quantizeStart: boolean
    quantizeDuration: boolean
}

/**
 * 量化器：将音符对齐到时间网格
 */
export class Quantizer {
    /**
     * 量化单个音符
     * @param note 待量化音符
     * @param options 量化选项
     * @returns 量化后的音符
     */
    static quantizeNote(note: Note, options: QuantizeOptions): Note {
        const { grid, strength, quantizeStart, quantizeDuration } = options
        const step = 1 / (grid / 4) // 以 4 分音符为 1 拍，grid 为 16 表示 1/16 拍，即 0.25 拍

        let newStart = note.start
        if (quantizeStart) {
            const targetStart = Math.round(note.start / step) * step
            newStart = note.start + (targetStart - note.start) * strength
        }

        let newDuration = note.duration
        if (quantizeDuration) {
            const targetDuration = Math.max(step, Math.round(note.duration / step) * step)
            newDuration = note.duration + (targetDuration - note.duration) * strength
        }

        return {
            ...note,
            start: newStart,
            duration: newDuration
        }
    }

    /**
     * 批量量化音符
     */
    static quantizeNotes(notes: Note[], options: QuantizeOptions): Note[] {
        return notes.map(note => this.quantizeNote(note, options))
    }
}
