import { InputData, ExpressionVector } from '../types/input';
import { Articulation } from '../processor/Articulation';
import StyleResolver, { ConfigurableStyleDNA, StyleDNA, ArticulationInstruction } from './StyleResolver';

import { StringPhysic } from '../processor/StringPhysic';

/**
 * Coordinator 是核心调度器，负责将输入流转化为演奏指令
 */
export class Coordinator {
  private styleResolver: StyleResolver;
  private strokeStates: Map<string, { 
    triggered: boolean, 
    startTime: number,
    currentPitch: number, // 用于音高插值
    targetPitch: number,
    physic: StringPhysic // 每个轨迹关联一个物理弦实体
  }> = new Map();

  private styles: Record<string, StyleDNA> = {
    'Physical': new ConfigurableStyleDNA('Physical', (v, ctx) => {
      const { velocity = 0, pressure = 0.5, isMoving = false, physic } = ctx || {};
      
      if (!physic) return { technique: 'none', intensity: 0, timbre_modifiers: [], description: '未初始化物理实体' };

      // 1. 物理激励 (Excitation)
      // 将 NMEF velocity 和 pressure 转化为能量输入
      if (isMoving) {
        physic.excite(velocity, pressure);
      }

      // 2. 物理状态演进 (Step)
      physic.step(0.016); // 假设 60fps

      // 3. 动态自由度：改变虚拟弦长
      // 这里的 ctx.currentPitch 已经在 processInput 中计算过
      const baseNote = 48; // C3
      const length = Math.pow(2, (baseNote - ctx.currentPitch) / 12);
      physic.updateParameters({ 
        length,
        tension: 1.0 + pressure * 0.5, // 压力增加张力
        damping: 0.02 + (1 - pressure) * 0.1 // 压力减小阻尼，增加余震
      });

      const state = physic.getState();
      const frequency = physic.calculateFrequency();
      const harmonics = physic.getHarmonics();

      return {
        technique: 'physical_string_vibration',
        intensity: state.energy,
        timbre_modifiers: harmonics > 0.5 ? ['rich_harmonics', 'vibrant'] : ['pure_tone'],
        description: `物理激励：频率 ${frequency.toFixed(2)}Hz, 能量 ${state.energy.toFixed(4)}`,
        trigger_type: 'physical_excitation',
        volume: Math.min(1, state.energy * 2.0),
        cutoff: 0.1 + harmonics * 0.9,
        physics: {
          ...state,
          frequency,
          harmonics
        }
      };
    }),
    'Fluid': new ConfigurableStyleDNA('Fluid', (v, ctx) => {
      // ... 保持原有流体逻辑 ...
      const { velocity = 0, pressure = 0.5 } = ctx || {};
      const baseVolume = 0.05;
      const dynamicVolume = Math.min(0.95, velocity * 2.0);
      const volume = baseVolume + dynamicVolume;
      const cutoff = 0.2 + Math.min(0.8, velocity * 3.0);
      return { technique: 'cello_fluid_sustain', intensity: v.energy, timbre_modifiers: ['soft_bowing'], description: `流体驱动`, trigger_type: 'fluid_sustain', volume, cutoff, pitch_lerp: 0.15, release_time: 1.5 };
    }),
    // ... 其他风格 ...
  };

  constructor() {
    // 默认切换为 Physical 物理激励架构
    this.styleResolver = new StyleResolver(this.styles['Physical']);
  }

  /**
   * 处理输入数据并返回风格化的演奏指令
   */
  public processInput(input: InputData): ArticulationInstruction[] {
    const styleName = 'Physical'; // 强制物理激励架构
    
    if (this.styles[styleName]) {
      this.styleResolver.setStyle(this.styles[styleName]);
    }

    const latestEvent = input.events[input.events.length - 1];
    if (!latestEvent) return [];

    const strokeId = latestEvent.stroke_id;
    const history = input.events.filter(e => e.stroke_id === strokeId);
    
    // 计算物理参数
    const velocity = latestEvent.payload.dynamics.velocity;
    const isMoving = velocity > 0.005;

    // 维护触发状态与物理实体
    if (!this.strokeStates.has(strokeId)) {
      const initialPitch = latestEvent.payload.pitch.base_note + (latestEvent.payload.pitch.micro_offset / 100);
      this.strokeStates.set(strokeId, { 
        triggered: false, 
        startTime: Date.now(),
        currentPitch: initialPitch,
        targetPitch: initialPitch,
        physic: new StringPhysic({ damping: 0.05, mass: 1.2 }) // 初始化物理弦
      });
    }
    const state = this.strokeStates.get(strokeId)!;

    // 更新目标音高
    state.targetPitch = latestEvent.payload.pitch.base_note + (latestEvent.payload.pitch.micro_offset / 100);
    
    // 执行音高插值 (Lerp) - 橡皮筋效应
    const lerpFactor = 0.15; 
    state.currentPitch += (state.targetPitch - state.currentPitch) * lerpFactor;

    // 计算表现力向量并解析指令
    const vector = Articulation.calculateExpression(history);
    const instruction = this.styleResolver.resolve(vector, {
      velocity,
      isMoving,
      pressure: latestEvent.payload.dynamics.pressure,
      state: latestEvent.state,
      triggered: state.triggered,
      currentPitch: state.currentPitch,
      physic: state.physic
    });

    if (latestEvent.state === 'end') {
      // 轨迹结束时，物理实体不立即销毁，允许余震
      // 这里简化处理，实际中可能需要一个 ActivePhysic 列表
      setTimeout(() => {
        this.strokeStates.delete(strokeId);
      }, 2000); // 允许 2 秒余震
    }

    return [instruction];
  }
}
