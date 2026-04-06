<script setup lang="ts">
import StudioHeader from '../components/studio/StudioHeader.vue'
import TrackList from '../components/studio/TrackList.vue'
import TimelineGrid from '../components/studio/TimelineGrid.vue'
import InspectorPanel from '../components/studio/InspectorPanel.vue'
import { useMusicStore } from '../stores/music'
import { useAudioEngine } from '../composables/useAudioEngine'

const musicStore = useMusicStore()
const { playNote, stopNote } = useAudioEngine()

// 键盘映射 (A-K 对应 1-7 相对音级)
const degreeMap: Record<string, { degree: number, octave: number }> = {
  'a': { degree: 1, octave: 0 },
  'w': { degree: 1, octave: 0 },
  's': { degree: 2, octave: 0 },
  'e': { degree: 2, octave: 0 },
  'd': { degree: 3, octave: 0 },
  'f': { degree: 4, octave: 0 },
  't': { degree: 4, octave: 0 },
  'g': { degree: 5, octave: 0 },
  'y': { degree: 5, octave: 0 },
  'h': { degree: 6, octave: 0 },
  'u': { degree: 6, octave: 0 },
  'j': { degree: 7, octave: 0 },
  'k': { degree: 1, octave: 1 },
}

const pressedKeys = new Set<string>()

const handleKeyDown = (e: KeyboardEvent) => {
  const key = e.key.toLowerCase()
  if (degreeMap[key] && !pressedKeys.has(key)) {
    pressedKeys.add(key)
    const { degree, octave } = degreeMap[key]
    playNote(degree, octave)
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  const key = e.key.toLowerCase()
  if (degreeMap[key]) {
    pressedKeys.delete(key)
    const { degree, octave } = degreeMap[key]
    stopNote(degree, octave)
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    musicStore.removeSelectedNotes()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <div class="h-screen flex flex-col bg-[#1a1a1a] text-[#e0e0e0] font-sans overflow-hidden select-none">
    <StudioHeader />

    <div class="flex-1 flex overflow-hidden relative">
      <!-- Left: Track List -->
      <aside class="w-48 shrink-0">
        <TrackList />
      </aside>

      <!-- Center: Timeline -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-auto">
          <TimelineGrid />
        </div>
      </main>

      <!-- Right: Inspector -->
      <aside class="w-64 shrink-0">
        <InspectorPanel />
      </aside>
    </div>

    <!-- Footer -->
    <footer class="h-6 bg-black border-t border-white/5 flex items-center px-4 justify-between text-[9px] text-gray-500 uppercase tracking-tighter">
      <div class="flex gap-4">
        <span>Project: {{ musicStore.project.name }}</span>
        <span>Tempo: {{ musicStore.project.tempo }} BPM</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="musicStore.isPlaying ? 'text-green-500' : 'text-gray-700'">Engine Active</span>
        <div class="w-1.5 h-1.5 rounded-full" :class="musicStore.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-800'"></div>
      </div>
    </footer>
  </div>
</template>

<style>
body { margin: 0; background: #1a1a1a; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
</style>
