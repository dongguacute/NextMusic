import { Note, MusicProject, NoteSchema, Track } from '../types/input'
import { TimbreParams } from '../types/timbre'
import { Expression } from '../types/expression'
import { degreeToMidi } from '../utils'

export interface AudioEvent {
  time: number
  duration: number
  midi: number
  velocity: number
  timbre?: TimbreParams
  expression?: Expression
}

/**
 * 实时渲染单个音符：模拟前端实时传入数据
 */
export function renderNote(note: Note, projectContext: { root: number, scale: string, timbre?: TimbreParams }): AudioEvent {
  const midi = degreeToMidi(
    note.degree,
    note.octave,
    projectContext.root,
    projectContext.scale,
    0
  )

  return {
    time: note.start + (note.expression?.timingOffset ?? 0),
    duration: note.duration,
    midi: midi,
    velocity: note.expression?.velocity ?? 0.8,
    timbre: projectContext.timbre,
    expression: note.expression
  }
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
      project.key.scale,
      0 // 目前默认 accidental 为 0
    )

    return {
      time: note.start + (note.expression?.timingOffset ?? 0),
      duration: note.duration,
      midi: midi,
      velocity: note.expression?.velocity ?? 0.8,
      timbre: track.timbre,
      expression: note.expression
    }
  })
}
