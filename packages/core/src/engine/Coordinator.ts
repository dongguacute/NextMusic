import { InputData, ExpressionVector } from '../types/input';
import { Articulation } from '../processor/Articulation';
import StyleResolver, { JazzDNA, HeavyMetalDNA, StyleDNA } from './StyleResolver';

/**
 * Coordinator 是核心调度器，负责将输入流转化为演奏指令
 */
export class Coordinator {
  private styleResolver: StyleResolver;
  private styles: Record<string, StyleDNA> = {
    'Jazz': new JazzDNA(),
    'Heavy Metal': new HeavyMetalDNA()
  };

  constructor() {
    this.styleResolver = new StyleResolver();
  }

  /**
   * 处理输入数据并返回风格化的演奏指令
   */
  public processInput(input: InputData): string[] {
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
