import { GlobalContext, EventPayload } from '../types/input';

/**
 * ScaleSystem 负责将物理输入（MIDI 编号、偏移量、空间坐标）
 * 转换为最终的音乐频率，并根据调式和风格进行“音准修正”或“艺术化偏移”。
 */
export class ScaleSystem {
  private globalContext: GlobalContext;
  private readonly A4_FREQ = 440;
  private readonly A4_MIDI = 69;

  // 调式音程定义 (相对于根音的半音偏移)
  private readonly SCALES: Record<string, number[]> = {
    'c-major': [0, 2, 4, 5, 7, 9, 11],
    'c-minor': [0, 2, 3, 5, 7, 8, 10],
    'pentatonic': [0, 2, 4, 7, 9],
  };

  constructor(globalContext: GlobalContext) {
    this.globalContext = globalContext;
  }

  /**
   * 将输入负载转换为最终频率
   * @param payload 事件负载
   * @param timestamp 当前时间戳 (用于揉弦计算)
   * @returns 最终频率 (Hz)
   */
  public resolveFrequency(payload: EventPayload, timestamp: number = Date.now()): number {
    const { pitch, spatial, intent } = payload;
    
    // 1. 计算基础 MIDI 音高（包含微音程偏移）
    let midiPitch = pitch.base_note + (pitch.micro_offset / 100);

    // 2. 应用调式过滤与修正
    // 如果不是在滑动 (gliding) 状态，则进行音阶吸附
    if (!pitch.is_gliding) {
      midiPitch = this.applyScaleConstraint(midiPitch);
    }

    // 3. 应用风格化的“走音”或揉弦效果
    midiPitch = this.applyArtisticDrift(midiPitch, intent.vibrato_depth, timestamp);

    // 4. MIDI 转频率
    return this.midiToFreq(midiPitch);
  }

  /**
   * 根据当前调式 (Scale) 约束音高
   * 这里实现了“避开调外音”的逻辑
   */
  private applyScaleConstraint(midi: number): number {
    const scaleKey = this.globalContext.scale.toLowerCase();
    
    // 如果没有找到对应的音阶定义，返回原音高
    if (!this.SCALES[scaleKey]) {
      return midi;
    }

    const allowedIntervals = this.SCALES[scaleKey];
    
    // 提取八度信息和八度内的音符位置
    const octave = Math.floor(midi / 12);
    const noteInOctave = midi % 12;
    
    // 寻找最近的合法音符 (考虑跨八度的情况)
    let closestNote = allowedIntervals[0];
    let minDiff = Math.abs(noteInOctave - allowedIntervals[0]);
    
    for (const interval of allowedIntervals) {
      const diff = Math.abs(noteInOctave - interval);
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = interval;
      }
    }

    // 检查是否更接近下一个八度的第一个音符
    const nextOctaveFirstNote = allowedIntervals[0] + 12;
    if (Math.abs(noteInOctave - nextOctaveFirstNote) < minDiff) {
      closestNote = nextOctaveFirstNote;
    }
    
    return (octave * 12) + closestNote;
  }

  /**
   * 增加真实感的“走音”或物理揉弦处理
   */
  private applyArtisticDrift(midi: number, vibratoDepth: number, timestamp: number): number {
    // 1. 物理揉弦 (Vibrato): 5-7Hz 的正弦波动
    const vibratoFreq = 6; 
    const vibrato = Math.sin(2 * Math.PI * vibratoFreq * (timestamp / 1000)) * (vibratoDepth * 0.5);

    // 2. 风格化漂移 (Drift): 模拟乐器不稳定性
    const styleDrift = (Math.random() - 0.5) * 0.02; // 极微小的随机偏移

    return midi + vibrato + styleDrift;
  }

  /**
   * 标准 MIDI 编号转频率公式
   */
  private midiToFreq(midi: number): number {
    return this.A4_FREQ * Math.pow(2, (midi - this.A4_MIDI) / 12);
  }

  /**
   * 更新全局上下文（如切换调式）
   */
  public updateContext(context: GlobalContext) {
    this.globalContext = context;
  }
}
