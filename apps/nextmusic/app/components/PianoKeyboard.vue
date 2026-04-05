<script setup lang="ts">
import { useAudioEngine } from '../composables/useAudioEngine'

const { playNote, stopNote } = useAudioEngine()
const props = defineProps<{
  trackId: string
}>()

const keys = [
  { midi: 60, label: 'C4', degree: 1 },
  { midi: 62, label: 'D4', degree: 2 },
  { midi: 64, label: 'E4', degree: 3 },
  { midi: 65, label: 'F4', degree: 4 },
  { midi: 67, label: 'G4', degree: 5 },
  { midi: 69, label: 'A4', degree: 6 },
  { midi: 71, label: 'B4', degree: 7 },
  { midi: 72, label: 'C5', degree: 1 }
]

const activeKeys = ref(new Set<number>())

const handleKeyDown = (midi: number) => {
  if (activeKeys.value.has(midi)) return
  activeKeys.value.add(midi)
  playNote(midi, props.trackId)
}

const handleKeyUp = (midi: number) => {
  activeKeys.value.delete(midi)
  stopNote(midi, props.trackId)
}
</script>

<template>
  <div class="flex gap-1 p-4 bg-gray-800 rounded-lg">
    <button
      v-for="key in keys"
      :key="key.midi"
      @mousedown="handleKeyDown(key.midi)"
      @mouseup="handleKeyUp(key.midi)"
      @mouseleave="handleKeyUp(key.midi)"
      :class="[
        'h-24 w-10 rounded-b-md flex flex-col items-center justify-end pb-2 transition-colors',
        activeKeys.has(key.midi) ? 'bg-blue-400' : 'bg-white text-gray-900'
      ]"
    >
      <span class="text-xs font-bold">{{ key.label }}</span>
    </button>
  </div>
</template>
