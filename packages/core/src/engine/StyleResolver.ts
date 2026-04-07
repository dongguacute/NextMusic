import { ExpressionVector } from '../types/input';
import { Articulation } from '../processor/Articulation';
import GestureAnalyzer from '../processor/GestureAnalyzer';

export interface StyleDNA {
  name: string;
  /**
   * 根据表现力向量解析出具体的演奏指令
   * @param vector 表现力向量 (energy, instability, aggression, coherence)
   * @returns 具体的演奏指令描述
   */
  resolveInstruction(vector: ExpressionVector): string;
}

/**
 * Jazz 风格 DNA
 */
export class JazzDNA implements StyleDNA {
  name = 'Jazz';
  resolveInstruction(vector: ExpressionVector): string {
    if (vector.energy > 0.7) {
      return '这个音需要一点蓝调的下行滑音';
    }
    return '轻柔的切分音阶推进';
  }
}

/**
 * Heavy Metal 风格 DNA
 */
export class HeavyMetalDNA implements StyleDNA {
  name = 'Heavy Metal';
  resolveInstruction(vector: ExpressionVector): string {
    if (vector.energy > 0.7) {
      return '给这个音加上极强的过载反馈';
    }
    return '沉重的低音闷音奏法';
  }
}

export class StyleResolver {
  private gestureAnalyzer: GestureAnalyzer;
  private currentDNA: StyleDNA;

  constructor(dna: StyleDNA = new JazzDNA()) {
    this.gestureAnalyzer = new GestureAnalyzer();
    this.currentDNA = dna;
  }

  /**
   * 切换风格 DNA
   */
  public setStyle(dna: StyleDNA) {
    this.currentDNA = dna;
  }

  /**
   * 解析表现力并生成指令
   * @param vector 表现力向量
   */
  public resolve(vector: ExpressionVector): string {
    return this.currentDNA.resolveInstruction(vector);
  }
}

export default StyleResolver;