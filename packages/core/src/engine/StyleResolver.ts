import { ExpressionVector } from '../types/input';

/**
 * 演奏参数映射，定义了表现力向量如何转化为具体的合成器/效果器参数
 */
export interface ArticulationInstruction {
  technique: string;        // 演奏技法 (如: "glissando", "feedback", "palm_mute")
  intensity: number;       // 技法强度 (0-1)
  timbre_modifiers: string[]; // 音色修正指令
  description: string;     // 人类可读的描述 (用于调试或下一级处理)
}

/**
 * StyleDNA 定义了不同音乐风格的“表现力翻译规则”
 * 它是风格的灵魂，决定了同样的输入能量在不同风格下如何转化为具体的演奏技法
 */
export interface StyleDNA {
  name: string;
  /**
   * 核心映射逻辑：将抽象的表现力向量 (ExpressionVector) 
   * 翻译为具体的演奏指令 (ArticulationInstruction)
   */
  resolve(vector: ExpressionVector): ArticulationInstruction;
}

/**
 * 基础风格实现，支持通过配置规则来定义风格
 */
export class ConfigurableStyleDNA implements StyleDNA {
  constructor(
    public name: string,
    private rules: (vector: ExpressionVector) => ArticulationInstruction
  ) {}

  resolve(vector: ExpressionVector): ArticulationInstruction {
    return this.rules(vector);
  }
}

/**
 * StyleResolver 负责持有并应用当前的 StyleDNA
 */
export class StyleResolver {
  private currentDNA: StyleDNA;

  constructor(initialDNA: StyleDNA) {
    this.currentDNA = initialDNA;
  }

  public setStyle(dna: StyleDNA) {
    this.currentDNA = dna;
  }

  /**
   * 执行解析：将表现力向量输入，输出风格化的演奏指令
   */
  public resolve(vector: ExpressionVector): ArticulationInstruction {
    return this.currentDNA.resolve(vector);
  }
}

export default StyleResolver;
