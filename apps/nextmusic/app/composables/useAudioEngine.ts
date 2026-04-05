import { SynthEngine, type AudioEvent } from '@netxmusic/core'
import { useMusicStore } from '../stores/music'

export const useAudioEngine = () => {
  const audioCtx = ref<AudioContext | null>(null)
  const musicStore = useMusicStore()
  const activeOscillators = new Map<string, { osc: OscillatorNode, gain: GainNode, startTime: number }>()

  const initAudio = () => {
    if (!audioCtx.value) {
      audioCtx.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtx.value.state === 'suspended') {
      audioCtx.value.resume()
    }
  }

  const playNote = (midi: number, trackId: string) => {
    initAudio()
    if (!audioCtx.value) return

    const track = musicStore.project.tracks.find(t => t.id === trackId)
    if (!track) return

    const osc = audioCtx.value.createOscillator()
    const gainNode = audioCtx.value.createGain()

    const timbre = track.timbre || { type: 'sine', envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 } }
    osc.type = (timbre.type === 'sine' || timbre.type === 'square' || timbre.type === 'sawtooth' || timbre.type === 'triangle') 
      ? timbre.type as OscillatorType 
      : 'sine'
    
    const freq = 440 * Math.pow(2, (midi - 69) / 12)
    const now = audioCtx.value.currentTime
    osc.frequency.setValueAtTime(freq, now)
    
    const { attack, sustain } = timbre.envelope
    const velocity = 0.8

    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(velocity, now + attack)
    gainNode.gain.setValueAtTime(velocity * sustain, now + attack)

    osc.connect(gainNode)
    gainNode.connect(audioCtx.value.destination)

    osc.start(now)
    
    const key = `${trackId}-${midi}`
    activeOscillators.set(key, { osc, gain: gainNode, startTime: now })

    if (musicStore.isRecording) {
      // 记录开始时间（以小节为单位）
      const startInBeats = (now - musicStore.startTime) * (musicStore.project.tempo / 60)
      // 这里我们暂时存储正在录制的音符，等 release 时再加入 store
      // 为了简单起见，我们直接在 store 中处理录制逻辑
    }
  }

  const stopNote = (midi: number, trackId: string) => {
    const key = `${trackId}-${midi}`
    const active = activeOscillators.get(key)
    if (!active || !audioCtx.value) return

    const { osc, gain, startTime } = active
    const track = musicStore.project.tracks.find(t => t.id === trackId)
    const timbre = track?.timbre || { type: 'sine', envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 } }
    const { release } = timbre.envelope
    
    const now = audioCtx.value.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + release)

    osc.stop(now + release)
    activeOscillators.delete(key)

    if (musicStore.isRecording) {
      const durationInBeats = (now - startTime) * (musicStore.project.tempo / 60)
      const startInBeats = (startTime - musicStore.startTime) * (musicStore.project.tempo / 60)
      
      // 计算 degree 和 octave (简化处理：假设 root 是 60 C4)
      const relativeMidi = midi - 60
      const octave = Math.floor(relativeMidi / 12)
      const semitone = ((relativeMidi % 12) + 12) % 12
      // 简化映射：只映射大调音阶
      const majorScaleMap = [1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6, 7]
      const degree = majorScaleMap[semitone]

      musicStore.addNote(trackId, {
        degree,
        octave,
        start: startInBeats,
        duration: Math.max(0.1, durationInBeats),
        expression: { velocity: 0.8 }
      })
    }
  }

  const playProject = () => {
    initAudio()
    if (!audioCtx.value) return

    const now = audioCtx.value.currentTime
    musicStore.isPlaying = true
    musicStore.startTime = now

    musicStore.project.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const startOffset = note.start * (60 / musicStore.project.tempo)
        const duration = note.duration * (60 / musicStore.project.tempo)
        
        const midi = 60 + note.octave * 12 + [0, 2, 4, 5, 7, 9, 11][note.degree - 1]
        const freq = 440 * Math.pow(2, (midi - 69) / 12)
        
        const osc = audioCtx.value!.createOscillator()
        const gainNode = audioCtx.value!.createGain()
        const timbre = track.timbre || { type: 'sine', envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 } }
        
        osc.type = (timbre.type === 'sine' || timbre.type === 'square' || timbre.type === 'sawtooth' || timbre.type === 'triangle') 
          ? timbre.type as OscillatorType 
          : 'sine'
        
        osc.frequency.setValueAtTime(freq, now + startOffset)
        
        const { attack, decay, sustain, release } = timbre.envelope
        const velocity = note.expression?.velocity || 0.8

        gainNode.gain.setValueAtTime(0, now + startOffset)
        gainNode.gain.linearRampToValueAtTime(velocity, now + startOffset + attack)
        gainNode.gain.linearRampToValueAtTime(velocity * sustain, now + startOffset + attack + decay)
        gainNode.gain.setValueAtTime(velocity * sustain, now + startOffset + duration)
        gainNode.gain.linearRampToValueAtTime(0, now + startOffset + duration + release)

        osc.connect(gainNode)
        gainNode.connect(audioCtx.value!.destination)

        osc.start(now + startOffset)
        osc.stop(now + startOffset + duration + release)
      })
    })

    const maxNoteEnd = Math.max(...musicStore.project.tracks.flatMap(t => t.notes.map(n => n.start + n.duration)), 0)
    const totalDuration = maxNoteEnd * (60 / musicStore.project.tempo)
    
    musicStore.startPlaybackTimer(totalDuration)
  }

  const stopProject = () => {
    musicStore.isPlaying = false
    musicStore.stopPlaybackTimer()
    // 注意：Web Audio API 的调度无法直接“停止”已调度的未来事件，
    // 除非我们保存所有正在运行的节点。这里先做状态重置。
  }

  const startRecording = () => {
    initAudio()
    if (!audioCtx.value) return
    musicStore.isRecording = true
    musicStore.startTime = audioCtx.value.currentTime
    musicStore.startPlaybackTimer(3600) // 录制最长 1 小时
  }

  const stopRecording = () => {
    musicStore.isRecording = false
    musicStore.stopPlaybackTimer()
  }

  return {
    isPlaying: computed(() => musicStore.isPlaying),
    isRecording: computed(() => musicStore.isRecording),
    playProject,
    stopProject,
    playNote,
    stopNote,
    startRecording,
    stopRecording,
    initAudio
  }
}
