<script setup lang="ts">
import { useMusicStore } from '../../stores/music'
import { useAudioEngine } from '../../composables/useAudioEngine'

const musicStore = useMusicStore()
const { playProject, stopProject } = useAudioEngine()

const togglePlay = () => musicStore.isPlaying ? stopProject() : playProject()

const formattedTime = computed(() => {
  const b = musicStore.currentTime
  return `${Math.floor(b / 4) + 1}.${Math.floor(b % 4) + 1}.${Math.floor((b % 1) * 4) + 1}`
})

const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
</script>

<template>
  <header class="h-14 bg-[#2a2a2a] border-b border-black flex items-center px-4 justify-between shrink-0 z-50 relative">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-xs">N</div>
        <span class="font-bold text-sm tracking-tight">NextMusic</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="flex bg-black/50 rounded border border-white/10 p-1">
        <button @click="togglePlay" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors" :class="{ 'text-green-500': musicStore.isPlaying }">
          <div :class="musicStore.isPlaying ? 'i-ph-stop-fill' : 'i-ph-play-fill'"></div>
        </button>
        <button @click="musicStore.toggleRecording" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors" :class="{ 'text-red-500': musicStore.isRecording }">
          <div class="i-ph-circle-fill text-xs" :class="{ 'animate-pulse': musicStore.isRecording }"></div>
        </button>
      </div>

      <div class="bg-black border border-white/10 h-10 px-4 flex items-center gap-6 font-mono text-blue-400 rounded shadow-inner min-w-[280px]">
        <div class="flex flex-col items-center">
          <span class="text-[8px] text-blue-900 uppercase">Beats</span>
          <span class="text-lg leading-none">{{ formattedTime }}</span>
        </div>
        <div class="w-px h-6 bg-white/5"></div>
        <div class="flex flex-col items-center">
          <span class="text-[8px] text-blue-900 uppercase">Tempo</span>
          <input v-model.number="musicStore.project.tempo" type="number" class="bg-transparent w-10 text-center text-lg leading-none focus:outline-none" />
        </div>
        <div class="w-px h-6 bg-white/5"></div>
        <div class="flex flex-col items-center">
          <span class="text-[8px] text-blue-900 uppercase">Key</span>
          <select v-model="musicStore.project.key.root" class="bg-transparent text-sm focus:outline-none appearance-none cursor-pointer">
            <option v-for="(n, i) in rootNotes" :key="n" :value="60 + i" class="bg-[#1a1a1a]">{{ n }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-bold transition-colors">EXPORT</button>
    </div>
  </header>
</template>
