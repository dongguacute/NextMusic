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

// 格式化节拍显示 (1. 1. 1. 1)
const formattedTime = computed(() => {
  const totalBeats = musicStore.currentTime
  const bar = Math.floor(totalBeats / 4) + 1
  const beat = Math.floor(totalBeats % 4) + 1
  return `${bar}. ${beat}. 1. 1`
})

const rootNotes = [
  { label: 'C', value: 60 },
  { label: 'C#', value: 61 },
  { label: 'D', value: 62 },
  { label: 'D#', value: 63 },
  { label: 'E', value: 64 },
  { label: 'F', value: 65 },
  { label: 'F#', value: 66 },
  { label: 'G', value: 67 },
  { label: 'G#', value: 68 },
  { label: 'A', value: 69 },
  { label: 'A#', value: 70 },
  { label: 'B', value: 71 },
]
const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}
</script>

<template>
  <header class="h-14 bg-[#2a2a2a] border-b border-black flex items-center px-4 justify-between shrink-0 shadow-lg z-20">
    <!-- 左侧：Logo & 菜单 -->
    <div class="flex items-center gap-6">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center font-bold text-xs">N</div>
        <span class="font-bold text-sm tracking-tight">NextMusic</span>
      </div>
      
      <nav class="flex gap-4 text-xs text-gray-400">
        <button class="hover:text-white transition-colors">File</button>
        <button class="hover:text-white transition-colors">Edit</button>
        <button class="hover:text-white transition-colors">Track</button>
        <button class="hover:text-white transition-colors">Mixer</button>
      </nav>
    </div>
    
    <!-- 中间：LCD 控制面板 -->
    <div class="flex items-center gap-1">
      <!-- 播放控制 -->
      <div class="flex items-center bg-[#1a1a1a] rounded-l-md border border-[#444] p-1 gap-1">
        <button 
          @click="togglePlay" 
          class="w-8 h-8 flex items-center justify-center rounded transition-colors"
          :class="isPlaying ? 'text-green-500 bg-[#333]' : 'text-gray-400 hover:bg-[#333]'"
        >
          <div :class="isPlaying ? 'i-ph-stop-fill' : 'i-ph-play-fill'" class="text-sm"></div>
        </button>
        <button 
          @click="toggleRecording" 
          class="w-8 h-8 flex items-center justify-center rounded transition-colors"
          :class="isRecording ? 'text-red-500 bg-[#333]' : 'text-gray-400 hover:bg-[#333]'"
        >
          <div class="i-ph-circle-fill text-xs" :class="{ 'animate-pulse': isRecording }"></div>
        </button>
      </div>

      <!-- LCD 显示屏 -->
      <div class="bg-black border border-[#444] h-10 px-4 flex items-center gap-6 font-mono text-blue-400 shadow-inner min-w-300px">
        <!-- 时间/节拍 -->
        <div class="flex flex-col items-center">
          <span class="text-8px text-blue-900 leading-none uppercase">Beats</span>
          <span class="text-lg leading-none">{{ formattedTime }}</span>
        </div>
        
        <!-- 速度 -->
        <div class="flex flex-col items-center border-l border-blue-900/30 pl-4">
          <span class="text-8px text-blue-900 leading-none uppercase">Tempo</span>
          <div class="flex items-center">
            <input 
              v-model.number="musicStore.project.tempo" 
              type="number" 
              class="bg-transparent w-10 text-center text-lg leading-none focus:outline-none appearance-none"
            />
          </div>
        </div>

        <!-- 调式 -->
        <div class="flex flex-col items-center border-l border-blue-900/30 pl-4">
          <span class="text-8px text-blue-900 leading-none uppercase">Key</span>
          <div class="flex gap-1 text-sm">
            <select v-model="musicStore.project.key.root" class="bg-transparent focus:outline-none appearance-none cursor-pointer">
              <option v-for="note in rootNotes" :key="note.value" :value="note.value" class="bg-[#1a1a1a]">{{ note.label }}</option>
            </select>
            <select v-model="musicStore.project.key.scale" class="bg-transparent focus:outline-none appearance-none cursor-pointer">
              <option value="major" class="bg-[#1a1a1a]">Maj</option>
              <option value="minor" class="bg-[#1a1a1a]">Min</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 右侧辅助工具 -->
      <div class="flex items-center bg-[#1a1a1a] rounded-r-md border border-[#444] p-1">
        <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-[#333] text-gray-400 transition-colors">
          <div class="i-ph-metronome-fill text-sm"></div>
        </button>
      </div>
    </div>

    <!-- 右侧：导出 & 设置 -->
    <div class="flex items-center gap-3">
      <button class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-11px font-bold transition-colors text-white">
        SHARE
      </button>
      <div class="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-10px text-white">
        JD
      </div>
    </div>
  </header>
</template>

<style scoped>
select {
  text-align-last: center;
}
/* 移除 number 输入框的箭头 */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
