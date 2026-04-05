import { SynthEngine, type AudioEvent } from '@netxmusic/core'

export const useAudioEngine = () => {
  const audioCtx = ref<AudioContext | null>(null)
  const isPlaying = ref(false)
  const currentProject = ref<any>(null)

  const initAudio = () => {
    if (!audioCtx.value) {
      audioCtx.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtx.value.state === 'suspended') {
      audioCtx.value.resume()
    }
  }

  const playEvent = (event: any, startTime: number) => {
    if (!audioCtx.value) return

    const osc = audioCtx.value.createOscillator()
    const gainNode = audioCtx.value.createGain()

    // 设置波形
    const timbre = event.timbre || { type: 'sine', envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 } }
    osc.type = (timbre.type === 'sine' || timbre.type === 'square' || timbre.type === 'sawtooth' || timbre.type === 'triangle') 
      ? timbre.type as OscillatorType 
      : 'sine'
    
    // 使用 core 中的 midiToFrequency 转换
    const freq = 440 * Math.pow(2, (event.midi - 69) / 12)
    osc.frequency.setValueAtTime(freq, startTime)
    
    // 应用 ADSR 包络
    const { attack, decay, sustain, release } = timbre.envelope
    const duration = event.duration
    const velocity = event.velocity || 0.8

    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(velocity, startTime + attack)
    gainNode.gain.linearRampToValueAtTime(velocity * sustain, startTime + attack + decay)
    gainNode.gain.setValueAtTime(velocity * sustain, startTime + duration)
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration + release)

    osc.connect(gainNode)
    gainNode.connect(audioCtx.value.destination)

    osc.start(startTime)
    osc.stop(startTime + duration + release)
  }

  const playProject = (project: any) => {
    initAudio()
    if (!audioCtx.value) return

    const now = audioCtx.value.currentTime
    isPlaying.value = true
    currentProject.value = project

    project.tracks.forEach((track: any) => {
      track.events.forEach((event: AudioEvent) => {
        playEvent(event, now + event.time)
      })
    })

    // 简单估算结束时间
    const maxDuration = Math.max(...project.tracks.flatMap((t: any) => t.events.map((e: any) => e.time + e.duration + (e.timbre.envelope.release || 0))))
    setTimeout(() => {
      isPlaying.value = false
    }, maxDuration * 1000)
  }

  return {
    isPlaying,
    playProject,
    initAudio
  }
}
