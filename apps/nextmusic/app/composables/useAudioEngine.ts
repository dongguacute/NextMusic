import { renderTrack, SynthEngine, degreeToMidi } from '@netxmusic/core'
import { useMusicStore } from '../stores/music'

export const useAudioEngine = () => {
  const musicStore = useMusicStore()
  const audioCtx = ref<AudioContext | null>(null)
  const activeNodes = new Map<string, { osc: OscillatorNode, gain: GainNode }>()
  const scheduledNodes = ref<Array<{ osc: OscillatorNode, gain: GainNode }>>([])

  const initAudio = () => {
    if (!audioCtx.value) {
      audioCtx.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtx.value.state === 'suspended') audioCtx.value.resume()
  }

  // --- 实时演奏 ---
  const playNote = (degree: number, octave: number, accidental = 0) => {
    initAudio()
    if (!audioCtx.value) return

    const track = musicStore.project.tracks.find(t => t.id === musicStore.selectedTrackId)
    if (!track) return

    const midi = degreeToMidi(degree, octave, musicStore.project.key.root, musicStore.project.key.scale, accidental)
    const freq = 440 * Math.pow(2, (midi - 69) / 12)
    const now = audioCtx.value.currentTime

    const osc = audioCtx.value.createOscillator()
    const gain = audioCtx.value.createGain()
    
    osc.type = (track.timbre?.oscillator || 'sine') as any
    osc.frequency.setValueAtTime(freq, now)
    
    const { attack = 0.01 } = track.timbre?.envelope || {}
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(track.volume, now + attack)

    osc.connect(gain)
    gain.connect(audioCtx.value.destination)
    osc.start(now)

    const key = `${degree}-${octave}-${accidental}`
    activeNodes.set(key, { osc, gain })
    
    musicStore.handleInputEvent(degree, octave, accidental, 'noteOn')
  }

  const stopNote = (degree: number, octave: number, accidental = 0) => {
    const key = `${degree}-${octave}-${accidental}`
    const node = activeNodes.get(key)
    if (!node || !audioCtx.value) return

    const track = musicStore.project.tracks.find(t => t.id === musicStore.selectedTrackId)
    const { release = 0.1 } = track?.timbre?.envelope || {}
    const now = audioCtx.value.currentTime

    node.gain.gain.cancelScheduledValues(now)
    node.gain.gain.setValueAtTime(node.gain.gain.value, now)
    node.gain.gain.linearRampToValueAtTime(0, now + release)
    node.osc.stop(now + release)

    activeNodes.delete(key)
    musicStore.handleInputEvent(degree, octave, accidental, 'noteOff')
  }

  // --- 项目播放 ---
  const playProject = () => {
    initAudio()
    if (!audioCtx.value) return
    
    stopProject() // 清理旧任务
    musicStore.startPlayback()
    const now = audioCtx.value.currentTime

    musicStore.project.tracks.forEach(track => {
      if (track.isMuted) return
      
      const events = renderTrack(track, musicStore.project)
      events.forEach(event => {
        const start = event.time * (60 / musicStore.project.tempo)
        const duration = event.duration * (60 / musicStore.project.tempo)
        const freq = 440 * Math.pow(2, (event.midi - 69) / 12)

        const osc = audioCtx.value!.createOscillator()
        const gain = audioCtx.value!.createGain()
        
        osc.type = (track.timbre?.oscillator || 'sine') as any
        osc.frequency.setValueAtTime(freq, now + start)

        const { attack = 0.01, decay = 0.1, sustain = 0.5, release = 0.1 } = track.timbre?.envelope || {}
        const v = event.velocity

        gain.gain.setValueAtTime(0, now + start)
        gain.gain.linearRampToValueAtTime(v, now + start + attack)
        gain.gain.linearRampToValueAtTime(v * sustain, now + start + attack + decay)
        gain.gain.setValueAtTime(v * sustain, now + start + duration)
        gain.gain.linearRampToValueAtTime(0, now + start + duration + release)

        osc.connect(gain)
        gain.connect(audioCtx.value!.destination)
        osc.start(now + start)
        osc.stop(now + start + duration + release)

        scheduledNodes.value.push({ osc, gain })
      })
    })
  }

  const stopProject = () => {
    musicStore.stopPlayback()
    scheduledNodes.value.forEach(n => {
      try { n.osc.stop(); n.osc.disconnect(); n.gain.disconnect(); } catch(e) {}
    })
    scheduledNodes.value = []
  }

  return { playNote, stopNote, playProject, stopProject }
}
