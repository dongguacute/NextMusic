import { ScaleSystem } from '../engine/ScaleSystem';
import { GlobalContext } from '../types/input';

/**
 * 采样元数据
 */
export interface SampleMetadata {
  id: string;
  midiNote: number;
  filePath: string;
  durationMs: number;
}

/**
 * 内存中的采样 Buffer 状态
 */
export interface SampleBuffer {
  metadata: SampleMetadata;
  transientBuffer: Float32Array | null; // 前 100ms 的采样数据
  isLoaded: boolean;
  lastAccessTime: number;
}

/**
 * StreamLoader 负责智能流式加载采样库。
 * 核心逻辑：
 * 1. 预测：根据 ScaleSystem 预测当前音阶周围的采样。
 * 2. 混合加载：只加载最关键的初始 100ms (Transient) 到 RAM。
 * 3. 流式读取：后续长音从硬盘流式读取（本示例模拟流式控制）。
 */
export class StreamLoader {
  private scaleSystem: ScaleSystem;
  private sampleMap: Map<number, SampleMetadata[]> = new Map();
  private bufferPool: Map<string, SampleBuffer> = new Map();
  
  // 配置参数
  private readonly TRANSIENT_DURATION_MS = 100;
  private readonly PRELOAD_RANGE_SEMITONES = 2; // 预加载当前音阶周围 2 个半音范围
  private readonly MAX_BUFFER_SIZE = 512 * 1024 * 1024; // 512MB 内存限制 (示例)

  constructor(scaleSystem: ScaleSystem) {
    this.scaleSystem = scaleSystem;
  }

  /**
   * 注册采样库元数据
   */
  public registerSamples(samples: SampleMetadata[]) {
    for (const sample of samples) {
      const list = this.sampleMap.get(sample.midiNote) || [];
      list.push(sample);
      this.sampleMap.set(sample.midiNote, list);
    }
  }

  /**
   * 根据当前音阶和上下文预加载采样
   */
  public async preloadForContext(context: GlobalContext, currentMidi: number) {
    // 1. 获取当前音阶允许的音符
    // 调用 ScaleSystem 的方法获取合法音符
    const notesToPreload = this.scaleSystem.getValidNotesInRange(currentMidi, this.PRELOAD_RANGE_SEMITONES);

    for (const midi of notesToPreload) {
      const samples = this.sampleMap.get(midi);
      if (samples) {
        for (const sample of samples) {
          await this.loadTransient(sample);
        }
      }
    }

    this.cleanupUnusedBuffers();
  }

  /**
   * 加载采样的 Transient 部分 (前 100ms)
   */
  private async loadTransient(sample: SampleMetadata) {
    if (this.bufferPool.has(sample.id)) {
      const buf = this.bufferPool.get(sample.id)!;
      buf.lastAccessTime = Date.now();
      return;
    }

    // 模拟从硬盘读取前 100ms
    // console.log(`[StreamLoader] Loading transient for ${sample.id} from ${sample.filePath}`);
    
    const transientData = await this.mockReadFromDisk(sample.filePath, 0, this.TRANSIENT_DURATION_MS);
    
    this.bufferPool.set(sample.id, {
      metadata: sample,
      transientBuffer: transientData,
      isLoaded: true,
      lastAccessTime: Date.now()
    });
  }

  /**
   * 获取采样用于播放
   * 返回 Transient Buffer 和一个用于流式读取后续内容的句柄/回调
   */
  public getSampleForPlayback(midiNote: number) {
    const samples = this.sampleMap.get(midiNote);
    if (!samples || samples.length === 0) return null;

    // 简单起见，取第一个匹配的采样
    const sample = samples[0];
    const buffer = this.bufferPool.get(sample.id);

    if (!buffer || !buffer.isLoaded) {
      // 如果没预加载成功（可能是突发音），则同步/紧急加载
      // 实际生产环境这里需要极低延迟的处理
      return {
        metadata: sample,
        transient: null,
        streamFromMs: 0
      };
    }

    buffer.lastAccessTime = Date.now();
    return {
      metadata: sample,
      transient: buffer.transientBuffer,
      streamFromMs: this.TRANSIENT_DURATION_MS
    };
  }

  /**
   * 模拟从磁盘读取特定范围的采样数据
   */
  private async mockReadFromDisk(path: string, startMs: number, durationMs: number): Promise<Float32Array> {
    // 模拟异步 IO 延迟
    await new Promise(resolve => setTimeout(resolve, 5));
    
    // 返回模拟的采样数据 (100ms, 假设 44.1kHz)
    const sampleCount = Math.floor(44100 * (durationMs / 1000));
    return new Float32Array(sampleCount).fill(Math.random() * 0.1);
  }

  /**
   * 清理长时间未使用的 Buffer
   */
  private cleanupUnusedBuffers() {
    const now = Date.now();
    const idleThreshold = 30000; // 30秒未使用则清理

    for (const [id, buffer] of this.bufferPool.entries()) {
      if (now - buffer.lastAccessTime > idleThreshold) {
        this.bufferPool.delete(id);
      }
    }
  }
}
