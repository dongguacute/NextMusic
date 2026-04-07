<script setup lang="ts">
import { useMusicStore } from '../../stores/music'

const musicStore = useMusicStore()
</script>

<template>
  <div class="flex flex-col bg-[#252525] h-full border-r border-black/50 z-20 relative">
    <div v-for="track in musicStore.project.tracks" :key="track.id"
      @click="musicStore.selectedTrackId = track.id"
      class="h-[120px] border-b border-black/20 p-3 flex flex-col justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
      :class="{ 'bg-white/[0.05]': musicStore.selectedTrackId === track.id }"
    >
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold truncate">{{ track.name }}</span>
        <Icon name="ph:waveform-fill" class="text-blue-500 opacity-50" />
      </div>

      <div class="flex gap-1">
        <button @click.stop="track.isMuted = !track.isMuted" class="w-6 h-6 rounded bg-black/40 text-[9px] font-bold flex items-center justify-center border border-white/5" :class="{ 'bg-yellow-500 text-black': track.isMuted }">M</button>
        <button @click.stop="track.isSolo = !track.isSolo" class="w-6 h-6 rounded bg-black/40 text-[9px] font-bold flex items-center justify-center border border-white/5" :class="{ 'bg-blue-500 text-white': track.isSolo }">S</button>
        <button @click.stop="musicStore.selectedTrackId = track.id" class="w-6 h-6 rounded bg-black/40 text-[9px] font-bold flex items-center justify-center border border-white/5" :class="{ 'bg-red-600 text-white': musicStore.selectedTrackId === track.id && musicStore.isRecording }">R</button>
      </div>

      <div class="h-1 bg-black/40 rounded-full overflow-hidden">
        <div class="h-full bg-blue-500" :style="{ width: `${track.volume * 100}%` }"></div>
      </div>
    </div>

    <button @click="musicStore.addTrack()" class="p-4 text-gray-500 hover:text-white transition-colors flex items-center justify-center">
      <Icon name="ph:plus-bold" />
    </button>
  </div>
</template>
