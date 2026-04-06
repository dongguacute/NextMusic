<script setup lang="ts">
import StudioHeader from '../components/studio/StudioHeader.vue'
import TrackList from '../components/studio/TrackList.vue'
import TimelineGrid from '../components/studio/TimelineGrid.vue'
import InspectorPanel from '../components/studio/InspectorPanel.vue'
import { useMusicStore } from '../stores/music'
import { useAudioEngine } from '../composables/useAudioEngine'

const musicStore = useMusicStore()
const { playNote, stopNote } = useAudioEngine()

// 键盘映射 (A-K 对应 C4-C5)
const keyMap: Record<string, number> = {
  'a': 60, // C4
  'w': 61, // C#4
  's': 62, // D4
  'e': 63, // D#4
  'd': 64, // E4
  'f': 65, // F4
  't': 66, // F#4
  'g': 67, // G4
  'y': 68, // G#4
  'h': 69, // A4
  'u': 70, // A#4
  'j': 71, // B4
  'k': 72, // C5
}

const pressedKeys = new Set<string>()

const handleKeyDown = (e: KeyboardEvent) => {
  const key = e.key.toLowerCase()
  if (keyMap[key] && !pressedKeys.has(key)) {
    pressedKeys.add(key)
    playNote(keyMap[key], musicStore.selectedTrackId)
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  const key = e.key.toLowerCase()
  if (keyMap[key]) {
    pressedKeys.delete(key)
    stopNote(keyMap[key], musicStore.selectedTrackId)
  }

  // 删除选中音符
  if (e.key === 'Backspace' || e.key === 'Delete') {
    Object.entries(musicStore.selectedNoteIndices).forEach(([trackId, indices]) => {
      const track = musicStore.project.tracks.find(t => t.id === trackId)
      if (track) {
        // 从后往前删，避免索引错位
        Array.from(indices).sort((a, b) => b - a).forEach(idx => {
          musicStore.removeNote(trackId, idx)
        })
      }
    })
    musicStore.selectedNoteIndices = {}
  }

  // 全选 Cmd+A
  if ((e.metaKey || e.ctrlKey) && key === 'a') {
    e.preventDefault()
    const allIndices: Record<string, Set<number>> = {}
    musicStore.project.tracks.forEach(track => {
      allIndices[track.id] = new Set(track.notes.map((_, i) => i))
    })
    musicStore.selectedNoteIndices = allIndices
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
    <!-- 顶部控制栏 -->
    <StudioHeader />

    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧检查器 -->
      <aside class="w-64 border-r border-black/50 bg-[#252525] flex flex-col hidden lg:flex shadow-xl z-10">
        <InspectorPanel />
      </aside>

      <!-- 主工作区 -->
      <main class="flex-1 flex flex-col overflow-hidden relative">
        <!-- 时间轴刻度 (Ruler) -->
        <div class="h-8 border-b border-black/50 bg-[#2a2a2a] flex shrink-0">
          <div class="w-48 border-r border-black/50 shrink-0 flex items-center justify-center">
            <div class="i-ph-list-bold text-gray-600"></div>
          </div>
          <div class="flex-1 relative overflow-hidden flex items-end pb-1 px-1">
             <div v-for="i in 20" :key="i" class="absolute text-8px text-gray-600 font-mono" :style="{ left: `${(i-1) * 80}px` }">
               {{ i }}
             </div>
          </div>
        </div>

        <div class="flex-1 flex overflow-hidden">
          <!-- 左侧音轨控制列表 -->
          <div class="w-48 border-r border-black/50 bg-[#252525] overflow-y-auto shrink-0 custom-scrollbar shadow-lg z-5">
            <TrackList />
          </div>

          <!-- 右侧网格区域 -->
          <div class="flex-1 overflow-auto relative bg-[#1e1e1e] custom-scrollbar">
            <TimelineGrid />
          </div>
        </div>
      </main>
    </div>

    <!-- 底部状态栏 -->
    <footer class="h-6 bg-black border-t border-[#333] flex items-center px-4 text-10px text-gray-500 justify-between shrink-0">
      <div class="flex gap-4 items-center">
        <div class="flex items-center gap-1">
          <div class="i-ph-music-notes-simple-fill"></div>
          <span class="uppercase tracking-tighter">Project:</span>
          <span class="text-gray-300 font-bold">{{ musicStore.project.key.root }} {{ musicStore.project.key.scale }}</span>
        </div>
        <div class="flex items-center gap-1 border-l border-[#333] pl-4">
          <div class="i-ph-metronome-fill"></div>
          <span class="uppercase tracking-tighter">Tempo:</span>
          <span class="text-gray-300 font-bold">{{ musicStore.project.tempo }} BPM</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-gray-600">AUDIO ENGINE READY</span>
        <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
      </div>
    </footer>
  </div>
</template>

<style>
body {
  margin: 0;
  background-color: #1a1a1a;
  overflow: hidden;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #444;
}

/* UnoCSS 图标支持已通过 uno.config.ts 中的 presetIcons 处理 */
</style>
