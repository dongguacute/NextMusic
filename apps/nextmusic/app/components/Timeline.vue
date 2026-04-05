<script setup lang="ts">
import { useMusicStore } from '../stores/music'

const musicStore = useMusicStore()
const props = defineProps<{
  trackId: string
}>()

const track = computed(() => musicStore.project.tracks.find(t => t.id === props.trackId))
const notes = computed(() => track.value?.notes || [])

const pixelsPerBeat = 100
const noteHeight = 24

const getNoteStyle = (note: any) => ({
  left: `${note.start * pixelsPerBeat}px`,
  width: `${note.duration * pixelsPerBeat}px`,
  top: `${(7 - note.degree) * noteHeight}px`,
  height: `${noteHeight - 2}px`
})

const handleNoteMouseDown = (event: MouseEvent, index: number) => {
  // 简单的拖动逻辑可以在这里实现
  console.log('Note clicked:', index)
}

const removeNote = (index: number) => {
  musicStore.removeNote(props.trackId, index)
}
</script>

<template>
  <div class="relative bg-gray-900 border border-gray-700 rounded overflow-x-auto h-64">
    <!-- Grid Lines -->
    <div class="absolute inset-0 pointer-events-none">
      <div 
        v-for="i in 32" 
        :key="i"
        class="absolute top-0 bottom-0 border-l border-gray-800"
        :style="{ left: `${(i - 1) * pixelsPerBeat}px` }"
      ></div>
      <div 
        v-for="i in 8" 
        :key="i"
        class="absolute left-0 right-0 border-t border-gray-800"
        :style="{ top: `${(i - 1) * noteHeight}px` }"
      ></div>
    </div>

    <!-- Notes -->
    <div 
      v-for="(note, index) in notes" 
      :key="index"
      class="absolute bg-blue-500 rounded border border-blue-400 cursor-move group"
      :style="getNoteStyle(note)"
      @mousedown="handleNoteMouseDown($event, index)"
    >
      <div class="absolute right-0 top-0 bottom-0 w-1 bg-blue-300 opacity-0 group-hover:opacity-100 cursor-ew-resize"></div>
      <button 
        @click.stop="removeNote(index)"
        class="absolute -top-2 -right-2 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100"
      >
        ×
      </button>
    </div>

    <!-- Current Time Marker -->
    <div 
      class="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
      :style="{ left: `${musicStore.currentTime * pixelsPerBeat}px` }"
    ></div>
  </div>
</template>
