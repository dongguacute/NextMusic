<script setup lang="ts">
import { useMusicStore } from '../../stores/music'

const musicStore = useMusicStore()

// 网格配置
const beatWidth = 80 // 每个小节的宽度
const trackHeight = 128 // 增加音轨高度以适应 Logic 风格
const noteHeight = 24

const getNoteStyle = (note: any, trackId: string, nIndex: number) => {
  const isSelected = musicStore.selectedNoteIndices[trackId]?.has(nIndex)
  
  // 垂直位置计算
  const verticalStep = (trackHeight - noteHeight - 20) / 6
  const top = (7 - note.degree) * verticalStep + 10

  return {
    left: `${note.start * beatWidth}px`,
    width: `${note.duration * beatWidth}px`,
    top: `${top}px`,
    height: `${noteHeight}px`,
    zIndex: isSelected ? 20 : 10
  }
}

const getArticulationIcon = (art?: string) => {
  switch (art) {
    case 'pad': return 'i-ph-cloud-fill'
    case 'pluck': return 'i-ph-guitar-fill'
    default: return 'i-ph-lightning-fill'
  }
}

const getTrackColorClasses = (index: number) => {
  const themes = [
    { header: 'bg-[#c5d5f5]', body: 'bg-[#4a82f0]', text: 'text-[#2a4a8a]', footer: 'bg-[#3a62b0]' }, // Blue
    { header: 'bg-[#d5f5c5]', body: 'bg-[#62c54a]', text: 'text-[#2a5a1a]', footer: 'bg-[#4a8a3a]' }, // Green
    { header: 'bg-[#f5c5d5]', body: 'bg-[#f04a82]', text: 'text-[#8a1a4a]', footer: 'bg-[#b03a62]' }, // Red/Pink
    { header: 'bg-[#f5e5c5]', body: 'bg-[#f0b04a]', text: 'text-[#8a5a1a]', footer: 'bg-[#b08a3a]' }, // Orange
    { header: 'bg-[#e5c5f5]', body: 'bg-[#b04af0]', text: 'text-[#5a1a8a]', footer: 'bg-[#8a3ab0]' }, // Purple
  ]
  return themes[index % themes.length]
}

// 交互状态
const isDragging = ref(false)
const isResizing = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })
const initialNoteState = ref<any>(null)
const activeNoteRef = ref<{ trackId: string, index: number } | null>(null)

// 框选状态
const isSelecting = ref(false)
const selectionBox = ref({ x1: 0, y1: 0, x2: 0, y2: 0 })

