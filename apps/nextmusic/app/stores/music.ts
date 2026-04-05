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
  const playbackTimer = ref<any>(null)
  const playbackTimeout = ref<any>(null)

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
    startPlaybackTimer,
    stopPlaybackTimer
  }
})
