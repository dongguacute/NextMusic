<script setup lang="ts">
import StudioHeader from '../components/studio/StudioHeader.vue'
import TimelineSection from '../components/studio/TimelineSection.vue'
import InstrumentSection from '../components/studio/InstrumentSection.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white p-8 font-sans">
    <StudioHeader />

    <main class="grid gap-8">
      <TimelineSection />
      <InstrumentSection />
    </main>

    <footer class="mt-12 text-center text-gray-600 text-xs">
      &copy; 2026 NextMusic. Powered by @netxmusic/core.
    </footer>
  </div>
</template>

<style>
body {
  margin: 0;
  background-color: #050505;
}
</style>
