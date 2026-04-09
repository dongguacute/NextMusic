/**
 * SampleSource 负责管理单个音频采样源的播放状态。
 * 支持线性插值播放、无缝循环和增益平滑。
 */
export class SampleSource {
  public buffer: Float32Array;
  public playbackRate: number = 1.0;
  public loopStart: number = 0;
  public loopEnd: number = 0;
  public loop: boolean = false;
  public phase: number = 0;
  
  // 增益平滑参数
  public currentGain: number = 0;
  public targetGain: number = 0;
  private readonly gainStep: number = 0.005; // 简单的线性平滑步长

  constructor(buffer: Float32Array) {
    this.buffer = buffer;
  }

  /**
   * 获取下一帧采样值（带线性插值以支持任意 playbackRate）
   */
  public nextSample(): number {
    const len = this.buffer.length;
    
    // 处理循环逻辑 (Looping)
    if (this.loop) {
      if (this.phase >= this.loopEnd) {
        // 确保循环点对齐，不产生相位抵消
        this.phase = this.loopStart + (this.phase - this.loopEnd);
      }
    } else if (this.phase >= len - 1) {
      return 0;
    }

    const index = Math.floor(this.phase);
    const frac = this.phase - index;
    const nextIndex = (index + 1) % len;

    const s1 = this.buffer[index];
    const s2 = this.buffer[nextIndex];
    const sample = s1 + (s2 - s1) * frac;

    this.phase += this.playbackRate;
    
    // 应用简单的增益平滑 (Parameter Smoothing)
    if (Math.abs(this.currentGain - this.targetGain) < this.gainStep) {
      this.currentGain = this.targetGain;
    } else {
      this.currentGain += (this.targetGain > this.currentGain ? 1 : -1) * this.gainStep;
    }

    return sample * this.currentGain;
  }

  public isFinished(): boolean {
    return !this.loop && this.phase >= this.buffer.length - 1 && this.currentGain < 0.001;
  }
}

/**
 * SampleProvider 负责管理多个 SampleSource 的叠加渲染。
 */
export class SampleProvider {
  private activeSources: SampleSource[] = [];
  private readonly maxLayers: number = 16;

  public addSource(source: SampleSource) {
    if (this.activeSources.length < this.maxLayers) {
      this.activeSources.push(source);
    }
  }

  public process(output: Float32Array) {
    // 使用 Float32Array.fill 进行向量化运算，避免在循环内创建新对象或触发 GC
    output.fill(0);

    for (let j = this.activeSources.length - 1; j >= 0; j--) {
      const source = this.activeSources[j];
      for (let i = 0; i < output.length; i++) {
        output[i] += source.nextSample();
      }

      if (source.isFinished()) {
        this.activeSources.splice(j, 1);
      }
    }
  }
}

/**
 * AudioWorkletProcessor 实现类
 * 包含参数平滑、ADSR 包络和采样渲染逻辑。
 */
export class AudioWorkletProcessorImpl {
  private sampleProvider: SampleProvider = new SampleProvider();
  
  // 参数平滑 (Parameter Smoothing)
  private currentGlobalGain: number = 0;
  private targetGlobalGain: number = 1.0;
  
  // ADSR 包络 (Envelope Follower)
  private envelopeValue: number = 0;
  private envelopeState: 'idle' | 'attack' | 'release' = 'idle';
  private readonly attackStep: number = 0.01;  // 约 1.2ms (128 samples @ 44.1kHz)
  private readonly releaseStep: number = 0.005; // 约 2.4ms

  /**
   * 核心处理函数
   * @param output 单个声道的输出缓冲区 (通常 128 samples)
   * @param params 外部传入的参数 (pitch, gain 等)
   */
  public processBlock(output: Float32Array, params: { gain: number; pitchScale: number; trigger: 'attack' | 'release' | 'none' }) {
    this.targetGlobalGain = params.gain;
    
    // 更新包络状态 (Envelope Follower)
    if (params.trigger === 'attack') this.envelopeState = 'attack';
    if (params.trigger === 'release') this.envelopeState = 'release';

    // 渲染采样叠加 (SampleProvider)
    this.sampleProvider.process(output);

    // 应用全局参数平滑和包络 (Parameter Smoothing & Envelope)
    for (let i = 0; i < output.length; i++) {
      // 1. 全局增益平滑 (Linear Ramp)
      const gainDiff = this.targetGlobalGain - this.currentGlobalGain;
      if (Math.abs(gainDiff) > 0.0001) {
        this.currentGlobalGain += gainDiff * 0.05; // 简单的平滑
      } else {
        this.currentGlobalGain = this.targetGlobalGain;
      }

      // 2. ADSR 包络计算 (Envelope Follower)
      if (this.envelopeState === 'attack') {
        this.envelopeValue = Math.min(1.0, this.envelopeValue + this.attackStep);
        if (this.envelopeValue >= 1.0) this.envelopeState = 'idle';
      } else if (this.envelopeState === 'release') {
        this.envelopeValue = Math.max(0.0, this.envelopeValue - this.releaseStep);
        if (this.envelopeValue <= 0.0) this.envelopeState = 'idle';
      }

      // 3. 最终输出叠加 (Vectorized Operation)
      output[i] *= this.currentGlobalGain * this.envelopeValue;
    }
  }

  public addSampleSource(buffer: Float32Array, loop: boolean = true, loopStart: number = 0, loopEnd: number = 0) {
    const source = new SampleSource(buffer);
    source.loop = loop;
    source.loopStart = loopStart;
    source.loopEnd = loopEnd || buffer.length;
    source.targetGain = 1.0;
    this.sampleProvider.addSource(source);
  }
}