const handleMouseDown = (e: MouseEvent, trackId: string, nIndex?: number) => {
  const isNoteClick = nIndex !== undefined
  
  if (isNoteClick) {
    if (!e.shiftKey && !musicStore.selectedNoteIndices[trackId]?.has(nIndex!)) {
      musicStore.selectedNoteIndices = { [trackId]: new Set([nIndex!]) }
    } else if (e.shiftKey) {
      if (!musicStore.selectedNoteIndices[trackId]) musicStore.selectedNoteIndices[trackId] = new Set()
      musicStore.selectedNoteIndices[trackId].add(nIndex!)
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    
    if (offsetX > rect.width - 10) {
      isResizing.value = true
    } else {
      isDragging.value = true
    }

    activeNoteRef.value = { trackId, index: nIndex! }
    initialNoteState.value = JSON.parse(JSON.stringify(musicStore.project.tracks.find(t => t.id === trackId)!.notes[nIndex!]))
    dragStartPos.value = { x: e.clientX, y: e.clientY }
    
    e.stopPropagation()
  } else {
    if (!e.shiftKey) musicStore.selectedNoteIndices = {}
    
    isSelecting.value = true
    const container = document.querySelector('.timeline-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left + container.scrollLeft
      const y = e.clientY - rect.top + container.scrollTop
      selectionBox.value = { x1: x, y1: y, x2: x, y2: y }
    }
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value && activeNoteRef.value) {
    const dx = (e.clientX - dragStartPos.value.x) / beatWidth
    const track = musicStore.project.tracks.find(t => t.id === activeNoteRef.value!.trackId)
    if (track) {
      const note = track.notes[activeNoteRef.value!.index]
      note.start = Math.max(0, initialNoteState.value.start + dx)
    }
  } else if (isResizing.value && activeNoteRef.value) {
    const dx = (e.clientX - dragStartPos.value.x) / beatWidth
    const track = musicStore.project.tracks.find(t => t.id === activeNoteRef.value!.trackId)
    if (track) {
      const note = track.notes[activeNoteRef.value!.index]
      note.duration = Math.max(0.1, initialNoteState.value.duration + dx)
    }
  } else if (isSelecting.value) {
    const container = document.querySelector('.timeline-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      selectionBox.value.x2 = e.clientX - rect.left + container.scrollLeft
      selectionBox.value.y2 = e.clientY - rect.top + container.scrollTop
    }
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  isResizing.value = false
  isSelecting.value = false
  activeNoteRef.value = null
}

const addNoteAtPosition = (event: MouseEvent, trackId: string) => {
  if (isDragging.value || isResizing.value || isSelecting.value) return
  
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const start = Math.floor(x / beatWidth)
  const degree = 7 - Math.floor((y / trackHeight) * 7)
  const safeDegree = Math.max(1, Math.min(7, degree))

  musicStore.addNote(trackId, {
    degree: safeDegree,
    octave: 0,
    start,
    duration: 1,
    expression: { articulation: 'lead', velocity: 0.8, glide: 0, timingOffset: 0 }
  })
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="relative min-w-full timeline-container" 
    :style="{ height: `${Math.max(musicStore.project.tracks.length, 8) * trackHeight}px` }"
  >
    <!-- 背景网格 -->
    <div class="absolute inset-0 pointer-events-none" 
      :style="{
        backgroundImage: `
          linear-gradient(to right, #444 2px, transparent 2px),
          linear-gradient(to right, #333 1px, transparent 1px),
          linear-gradient(to bottom, #333 1px, transparent 1px)
        `,
        backgroundSize: `
          ${beatWidth * 4}px 100%,
          ${beatWidth}px 100%,
          100% ${trackHeight}px
        `
      }"
    ></div>

    <!-- 音轨内容区域 -->
    <div v-for="(track, index) in musicStore.project.tracks" 
      :key="track.id"
      class="relative w-full overflow-visible border-b border-black/20 cursor-crosshair"
      :style="{ height: `${trackHeight}px` }"
      :class="{ 'bg-white/3': musicStore.selectedTrackId === track.id }"
      @mousedown="handleMouseDown($event, track.id)"
      @click.self="addNoteAtPosition($event, track.id)"
    >
      <!-- 音符条 (Logic Pro Style: 三层结构) -->
      <div class="absolute inset-0 pointer-events-none">
        <div 
          v-for="(note, nIndex) in track.notes" 
          :key="nIndex"
          class="absolute rounded-sm shadow-md transition-all pointer-events-auto group flex flex-col border border-black/40 select-none overflow-hidden"
          :style="getNoteStyle(note, track.id, nIndex)"
          :class="[
            musicStore.selectedNoteIndices[track.id]?.has(nIndex)
              ? 'ring-2 ring-white/80 z-30 brightness-110'
              : 'hover:brightness-105'
          ]"
          @mousedown.stop="handleMouseDown($event, track.id, nIndex)"
        >
          <!-- Header (浅色顶部) -->
          <div 
            class="h-1/4 flex items-center px-1 gap-1 border-b border-black/10"
            :class="getTrackColorClasses(index).header"
          >
            <div :class="[getArticulationIcon(note.expression?.articulation), getTrackColorClasses(index).text]" class="text-7px opacity-70"></div>
            <span class="text-6px font-black truncate uppercase tracking-tighter leading-none" :class="getTrackColorClasses(index).text">
              {{ track.name }}
            </span>
            <div class="i-ph-infinity text-6px opacity-50 ml-auto" :class="getTrackColorClasses(index).text"></div>
          </div>

          <!-- Body (深色主体) -->
          <div 
            class="flex-1 flex items-center px-1 relative overflow-hidden"
            :class="getTrackColorClasses(index).body"
          >
            <!-- 背景波形预览 -->
            <div class="absolute inset-0 flex items-center justify-center opacity-20">
               <div class="w-full h-1px bg-white shadow-[0_0_10px_white]"></div>
               <div class="i-ph-waveform-fill text-4xl text-white absolute"></div>
            </div>
            
            <span class="text-9px font-black text-white/90 italic leading-none z-10">
              {{ note.degree }}
            </span>
          </div>

          <!-- Footer (底部信息条) -->
          <div 
            class="h-1/5 flex items-center px-1"
            :class="getTrackColorClasses(index).footer"
          >
            <span class="text-5px font-bold text-white/60 uppercase tracking-tighter">
              MIDI Region {{ nIndex + 1 }}
            </span>
          </div>

          <!-- Resize Handle -->
          <div class="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize group-hover:bg-white/10 transition-colors"></div>
        </div>
      </div>
    </div>

    <!-- 框选框 -->
    <div v-if="isSelecting" 
      class="absolute border border-white/30 bg-white/5 pointer-events-none z-50 backdrop-blur-sm"
      :style="{
        left: `${Math.min(selectionBox.x1, selectionBox.x2)}px`,
        top: `${Math.min(selectionBox.y1, selectionBox.y2)}px`,
        width: `${Math.abs(selectionBox.x2 - selectionBox.x1)}px`,
        height: `${Math.abs(selectionBox.y2 - selectionBox.y1)}px`
      }"
    ></div>

    <!-- 播放指针 -->
    <div 
      class="absolute top-0 bottom-0 w-0.5 bg-white z-40 shadow-[0_0_15px_rgba(255,255,255,1)] pointer-events-none"
      :style="{ left: `${musicStore.currentTime * beatWidth}px` }"
    >
      <div class="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-white rotate-45 shadow-xl border border-gray-300"></div>
    </div>
  </div>
</template>
