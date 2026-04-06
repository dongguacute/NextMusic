<script setup lang="ts">
import { useMusicStore } from '../../stores/music'

const musicStore = useMusicStore()
const selectedTrack = computed(() => musicStore.project.tracks.find(t => t.id === musicStore.selectedTrackId))

const quantizeGrid = ref(16)
const applyQuantize = () => musicStore.applyQuantize({ grid: quantizeGrid.value as any, strength: 1, quantizeStart: true, quantizeDuration: false })
</script>

<template>
  <div class="p-4 flex flex-col gap-6 bg-[#252525] h-full border-l border-black/50 z-20 relative overflow-y-auto custom-scrollbar">
    <div v-if="selectedTrack" class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Track Settings</h3>
        <div class="bg-black/20 p-3 rounded border border-white/5 flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-[9px] text-gray-500 uppercase">Name</label>
            <input v-model="selectedTrack.name" class="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[9px] text-gray-500 uppercase">Instrument</label>
            <select v-model="selectedTrack.instrument" class="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs outline-none cursor-pointer">
              <option value="piano">Piano</option>
              <option value="synth">Synthesizer</option>
              <option value="guitar">Guitar</option>
            </select>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Quantize</h3>
        <div class="flex gap-1">
          <select v-model="quantizeGrid" class="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-xs outline-none">
            <option :value="4">1/4 Beat</option>
            <option :value="8">1/8 Beat</option>
            <option :value="16">1/16 Beat</option>
          </select>
          <button @click="applyQuantize" class="px-3 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-bold transition-colors">APPLY</button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Transform</h3>
        <div class="grid grid-cols-2 gap-1">
          <button @click="musicStore.applyTranspose(12)" class="py-2 bg-black/20 border border-white/10 rounded text-[9px] hover:bg-white/5 transition-colors">OCTAVE +</button>
          <button @click="musicStore.applyTranspose(-12)" class="py-2 bg-black/20 border border-white/10 rounded text-[9px] hover:bg-white/5 transition-colors">OCTAVE -</button>
          <button @click="musicStore.removeSelectedNotes" class="col-span-2 py-2 bg-red-900/20 border border-red-500/20 text-red-400 rounded text-[9px] hover:bg-red-900/30 transition-colors">DELETE NOTES</button>
        </div>
      </div>
    </div>
    <div v-else class="flex-1 flex items-center justify-center text-gray-600 text-[10px] uppercase font-bold">
      No Track Selected
    </div>
  </div>
</template>
