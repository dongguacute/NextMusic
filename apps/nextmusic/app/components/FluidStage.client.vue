<template>
  <canvas
    ref="canvasRef"
    class="fluid-stage"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import type { Frame } from '@netxmusic/core'
// 自动导入的 composable
import { useAudioEngine } from '#imports'

const { analyzerData, injectNMEF } = useAudioEngine()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

// 计算实时能量值 (0 - 1)
const energy = computed(() => {
  if (!analyzerData.value || analyzerData.value.length === 0) return 0
  let sum = 0
  for (let i = 0; i < analyzerData.value.length; i++) {
    sum += analyzerData.value[i]
  }
  return sum / (analyzerData.value.length * 255)
})

// 交互状态
let isDrawing = false
let points: { x: number, y: number, time: number }[] = []
let lastTime = 0
let animationFrameId = 0

// 尺寸自适应
const resizeCanvas = () => {
  if (!canvasRef.value) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
}

// 指针事件处理
const onPointerDown = (e: PointerEvent) => {
  isDrawing = true
  points = [{ x: e.clientX, y: e.clientY, time: performance.now() }]
  lastTime = performance.now()
}

const onPointerMove = (e: PointerEvent) => {
  if (!isDrawing) return
  
  const currentTime = performance.now()
  const dt = currentTime - lastTime || 16
  
  const currentPoint = { x: e.clientX, y: e.clientY, time: currentTime }
  const lastPoint = points[points.length - 1]
  
  // 计算移动速率 (像素/毫秒)
  const dx = currentPoint.x - lastPoint.x
  const dy = currentPoint.y - lastPoint.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const velocity = distance / dt
  
  // 映射为压力值 (0 - 1)，假设最大速率约为 5 px/ms
  const pressure = Math.min(velocity / 5, 1)
  
  points.push(currentPoint)
  // 保持轨迹长度
  if (points.length > 25) {
    points.shift()
  }
  
  lastTime = currentTime
  
  // X 轴坐标映射为音色亮度 (0 - 1)
  const brightness = Math.max(0, Math.min(1, currentPoint.x / window.innerWidth))
  
  // Y 轴坐标映射为音高偏移 (例如 200Hz - 800Hz，越往上音越高)
  const yNormalized = 1 - Math.max(0, Math.min(1, currentPoint.y / window.innerHeight))
  const hz = 200 + yNormalized * 600
  
  // 封装 NMEF 格式并推入引擎
  const frame: Frame = {
    t: currentTime,
    source: 'fluid',
    pitch: {
      hz,
      stability: 1.0,
      glissando: true
    },
    dynamics: {
      energy: energy.value,
      pressure,
      attack_vel: pressure > 0.8 ? 1 : 0
    },
    timbre: {
      brightness,
      vibrato_depth: 0,
      formant_shift: 0
    },
    intent: {
      gesture_id: 'stroke',
      active_stroke: true
    }
  }
  injectNMEF(frame)
}

const onPointerUp = () => {
  if (!isDrawing) return
  isDrawing = false
  points = []
  
  // 发送结束帧
  const frame: Frame = {
    t: performance.now(),
    source: 'fluid',
    pitch: { hz: 440, stability: 0, glissando: false },
    dynamics: { energy: 0, pressure: 0, attack_vel: 0 },
    timbre: { brightness: 0, vibrato_depth: 0, formant_shift: 0 },
    intent: { gesture_id: 'stroke', active_stroke: false }
  }
  injectNMEF(frame)
}

// 视觉渲染循环
const render = () => {
  if (!canvasRef.value || !ctx) return
  
  const width = canvasRef.value.width
  const height = canvasRef.value.height
  
  // 深色背景与拖影效果
  ctx.fillStyle = 'rgba(10, 10, 15, 0.25)'
  ctx.fillRect(0, 0, width, height)
  
  if (points.length > 1) {
    const currentEnergy = energy.value
    
    // 线的粗细由 energy 驱动
    const baseWidth = 3
    const extraWidth = currentEnergy * 20
    ctx.lineWidth = baseWidth + extraWidth
    
    // 发光强度由 energy 驱动
    ctx.shadowBlur = 15 + currentEnergy * 40
    ctx.shadowColor = `rgba(120, 220, 255, ${0.6 + currentEnergy * 0.4})`
    ctx.strokeStyle = `rgba(180, 240, 255, ${0.8 + currentEnergy * 0.2})`
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    
    // 绘制贝塞尔曲线
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2
      const yc = (points[i].y + points[i + 1].y) / 2
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
    }
    // 连接到最后一个点
    const lastPoint = points[points.length - 1]
    ctx.lineTo(lastPoint.x, lastPoint.y)
    ctx.stroke()
  }
  
  animationFrameId = requestAnimationFrame(render)
}

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()
    render()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.fluid-stage {
  display: block;
  width: 100vw;
  height: 100vh;
  background-color: #0a0a0f;
  /* 禁用默认的触摸行为，如滚动和缩放 */
  touch-action: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
}
</style>
