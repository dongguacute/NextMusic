import { defineStore } from 'pinia'
import { type MusicProject, type Note, type Track } from '@netxmusic/core'

export const useMusicStore = defineStore('music', () => {
  const project = ref<MusicProject>({
    tempo: 120,
    timeSignature: [4, 4],
    key: {
      root: 60,
      scale: 'major'
    },
    tracks: [
      {
        id: 'track-1',
        name: 'Synth Lead',
        instrument: 'synth',
        timbre: {
          type: 'sine',
          envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.5,
            release: 0.3
          }
        },
        notes: []
      }
    ]
  })

  const isRecording = ref(false)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const startTime = ref(0)
  const selectedTrackId = ref('track-1')
  const selectedNoteIndices = ref<Record<string, Set<number>>>({})
  const playbackTimer = ref<any>(null)
  const playbackTimeout = ref<any>(null)

  // 音轨状态：Mute/Solo
  const trackStates = ref<Record<string, { mute: boolean, solo: boolean }>>({})

  const toggleMute = (trackId: string) => {
    if (!trackStates.value[trackId]) trackStates.value[trackId] = { mute: false, solo: false }
    trackStates.value[trackId].mute = !trackStates.value[trackId].mute
  }

  const toggleSolo = (trackId: string) => {
    if (!trackStates.value[trackId]) trackStates.value[trackId] = { mute: false, solo: false }
    trackStates.value[trackId].solo = !trackStates.value[trackId].solo
  }

  const isTrackActive = (trackId: string) => {
    const state = trackStates.value[trackId]
    if (!state) return true
    
    // 如果有任何音轨处于 Solo 状态，只有 Solo 的音轨才发声
    const hasSolo = Object.values(trackStates.value).some(s => s.solo)
    if (hasSolo) return state.solo
    
    // 否则看是否 Mute
    return !state.mute
  }

  const addNote = (trackId: string, note: Note) => {
    const track = project.value.tracks.find(t => t.id === trackId)
    if (track) {
      track.notes.push(note)
    }
  }

  const startPlaybackTimer = (durationInSeconds: number) => {
    if (playbackTimer.value) clearInterval(playbackTimer.value)
    if (playbackTimeout.value) clearTimeout(playbackTimeout.value)

    const start = Date.now()
    playbackTimer.value = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      currentTime.value = elapsed * (project.value.tempo / 60)
    }, 16)

    playbackTimeout.value = setTimeout(() => {
      stopPlaybackTimer()
      isPlaying.value = false
      isRecording.value = false
    }, durationInSeconds * 1000 + 500)
  }

  const stopPlaybackTimer = () => {
    if (playbackTimer.value) {
      clearInterval(playbackTimer.value)
      playbackTimer.value = null
    }
    if (playbackTimeout.value) {
      clearTimeout(playbackTimeout.value)
      playbackTimeout.value = null
    }
    currentTime.value = 0
  }

  const updateNote = (trackId: string, noteIndex: number, newNote: Partial<Note>) => {
    const track = project.value.tracks.find(t => t.id === trackId)
    if (track && track.notes[noteIndex]) {
      track.notes[noteIndex] = { ...track.notes[noteIndex], ...newNote }
    }
  }

  const removeNote = (trackId: string, noteIndex: number) => {
    const track = project.value.tracks.find(t => t.id === trackId)
    if (track) {
      track.notes.splice(noteIndex, 1)
    }
  }

  return {
    project,
    isRecording,
    isPlaying,
    currentTime,
    startTime,
    addNote,
    updateNote,
    removeNote,
    selectedTrackId,
    trackStates,
    toggleMute,
    toggleSolo,
    isTrackActive,
    selectedNoteIndices,
    startPlaybackTimer,
    stopPlaybackTimer
  }
})
