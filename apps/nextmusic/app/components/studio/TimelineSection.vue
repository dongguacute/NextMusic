<script setup lang="ts">
import Timeline from '../Timeline.vue'
</script>

<template>
  <section class="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold flex items-center gap-2">
        <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
        Timeline
      </h2>
      <div class="text-xs text-gray-500 font-mono">00:00:00</div>
    </div>
    <Timeline track-id="track-1" />
  </section>
</template>
