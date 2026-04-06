<script setup lang="ts">
import { useMusicStore } from '../../stores/music'

const musicStore = useMusicStore()

const getInstrumentIcon = (type: string) => {
  switch (type) {
    case 'piano': return 'i-ph-piano-fill'
    case 'guitar': return 'i-ph-guitar-fill'
    case 'synth': return 'i-ph-waveform-fill'
    default: return 'i-ph-music-note-fill'
  }
}

const selectTrack = (trackId: string) => {
  musicStore.selectedTrackId = trackId
}

const addTrack = () => {
  const id = `track-${musicStore.project.tracks.length + 1}`
  musicStore.project.tracks.push({
    id,
    name: `New Track ${musicStore.project.tracks.length + 1}`,
    instrument: 'synth',
    timbre: {
      type: 'sine',
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.3 }
    },
    notes: []
  })
  musicStore.selectedTrackId = id
}

const getTrackColor = (index: number) => {
  const colors = ['text-blue-500', 'text-green-500', 'text-red-500', 'text-orange-500', 'text-purple-500']
  return colors[index % colors.length]
}
</script>

<template>
  <div class="flex flex-col bg-[#252525]">
    <div 
      v-for="(track, index) in musicStore.project.tracks" 
      :key="track.id"
      @click="selectTrack(track.id)"
      class="h-32 border-b border-black/40 flex flex-col p-2 relative cursor-pointer transition-colors"
      :class="{ 'bg-[#2d2d2d]': musicStore.selectedTrackId === track.id }"
    >
      <!-- 顶部：音轨名称和图标 -->
      <div class="flex items-start justify-between mb-1">
        <div class="flex flex-col">
          <span class="text-11px font-bold text-gray-300 truncate w-24">{{ track.name }}</span>
          <div class="flex items-center gap-1 mt-1">
             <div class="i-ph-infinity text-8px text-gray-600"></div>
             <div class="i-ph-speaker-hifi text-8px text-gray-600"></div>
          </div>
        </div>
        <div :class="[getInstrumentIcon(track.instrument), getTrackColor(index)]" class="text-4xl opacity-80"></div>
      </div>

      <!-- 中间：MSR 控制组 -->
      <div class="flex items-center gap-1 mb-2">
        <button 
          @click.stop="musicStore.toggleMute(track.id)"
          class="w-5 h-5 rounded-sm text-9px font-bold flex items-center justify-center transition-all border border-black/20"
          :class="musicStore.trackStates[track.id]?.mute ? 'bg-yellow-500 text-black shadow-inner' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#444]'"
        >M</button>
        <button 
          @click.stop="musicStore.toggleSolo(track.id)"
          class="w-5 h-5 rounded-sm text-9px font-bold flex items-center justify-center transition-all border border-black/20"
          :class="musicStore.trackStates[track.id]?.solo ? 'bg-blue-500 text-white shadow-inner' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#444]'"
        >S</button>
        <button class="w-5 h-5 bg-[#3a3a3a] rounded-sm text-9px font-bold flex items-center justify-center border border-black/20 text-red-900/50 hover:text-red-500 transition-colors">R</button>
      </div>

      <!-- 底部：音量推子和旋钮 -->
      <div class="flex items-center gap-3">
        <!-- 音量推子 (Fader) -->
        <div class="flex-1 h-4 bg-black/40 rounded-full relative border border-black/20 shadow-inner group">
          <div class="absolute inset-y-0.5 left-0.5 w-3/4 bg-gradient-to-r from-gray-600 to-gray-400 rounded-full shadow-lg"></div>
          <div class="absolute top-1/2 left-3/4 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-[#ccc] rounded-full border border-gray-400 shadow-md cursor-pointer group-hover:bg-white transition-colors"></div>
        </div>
        <!-- 旋钮 (Pan Knob) -->
        <div class="w-6 h-6 rounded-full bg-[#3a3a3a] border border-black/40 relative flex items-center justify-center shadow-md">
          <div class="w-0.5 h-2 bg-gray-500 absolute top-0.5 rounded-full"></div>
          <div class="w-1 h-1 bg-black/40 rounded-full"></div>
        </div>
      </div>

      <!-- 选中指示条 -->
      <div v-if="musicStore.selectedTrackId === track.id" class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[2px_0_10px_rgba(59,130,246,0.5)]"></div>
    </div>

    <!-- 添加音轨按钮 -->
    <button 
      @click="addTrack"
      class="h-10 border-b border-black/40 flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-[#2a2a2a] transition-all"
    >
      <div class="i-ph-plus-bold text-lg"></div>
    </button>
  </div>
</template>
