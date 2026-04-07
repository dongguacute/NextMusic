import { defineStore } from 'pinia'
import { 
  type MusicProject, 
  type Note, 
  type Track, 
  type QuantizeOptions,
  Quantizer,
  Transformer,
  Recorder,
  safeValidateMusicProject
} from '@netxmusic/core'

export const useMusicStore = defineStore('music', () => {
  const STORAGE_KEY = 'nextmusic_project'

  // --- 状态定义 ---
  const project = ref<MusicProject>({
    name: 'New Project',
    tempo: 120,
    timeSignature: [4, 4],
    key: { root: 60, scale: 'major' },
    tracks: [
      {
        id: 'track-1',
        name: 'Grand Piano',
        instrument: 'piano',
        volume: 0.8,
        isMuted: false,
        isSolo: false,
        notes: []
      }
    ],
    loop: { enabled: false, start: 0, end: 4 }
  })

  // --- 持久化逻辑 ---
  const saveProject = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project.value))
  }

  const loadProject = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        const result = safeValidateMusicProject(data)
        if (result.success) {
          project.value = result.data
        } else {
          console.warn('Saved project is invalid:', result.error)
        }
      } catch (e) {
        console.error('Failed to load project:', e)
      }
    }
  }

  const isPlaying = ref(false)
  const isRecording = ref(false)
  const currentTime = ref(0) // 当前播放位置（拍数）
  const selectedTrackId = ref('track-1')
  const selectedNoteIndices = ref<Set<number>>(new Set())
  
  const gridSettings = ref({
    snapEnabled: true,
    gridSize: 16
  })

  // 录制器实例（仅客户端）
  const recorder = ref<Recorder | null>(null)
  
  onMounted(() => {
    recorder.value = new Recorder()
    loadProject()
  })

  // 自动保存
  watch(project, () => {
    saveProject()
  }, { deep: true })

  // --- 项目与音轨管理 ---
  const selectedTrack = computed(() => project.value.tracks.find(t => t.id === selectedTrackId.value))

  const addTrack = (name = 'New Track', instrument: any = 'synth') => {
    const id = `track-${Date.now()}`
    project.value.tracks.push({
      id,
      name,
      instrument,
      volume: 0.8,
      isMuted: false,
      isSolo: false,
      notes: []
    })
    selectedTrackId.value = id
  }

  const removeTrack = (id: string) => {
    const idx = project.value.tracks.findIndex(t => t.id === id)
    if (idx !== -1 && project.value.tracks.length > 1) {
      project.value.tracks.splice(idx, 1)
      if (selectedTrackId.value === id) {
        selectedTrackId.value = project.value.tracks[0].id
      }
    }
  }

  // --- 音符操作 ---
  const addNote = (trackId: string, note: Note) => {
    const track = project.value.tracks.find(t => t.id === trackId)
    if (track) track.notes.push(note)
  }

  const removeSelectedNotes = () => {
    const track = project.value.tracks.find(t => t.id === selectedTrackId.value)
    if (track) {
      const sortedIndices = Array.from(selectedNoteIndices.value).sort((a, b) => b - a)
      sortedIndices.forEach(idx => track.notes.splice(idx, 1))
      selectedNoteIndices.value.clear()
    }
  }

  // --- 引擎功能集成 ---
  const applyQuantize = (options: QuantizeOptions) => {
    const track = project.value.tracks.find(t => t.id === selectedTrackId.value)
    if (track && selectedNoteIndices.value.size > 0) {
      selectedNoteIndices.value.forEach(idx => {
        track.notes[idx] = Quantizer.quantizeNote(track.notes[idx], options)
      })
    }
  }

  const applyTranspose = (semitones: number) => {
    const track = project.value.tracks.find(t => t.id === selectedTrackId.value)
    if (track && selectedNoteIndices.value.size > 0) {
      const notesToTransform = Array.from(selectedNoteIndices.value).map(idx => track.notes[idx])
      const transformed = Transformer.transpose(notesToTransform, semitones)
      Array.from(selectedNoteIndices.value).forEach((idx, i) => {
        track.notes[idx] = transformed[i]
      })
    }
  }

  // --- 播放与录制控制 ---
  let playbackInterval: any = null

  const startPlayback = () => {
    if (isPlaying.value) return
    isPlaying.value = true
    const startTimeStamp = Date.now()
    const startPos = currentTime.value

    playbackInterval = requestAnimationFrame(function animate() {
      const elapsed = (Date.now() - startTimeStamp) / 1000
      const elapsedBeats = elapsed * (project.value.tempo / 60)
      let nextPos = startPos + elapsedBeats

      if (project.value.loop?.enabled) {
        const { start, end } = project.value.loop
        const len = end - start
        if (nextPos >= end) {
          // 重新同步开始时间以保持平滑
          const loopCount = Math.floor((nextPos - start) / len)
          // 这里简化处理，实际可能需要更精确的同步
          if (nextPos >= end) nextPos = start + ((nextPos - start) % len)
        }
      }
      currentTime.value = nextPos
      if (isPlaying.value) playbackInterval = requestAnimationFrame(animate)
    })
  }

  const stopPlayback = () => {
    isPlaying.value = false
    if (playbackInterval) {
      cancelAnimationFrame(playbackInterval)
      playbackInterval = null
    }
  }

  const seekTo = (beats: number) => {
    currentTime.value = Math.max(0, beats)
    if (isPlaying.value) {
      stopPlayback()
      startPlayback()
    }
  }

  const toggleRecording = () => {
    if (isRecording.value) {
      isRecording.value = false
      stopPlayback()
      const newNotes = recorder.value?.stop() || []
      const track = project.value.tracks.find(t => t.id === selectedTrackId.value)
      if (track) track.notes.push(...newNotes)
    } else {
      isRecording.value = true
      recorder.value?.start(Date.now())
      startPlayback()
    }
  }

  const handleInputEvent = (degree: number, octave: number, accidental: number, type: 'noteOn' | 'noteOff') => {
    if (isRecording.value) {
      recorder.value?.processEvent({
        degree, octave, accidental,
        timestamp: Date.now(),
        type
      }, project.value.tempo)
    }
  }

  return {
    project, isPlaying, isRecording, currentTime, selectedTrackId, selectedNoteIndices,
    selectedTrack, gridSettings,
    addTrack, removeTrack, addNote, removeSelectedNotes,
    applyQuantize, applyTranspose,
    startPlayback, stopPlayback, toggleRecording, handleInputEvent
  }
})
