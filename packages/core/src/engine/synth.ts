import { OscillatorType, TimbreParams } from '../types/timbre'
import { Expression, CurvePoint } from '../types/expression'

/**
 * 基础波形生成器接口
 */
export interface Oscillator {
  generate(time: number, frequency: number): number
}

/**
 * 程序合成引擎
 */
export class SynthEngine {
  /**
   * 生成指定频率和波形的采样点
   */
  static getSample(type: OscillatorType, phase: number): number {
    switch (type) {
      case 'sine':
        return Math.sin(phase)
      case 'square':
        return Math.sign(Math.sin(phase))
      case 'sawtooth':
        return 2 * (phase / (2 * Math.PI) - Math.floor(0.5 + phase / (2 * Math.PI)))
      case 'triangle':
        return 2 * Math.abs(2 * (phase / (2 * Math.PI) - Math.floor(0.5 + phase / (2 * Math.PI)))) - 1
      default:
        return Math.sin(phase)
    }
  }

  /**
   * 应用包络 (ADSR)
   * @param time 当前时间（相对于音符开始）
   * @param duration 音符持续时间
   * @param params 音色参数
   * @param expression 表达参数（包含演奏方式）
   */
  static applyEnvelope(time: number, duration: number, params: TimbreParams, expression?: Expression): number {
    let { attack, decay, sustain, release } = params.envelope
    const articulation = expression?.articulation || 'lead'

    // 根据演奏方式调整包络
    switch (articulation) {
      case 'pad':
        // Pad: 缓慢淡入，长释放
        attack = Math.max(attack, 0.4)
        release = Math.max(release, 0.8)
        break
      case 'pluck':
        // Pluck: 极快触发，快速衰减到低 sustain 或直接消失
        attack = Math.min(attack, 0.02)
        decay = Math.min(decay, 0.2)
        sustain = sustain * 0.3
        break
      case 'lead':
      default:
        // Lead: 标准触发，中等衰减
        break
    }

    // Attack
    if (time < attack) {
      return time / attack
    }
    // Decay
    if (time < attack + decay) {
      return 1 - ((time - attack) / decay) * (1 - sustain)
    }
    // Sustain
    if (time < duration) {
      return sustain
    }
    // Release
    if (time < duration + release) {
      return sustain * (1 - (time - duration) / release)
    }

    return 0
  }

  /**
   * 从曲线中获取插值后的数值
   * @param time 当前时间
   * @param curve 曲线点数组
   * @param defaultValue 默认值
   */
  static interpolateCurve(time: number, curve: CurvePoint[], defaultValue: number): number {
    if (curve.length === 0) return defaultValue
    if (time <= curve[0][0]) return curve[0][1]
    if (time >= curve[curve.length - 1][0]) return curve[curve.length - 1][1]

    for (let i = 0; i < curve.length - 1; i++) {
      const [t1, v1] = curve[i]
      const [t2, v2] = curve[i + 1]
      if (time >= t1 && time <= t2) {
        const ratio = (time - t1) / (t2 - t1)
        return v1 + ratio * (v2 - v1)
      }
    }
    return defaultValue
  }

  /**
   * 计算实时表达参数
   */
  static getExpressionValue(time: number, expression: Expression): { gain: number, brightness: number } {
    const gain = expression.gainCurve 
      ? this.interpolateCurve(time, expression.gainCurve, expression.velocity)
      : expression.velocity

    const brightness = expression.timbreCurve
      ? this.interpolateCurve(time, expression.timbreCurve, 0.5)
      : 0.5

    return { gain, brightness }
  }
}
