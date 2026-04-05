<script setup lang="ts">
import PianoKeyboard from '../PianoKeyboard.vue'
</script>

<template>
  <section class="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold">Virtual Instrument</h2>
      <select class="bg-gray-800 border-none rounded px-3 py-1 text-sm focus:ring-2 ring-blue-500">
        <option>Synth Lead</option>
        <option>Electric Piano</option>
      </select>
    </div>
    <div class="flex justify-center">
      <PianoKeyboard track-id="track-1" />
    </div>
  </section>
</template>
