<script setup lang="ts">
import { processMusicProject } from '@netxmusic/core'
import { useAudioEngine } from './composables/useAudioEngine'

const { playProject, isPlaying } = useAudioEngine()

const sampleProject = {
  id: 'test-project',
  name: 'Sample Project',
  tempo: 120,
  timeSignature: [4, 4],
  key: {
    root: 60, // C4
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
      notes: [
        { degree: 1, octave: 0, start: 0, duration: 0.5, expression: { velocity: 0.8 } },
        { degree: 3, octave: 0, start: 0.5, duration: 0.5, expression: { velocity: 0.8 } },
        { degree: 5, octave: 0, start: 1.0, duration: 0.5, expression: { velocity: 0.8 } },
        { degree: 1, octave: 1, start: 1.5, duration: 1.0, expression: { velocity: 0.8 } }
      ]
    }
  ]
}

const handlePlay = () => {
  const result = processMusicProject(sampleProject)
  if (result.success) {
    playProject(result.data)
  } else {
    console.error('Failed to process project:', result.error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
    <h1 class="text-4xl font-bold mb-8">NextMusic</h1>
    
    <div class="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
      <h2 class="text-xl font-semibold mb-4">Sample Track</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
          <span>Synth Lead (Sine Wave)</span>
          <button 
            @click="handlePlay"
            :disabled="isPlaying"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-full font-medium transition-colors"
          >
            {{ isPlaying ? 'Playing...' : 'Play Demo' }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-12 text-gray-400 text-sm">
      Powered by @netxmusic/core
    </div>
  </div>
</template>
