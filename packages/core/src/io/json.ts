import { MusicProjectSchema, MusicProject, TrackSchema, Track, NoteSchema } from '../types/input'

// 验证项目整体信息合规性
export function validateMusicProject(data: unknown): MusicProject {
    return MusicProjectSchema.parse(data)
}

// 安全验证
export function safeValidateMusicProject(data: unknown) {
    return MusicProjectSchema.safeParse(data)
}