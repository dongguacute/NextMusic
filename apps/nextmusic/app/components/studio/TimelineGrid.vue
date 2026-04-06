<script setup lang="ts">
import { useMusicStore } from '../../stores/music'

const musicStore = useMusicStore()
const beatWidth = 80
const trackHeight = 120

const handleGridClick = (e: MouseEvent, trackId: string) => {
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

const toggleNoteSelection = (e: MouseEvent, idx: number) => {
  if (e.shiftKey) {
    if (musicStore.selectedNoteIndices.has(idx)) {
      musicStore.selectedNoteIndices.delete(idx)
    } else {
      musicStore.selectedNoteIndices.add(idx)
    }
  } else {
    musicStore.selectedNoteIndices = new Set([idx])
  }
}
</script>

<template>
  <div class="relative min-w-full bg-[#1e1e1e] overflow-auto custom-scrollbar h-full z-10" @click.self="musicStore.selectedNoteIndices.clear()">
    <!-- Grid Background -->
    <div class="absolute inset-0 pointer-events-none opacity-10" 
      :style="{
        backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
        backgroundSize: `${beatWidth}px ${trackHeight}px`
      }"
    ></div>

    <!-- Tracks Area -->
    <div v-for="track in musicStore.project.tracks" :key="track.id" 
      class="relative border-b border-white/5 cursor-crosshair hover:bg-white/[0.02] transition-colors"
      :style="{ height: `${trackHeight}px` }"
      @click.self="handleGridClick($event, track.id)"
    >
      <!-- Notes -->
      <div v-for="(note, idx) in track.notes" :key="idx"
        class="absolute border rounded-sm shadow-lg flex items-center justify-center text-[10px] font-bold select-none transition-all hover:brightness-125 cursor-pointer"
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
        @click.stop="() => { musicStore.selectedTrackId = track.id; toggleNoteSelection($event, idx); }"
      >
        {{ note.degree }}
      </div>
    </div>

    <!-- Playhead -->
    <div class="absolute top-0 bottom-0 w-px bg-white z-40 shadow-[0_0_8px_white] pointer-events-none"
      :style="{ left: `${musicStore.currentTime * beatWidth}px` }"
    ></div>
  </div>
</template>
