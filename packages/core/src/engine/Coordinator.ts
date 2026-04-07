import { InputData, ExpressionVector } from '../types/input';
import { Articulation } from '../processor/Articulation';
import StyleResolver, { ConfigurableStyleDNA, StyleDNA, ArticulationInstruction } from './StyleResolver';

/**
 * Coordinator 是核心调度器，负责将输入流转化为演奏指令
 */
export class Coordinator {
  private styleResolver: StyleResolver;
  private styles: Record<string, StyleDNA> = {
    'Jazz': new ConfigurableStyleDNA('Jazz', (v) => ({
      technique: v.energy > 0.7 ? 'blues_slide_down' : 'syncopated_staccato',
      intensity: v.energy,
      timbre_modifiers: ['swing', 'warm'],
      description: v.energy > 0.7 ? '这个音需要一点蓝调的下行滑音' : '轻柔的切分音阶推进'
    })),
    'Heavy Metal': new ConfigurableStyleDNA('Heavy Metal', (v) => ({
      technique: v.energy > 0.7 ? 'overdrive_feedback' : 'palm_mute',
      intensity: v.energy,
      timbre_modifiers: ['distorted', 'aggressive'],
      description: v.energy > 0.7 ? '给这个音加上极强的过载反馈' : '沉重的低音闷音奏法'
    }))
  };

  constructor() {
    // 默认使用 Jazz 风格初始化
    this.styleResolver = new StyleResolver(this.styles['Jazz']);
  }

  /**
   * 处理输入数据并返回风格化的演奏指令
   */
  public processInput(input: InputData): ArticulationInstruction[] {
    const styleName = input.header.global_context.style_dna;
    
    // 根据输入切换风格
    if (this.styles[styleName]) {
      this.styleResolver.setStyle(this.styles[styleName]);
    }

    // 计算表现力向量并解析指令
    const vector = Articulation.calculateExpression(input.events);
    const instruction = this.styleResolver.resolve(vector);

    return [instruction];
  }
}
