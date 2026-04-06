import { Note } from '../types/input'

export interface RawInputEvent {
    degree: number
    octave: number
    accidental: number
    velocity?: number
    timestamp: number // 绝对时间（毫秒）
    type: 'noteOn' | 'noteOff'
}

/**
 * 录制器：处理实时输入流并生成音符序列
 */
export class Recorder {
    private activeNotes: Map<string, { start: number, degree: number, octave: number, accidental: number, velocity: number }> = new Map()
    private recordedNotes: Note[] = []
    private startTime: number = 0
    private isRecording: boolean = false

    start(currentTime: number) {
        this.startTime = currentTime
        this.recordedNotes = []
        this.activeNotes.clear()
        this.isRecording = true
    }

    stop(): Note[] {
        this.isRecording = false
        return [...this.recordedNotes]
    }

    processEvent(event: RawInputEvent, tempo: number): Note | null {
        if (!this.isRecording) return null

        const relativeTimeInSeconds = (event.timestamp - this.startTime) / 1000
        const beatsPerSecond = tempo / 60
        const relativeTimeInBeats = relativeTimeInSeconds * beatsPerSecond
        const key = `${event.degree}-${event.octave}-${event.accidental}`

        if (event.type === 'noteOn') {
            this.activeNotes.set(key, {
                start: relativeTimeInBeats,
                degree: event.degree,
                octave: event.octave,
                accidental: event.accidental,
                velocity: event.velocity ?? 0.8
            })
            return null
        } else {
            const activeNote = this.activeNotes.get(key)
            if (activeNote) {
                const note: Note = {
                    degree: activeNote.degree,
                    octave: activeNote.octave,
                    accidental: activeNote.accidental,
                    start: activeNote.start,
                    duration: Math.max(0.01, relativeTimeInBeats - activeNote.start),
                    expression: {
                        velocity: activeNote.velocity,
                        articulation: 'lead',
                        glide: 0,
                        timingOffset: 0,
                        vibrato: 0
                    }
                }
                this.recordedNotes.push(note)
                this.activeNotes.delete(key)
                return note
            }
        }
        return null
    }

    getNotes(): Note[] {
        return this.recordedNotes
    }
}
