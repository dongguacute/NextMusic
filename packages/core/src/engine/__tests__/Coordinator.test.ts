import { describe, it, expect, beforeEach } from 'vitest';
import { Coordinator } from '../Coordinator';
import { InputData } from '../../types/Header';
import { Frame } from '../../types/Frame_Stream';

describe('Coordinator 映射逻辑测试', () => {
  let coordinator: Coordinator;
  const mockHeader: InputData = {
    version: '1.0.0',
    session_id: 'test-session',
    context: {
      instrument_id: 'cello-01',
      style_preset: 'classical',
      scale: {
        root: 'C',
        mode: 'major',
        quantize_level: 0,
        allow_microtonal: true
      },
      sample_rate: 44100,
      frame_ms: 20
    }
  };

  beforeEach(() => {
    coordinator = new Coordinator(mockHeader, {
      pitch_smoothing: 0.1, // 设置较小的平滑系数以便观察平滑过程
      energy_to_cutoff_base: 200,
      energy_to_cutoff_range: 8000,
      layer_thresholds: [0.33, 0.66]
    });
  });

  it('极慢音高滑行测试：输出应该是平滑的曲线', () => {
    const startHz = 261.63; // C4
    const endHz = 293.66;   // D4
    const steps = 50;
    const outputs: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const targetHz = startHz + (endHz - startHz) * (i / steps);
      const frame: Frame = createMockFrame(targetHz, 0.5);
      const result = coordinator.process(frame);
      outputs.push(result.pitch_hz);
    }

    // 验证平滑性：相邻两帧的差值不应等于目标差值（说明有平滑处理）
    for (let i = 1; i < outputs.length; i++) {
      const diff = Math.abs(outputs[i] - outputs[i - 1]);
      const targetDiff = (endHz - startHz) / steps;
      
      // 验证差值被平滑了（不应该等于瞬时的 targetDiff）
      // 且不应该出现 0（说明一直在移动）
      expect(diff).toBeLessThan(targetDiff * 2); 
      expect(diff).toBeGreaterThan(0); 
    }

    // 最终应该趋近于目标值
    expect(outputs[outputs.length - 1]).toBeLessThan(endHz);
    expect(outputs[outputs.length - 1]).toBeGreaterThan(startHz);
  });

  it('能量流波动测试：音量变大时，音色（Cutoff）应联动变尖锐', () => {
    // 使用更极端的能量值来确保落在权重中心
    const energies = [0.05, 0.5, 0.95];
    const results = energies.map(e => coordinator.process(createMockFrame(440, e)));

    // 验证 Cutoff 随能量增加而增加（变得尖锐）
    expect(results[1].cutoff_hz).toBeGreaterThan(results[0].cutoff_hz);
    expect(results[2].cutoff_hz).toBeGreaterThan(results[1].cutoff_hz);

    // 验证采样层权重随能量变化（音色变化）
    // 0.05 能量应主要在第一层 (Layer 0)
    expect(results[0].layer_weights[0]).toBeGreaterThan(0.8);
    // 0.5 能量应在中间层 (Layer 1) 有较高权重
    // 在 [0.33, 0.66] 阈值下，0.5 处于中间区间的中心附近
    expect(results[1].layer_weights[1]).toBeGreaterThan(0.4); 
    // 0.95 能量应主要在最后一层 (Layer 2)
    expect(results[2].layer_weights[2]).toBeGreaterThan(0.8);
  });

  function createMockFrame(hz: number, energy: number): Frame {
    return {
      t: Date.now(),
      source: 'voice',
      pitch: { hz, stability: 1, glissando: true },
      dynamics: { energy, pressure: energy, attack_vel: 0.1 },
      timbre: { brightness: 0.5, vibrato_depth: 0.1, formant_shift: 0 },
      intent: { gesture_id: 'none', active_stroke: true }
    };
  }
});
