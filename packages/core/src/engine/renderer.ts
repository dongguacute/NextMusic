import { Track, MusicProject } from '../types/input'
import { degreeToMidi } from '../utils'

export interface AudioEvent {
  time: number
  duration: number
  midi: number
  velocity: number
}

/**
 * 将轨道中的音符渲染为音频事件
 * @param track 待渲染的轨道
 * @param project 音乐项目上下文（包含调式、速度等信息）
 * @returns 音频事件列表
 */
export function renderTrack(track: Track, project: MusicProject): AudioEvent[] {
  return track.notes.map(note => {
    const midi = degreeToMidi(
      note.degree,
      note.octave,
      project.key.root,
      0 // 目前默认 accidental 为 0
    )

    return {
      time: note.start,
      duration: note.duration,
      midi: midi,
      velocity: 0.8 // 默认力度，后续可从 NoteSchema 中获取
    }
  })
}
