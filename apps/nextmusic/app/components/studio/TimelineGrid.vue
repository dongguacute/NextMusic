<script setup lang="ts">
import { useMusicStore } from '../../stores/music'

const musicStore = useMusicStore()
const beatWidth = 80
const trackHeight = 120

// 交互状态
const isDraggingPlayhead = ref(false)
const dragNoteInfo = ref<{ trackId: string, noteIndex: number, startX: number, startY: number, originalStart: number, originalDegree: number } | null>(null)
const resizeNoteInfo = ref<{ trackId: string, noteIndex: number, startX: number, originalDuration: number } | null>(null)

const handleRulerMouseDown = (e: MouseEvent) => {
  isDraggingPlayhead.value = true
  updatePlayheadPosition(e)
}

const updatePlayheadPosition = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).closest('.timeline-container')?.getBoundingClientRect()
  if (rect) {
    const x = e.clientX - rect.left + (e.currentTarget as HTMLElement).closest('.timeline-container')!.scrollLeft
    musicStore.currentTime = Math.max(0, x / beatWidth)
  }
}

const handleNoteMouseDown = (e: MouseEvent, trackId: string, noteIndex: number) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const offsetX = e.clientX - rect.left
  
  musicStore.selectedTrackId = trackId
  musicStore.selectedNoteIndices = new Set([noteIndex])

  if (offsetX > rect.width - 10) {
    resizeNoteInfo.value = { trackId, noteIndex, startX: e.clientX, originalDuration: musicStore.project.tracks.find(t => t.id === trackId)!.notes[noteIndex].duration }
  } else {
    const note = musicStore.project.tracks.find(t => t.id === trackId)!.notes[noteIndex]
    dragNoteInfo.value = { trackId, noteIndex, startX: e.clientX, startY: e.clientY, originalStart: note.start, originalDegree: note.degree }
  }
  e.stopPropagation()
}

const handleGlobalMouseMove = (e: MouseEvent) => {
  if (isDraggingPlayhead.value) {
    const container = document.querySelector('.timeline-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left + container.scrollLeft
      musicStore.currentTime = Math.max(0, x / beatWidth)
    }
  } else if (dragNoteInfo.value) {
    const { trackId, noteIndex, startX, startY, originalStart, originalDegree } = dragNoteInfo.value
    let dx = (e.clientX - startX) / beatWidth
    const dy = (e.clientY - startY) / (trackHeight / 7)
    
    const track = musicStore.project.tracks.find(t => t.id === trackId)
    if (track) {
      const note = track.notes[noteIndex]
      let newStart = originalStart + dx
      
      if (musicStore.gridSettings.snapEnabled) {
        const step = 1 / (musicStore.gridSettings.gridSize / 4)
        newStart = Math.round(newStart / step) * step
      }
      
      note.start = Math.max(0, newStart)
      note.degree = Math.max(1, Math.min(7, originalDegree - Math.round(dy)))
    }
  } else if (resizeNoteInfo.value) {
    const { trackId, noteIndex, startX, originalDuration } = resizeNoteInfo.value
    let dx = (e.clientX - startX) / beatWidth
    const track = musicStore.project.tracks.find(t => t.id === trackId)
    if (track) {
      const note = track.notes[noteIndex]
      let newDuration = originalDuration + dx
      
      if (musicStore.gridSettings.snapEnabled) {
        const step = 1 / (musicStore.gridSettings.gridSize / 4)
        newDuration = Math.max(step, Math.round(newDuration / step) * step)
      }
      
      note.duration = Math.max(0.1, newDuration)
    }
  }
}

const handleGlobalMouseUp = () => {
  isDraggingPlayhead.value = false
  dragNoteInfo.value = null
  resizeNoteInfo.value = null
}

