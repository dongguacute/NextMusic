<script setup lang="ts">
import { useMusicStore } from '../../stores/music'
import { useAudioEngine } from '../../composables/useAudioEngine'

const musicStore = useMusicStore()
const { playProject, stopProject, startRecording, stopRecording, isPlaying, isRecording } = useAudioEngine()

const togglePlay = () => {
  if (isPlaying.value) {
    stopProject()
  } else {
    playProject()
  }
}

const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

const exportProject = () => {
  const data = JSON.stringify(musicStore.project, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'project.json'
  a.click()
}
</script>

<template>
  <header class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        NextMusic Studio
      </h1>
      <p class="text-gray-400 text-sm mt-1">Professional Web Music Creation</p>
    </div>
    
    <div class="flex items-center gap-4 bg-gray-900 p-2 rounded-xl border border-gray-800">
      <div class="flex items-center gap-2 px-4 border-r border-gray-800">
        <span class="text-xs text-gray-500 uppercase font-bold">Tempo</span>
        <input 
          v-model.number="musicStore.project.tempo" 
          type="number" 
          class="bg-transparent w-12 text-center font-mono focus:outline-none"
        />
      </div>
      
      <div class="flex gap-2">
        <button 
          @click="togglePlay"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-500 transition-all"
        >
          <span>{{ isPlaying ? '■' : '▶' }}</span>
        </button>
        
        <button 
          @click="toggleRecording"
          :class="[
            'w-10 h-10 flex items-center justify-center rounded-full transition-all',
            isRecording ? 'bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'
          ]"
        >
          <span class="text-xl">●</span>
        </button>

        <button 
          @click="exportProject"
          class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          Export
        </button>
      </div>
    </div>
  </header>
</template>
