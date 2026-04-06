import { MusicProject } from './types/input'
import { resolveMusicProject } from './engine/resolver'
import { renderTrack, AudioEvent } from './engine/renderer'

export * from './types/input'
export * from './types/timbre'
export * from './types/expression'
export * from './engine/resolver'
export * from './engine/renderer'
export * from './engine/synth'
export * from './engine/quantizer'
export * from './engine/transformer'
export * from './engine/recorder'
export * from './utils'

export interface RenderedProject {
  tempo: number
  timeSignature: [number, number]
  tracks: {
    id: string
    name: string
    instrument: string
    events: AudioEvent[]
  }[]
}

/**
 * 核心入口函数：解析并渲染整个音乐项目
 */
export function processMusicProject(data: unknown): { success: true, data: RenderedProject } | { success: false, error: string } {
  const resolved = resolveMusicProject(data)
  if (!resolved.success || !resolved.data) {
    return { success: false, error: resolved.error || 'Unknown error' }
  }

  const project = resolved.data as MusicProject
  
  const renderedTracks = project.tracks.map(track => ({
    id: track.id,
    name: track.name,
    instrument: track.instrument,
    events: renderTrack(track, project)
  }))

  return {
    success: true,
    data: {
      tempo: project.tempo,
      timeSignature: project.timeSignature,
      tracks: renderedTracks
    }
  }
}