onMounted(() => {
  window.addEventListener('mousemove', handleGlobalMouseMove)
  window.addEventListener('mouseup', handleGlobalMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
})

const handleGridClick = (e: MouseEvent, trackId: string) => {
  if (dragNoteInfo.value || resizeNoteInfo.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  musicStore.selectedTrackId = trackId
  musicStore.addNote(trackId, {
    degree: Math.max(1, Math.min(7, 7 - Math.floor((y / trackHeight) * 7))),
    octave: 0,
    start: Math.floor(x / beatWidth),
    duration: 1,
    accidental: 0
  })
}
</script>

<template>
  <div class="relative min-w-full bg-[#1e1e1e] overflow-auto custom-scrollbar h-full z-10 timeline-container">
    <!-- Ruler -->
    <div class="h-6 bg-[#2a2a2a] border-b border-black sticky top-0 z-50 flex items-end cursor-pointer select-none" @mousedown="handleRulerMouseDown">
      <div v-for="i in 100" :key="i" class="absolute border-l border-white/20 h-2" :style="{ left: `${(i-1) * beatWidth}px` }">
        <span class="text-[8px] text-gray-500 ml-1 mb-1 block">{{ i }}</span>
      </div>
      <div v-for="i in 400" :key="'sub'+i" class="absolute border-l border-white/5 h-1" :style="{ left: `${(i-1) * (beatWidth/4)}px` }"></div>
    </div>

    <div class="relative" @click.self="musicStore.selectedNoteIndices.clear()">
      <!-- Grid Background -->
      <div class="absolute inset-0 pointer-events-none opacity-10" 
        :style="{
          backgroundImage: `
            linear-gradient(to right, white 2px, transparent 2px),
            linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: `
            ${beatWidth * 4}px 100%,
            ${beatWidth}px 100%,
            100% ${trackHeight / 7}px
          `
        }"
      ></div>

      <!-- Tracks Area -->
      <div v-for="track in musicStore.project.tracks" :key="track.id" 
        class="relative border-b border-black/40 cursor-crosshair hover:bg-white/[0.02] transition-colors"
        :style="{ height: `${trackHeight}px` }"
        :class="{ 'bg-blue-500/5': musicStore.selectedTrackId === track.id }"
        @click.self="handleGridClick($event, track.id)"
      >
        <!-- Track Label Overlay (Optional) -->
        <div class="absolute left-2 top-2 text-[8px] text-gray-600 uppercase font-bold pointer-events-none select-none">
          {{ track.name }}
        </div>

        <!-- Notes -->
        <div v-for="(note, idx) in track.notes" :key="idx"
          class="absolute border rounded-sm shadow-lg flex flex-col select-none transition-all hover:brightness-125 cursor-pointer group overflow-hidden"
          :class="[
            musicStore.selectedNoteIndices.has(idx) && musicStore.selectedTrackId === track.id
              ? 'bg-blue-400 border-white z-30 scale-[1.02]' 
              : 'bg-blue-600/80 border-blue-400 z-20'
          ]"
          :style="{
            left: `${note.start * beatWidth}px`,
            width: `${note.duration * beatWidth}px`,
            top: `${(7 - note.degree) * (trackHeight / 7)}px`,
            height: `${trackHeight / 7}px`
          }"
          @mousedown.stop="handleNoteMouseDown($event, track.id, idx)"
        >
          <!-- Note Content -->
          <div class="flex-1 flex items-center justify-center text-[10px] font-black italic text-white/90">
            {{ note.degree }}{{ note.accidental === 1 ? '#' : note.accidental === -1 ? 'b' : '' }}
          </div>
          
          <!-- Velocity Bar -->
          <div class="h-0.5 bg-white/30 self-start ml-1 mb-0.5 rounded-full" :style="{ width: `${(note.expression?.velocity ?? 0.8) * 80}%` }"></div>

          <!-- Resize Handle -->
          <div class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize group-hover:bg-white/20 z-40"></div>
        </div>
      </div>

      <!-- Playhead -->
      <div class="absolute top-0 bottom-0 w-px bg-white z-40 shadow-[0_0_8px_white] pointer-events-none"
        :style="{ left: `${musicStore.currentTime * beatWidth}px` }"
      >
        <div class="absolute -top-1 -left-1 w-2 h-2 bg-white rotate-45"></div>
      </div>
    </div>
  </div>
</template>
