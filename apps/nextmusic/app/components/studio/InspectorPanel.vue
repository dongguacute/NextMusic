<script setup lang="ts">
import { useMusicStore } from '../../stores/music'
import { computed, ref } from 'vue'

const musicStore = useMusicStore()
const selectedNote = computed(() => {
  const track = musicStore.selectedTrack
  if (!track || musicStore.selectedNoteIndices.size === 0) return null
  const firstIdx = Array.from(musicStore.selectedNoteIndices)[0]
  return track.notes[firstIdx]
})

const updateNoteExpression = (patch: any) => {
  const track = musicStore.selectedTrack
  if (track) {
    musicStore.selectedNoteIndices.forEach(idx => {
      const note = track.notes[idx]
      if (!note.expression) note.expression = { velocity: 0.8, articulation: 'lead', glide: 0, timingOffset: 0, vibrato: 0 }
      Object.assign(note.expression, patch)
    })
  }
}

const updateNoteAccidental = (val: number) => {
  const track = musicStore.selectedTrack
  if (track) {
    musicStore.selectedNoteIndices.forEach(idx => {
      track.notes[idx].accidental = val
    })
  }
}

const quantizeGrid = ref(16)

const applyQuantize = () => musicStore.applyQuantize({ grid: quantizeGrid.value as any, strength: 1, quantizeStart: true, quantizeDuration: false })
</script>

<template>
  <div class="p-4 flex flex-col gap-6 bg-[#252525] h-full border-l border-black/50 z-20 relative overflow-y-auto custom-scrollbar">
    <div v-if="musicStore.selectedTrack" class="flex flex-col gap-4">
      <!-- Snap & Grid (New Section) -->
      <div class="flex flex-col gap-2">
        <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grid & Snap</h3>
        <div class="bg-black/20 p-3 rounded border border-white/5 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-[9px] text-gray-400 uppercase">Snap to Grid</label>
            <button @click="musicStore.gridSettings.snapEnabled = !musicStore.gridSettings.snapEnabled" class="w-8 h-4 rounded-full relative transition-colors" :class="musicStore.gridSettings.snapEnabled ? 'bg-blue-600' : 'bg-gray-700'">
              <div class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all" :style="{ left: musicStore.gridSettings.snapEnabled ? '18px' : '2px' }"></div>
            </button>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[9px] text-gray-500 uppercase">Grid Size</label>
            <select v-model="musicStore.gridSettings.gridSize" class="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs outline-none">
              <option :value="4">1/4 Beat</option>
              <option :value="8">1/8 Beat</option>
              <option :value="16">1/16 Beat</option>
              <option :value="32">1/32 Beat</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Note Expression -->
      <div v-if="selectedNote" class="flex flex-col gap-2">
        <h3 class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Note Expression</h3>
        <div class="bg-black/20 p-3 rounded border border-blue-500/20 flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <label class="text-[9px] text-gray-500 uppercase">Velocity</label>
              <span class="text-[9px] font-mono text-blue-400">{{ Math.round((selectedNote.expression?.velocity ?? 0.8) * 100) }}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" 
              :value="selectedNote.expression?.velocity ?? 0.8" 
              @input="(e: any) => updateNoteExpression({ velocity: parseFloat(e.target.value) })"
              class="w-full accent-blue-500" />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-[9px] text-gray-500 uppercase">Accidental (Sharp/Flat)</label>
            <div class="flex gap-1">
              <button v-for="v in [-1, 0, 1]" :key="v" 
                @click="updateNoteAccidental(v)"
                class="flex-1 py-1 text-[10px] rounded border border-white/5 transition-colors"
                :class="selectedNote.accidental === v ? 'bg-blue-600 text-white' : 'bg-black/20 text-gray-400 hover:bg-white/5'"
              >
                {{ v === -1 ? '♭' : v === 1 ? '♯' : '♮' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Track Settings</h3>
        <div class="bg-black/20 p-3 rounded border border-white/5 flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-[9px] text-gray-500 uppercase">Name</label>
            <input v-model="musicStore.selectedTrack.name" class="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[9px] text-gray-500 uppercase">Instrument</label>
            <select v-model="musicStore.selectedTrack.instrument" class="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs outline-none cursor-pointer">
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
