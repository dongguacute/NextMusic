<script setup lang="ts">
import { useMusicStore } from '../../stores/music'
import { type Articulation } from '@netxmusic/core'

const musicStore = useMusicStore()
const selectedTrack = computed(() => {
  return musicStore.project.tracks.find(t => t.id === musicStore.selectedTrackId) || musicStore.project.tracks[0]
})

const articulations: { label: string, value: Articulation, icon: string }[] = [
  { label: 'Pad (平滑)', value: 'pad', icon: 'i-ph-cloud-fill' },
  { label: 'Lead (强烈)', value: 'lead', icon: 'i-ph-lightning-fill' },
  { label: 'Pluck (跳跃)', value: 'pluck', icon: 'i-ph-guitar-fill' }
]

const updateArticulation = (art: Articulation) => {
  if (selectedTrack.value) {
    selectedTrack.value.notes.forEach(note => {
      if (!note.expression) {
        note.expression = { articulation: art, velocity: 0.8, glide: 0, timingOffset: 0 }
      } else {
        note.expression.articulation = art
      }
    })
  }
}

const currentArticulation = computed(() => {
  return selectedTrack.value?.notes[0]?.expression?.articulation || 'lead'
})

const deleteTrack = () => {
  if (musicStore.project.tracks.length <= 1) return
  const index = musicStore.project.tracks.findIndex(t => t.id === musicStore.selectedTrackId)
  if (index !== -1) {
    musicStore.project.tracks.splice(index, 1)
    musicStore.selectedTrackId = musicStore.project.tracks[0].id
  }
}
</script>

<template>
  <div class="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar h-full">
    <!-- 表达层 (Articulation) -->
    <div class="flex flex-col gap-2">
      <h3 class="text-10px font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <div class="i-ph-fingerprint-simple-fill"></div>
        Articulation
      </h3>
      <div class="grid grid-cols-1 gap-1">
        <button 
          v-for="art in articulations" 
          :key="art.value"
          @click="updateArticulation(art.value)"
          class="h-10 px-3 rounded flex items-center gap-3 text-xs transition-all border group"
          :class="currentArticulation === art.value 
            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' 
            : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:bg-[#252525] hover:border-[#444]'"
        >
          <div :class="art.icon" class="text-sm group-hover:scale-110 transition-transform"></div>
          <span class="font-medium">{{ art.label }}</span>
        </button>
      </div>
    </div>

    <!-- 音轨设置 -->
    <div class="flex flex-col gap-2">
      <h3 class="text-10px font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <div class="i-ph-sliders-horizontal-fill"></div>
        Track Settings
      </h3>
      <div class="bg-[#1a1a1a] rounded p-3 border border-[#333] flex flex-col gap-4 shadow-inner">
        <div class="flex flex-col gap-1">
          <label class="text-9px text-gray-500 uppercase">Track Name</label>
          <input 
            v-if="selectedTrack"
            v-model="selectedTrack.name"
            class="bg-[#252525] border border-[#333] rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none text-gray-200"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-9px text-gray-500 uppercase">Instrument</label>
          <select 
            v-if="selectedTrack"
            v-model="selectedTrack.instrument"
            class="bg-[#252525] border border-[#333] rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none text-gray-200 appearance-none cursor-pointer"
          >
            <option value="synth">Synthesizer</option>
            <option value="piano">Piano</option>
            <option value="guitar">Guitar</option>
          </select>
        </div>

        <button 
          @click="deleteTrack"
          class="mt-2 py-1.5 rounded border border-red-900/30 text-red-500/70 hover:text-red-400 hover:bg-red-900/20 text-10px font-bold transition-all flex items-center justify-center gap-2"
        >
          <div class="i-ph-trash-fill"></div>
          DELETE TRACK
        </button>
      </div>
    </div>

    <!-- 混音器预览 -->
    <div class="flex flex-col gap-2">
      <h3 class="text-10px font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <div class="i-ph-equalizer-fill"></div>
        Mixer
      </h3>
      <div class="bg-[#1a1a1a] rounded p-3 border border-[#333] flex flex-col gap-4 shadow-inner">
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <span class="text-10px text-gray-400">Volume</span>
            <span class="text-10px font-mono text-blue-400">0.0 dB</span>
          </div>
          <div class="h-1.5 bg-black rounded-full overflow-hidden border border-[#333]">
            <div class="h-full bg-gradient-to-r from-blue-600 to-blue-400 w-3/4 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <span class="text-10px text-gray-400">Pan</span>
            <span class="text-10px font-mono text-gray-400">C</span>
          </div>
          <div class="h-1.5 bg-black rounded-full flex justify-center items-center border border-[#333] relative">
            <div class="absolute left-1/2 -translate-x-1/2 w-1 h-3 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
