import { z } from 'zod';

/**
 * 音高信息验证 (Pitch)
 */
export const PitchSchema = z.object({
  hz: z.number().positive().describe('原始输入频率'),
  stability: z.number().min(0).max(1).describe('音高稳定性 (0-1)'),
  glissando: z.boolean().describe('是否处于滑音状态'),
});

/**
 * 力度与动态验证 (Dynamics)
 */
export const DynamicsSchema = z.object({
  energy: z.number().min(0).max(1).describe('总体能量 (0-1)'),
  pressure: z.number().min(0).max(1).describe('映射的压力值'),
  attack_vel: z.number().min(0).max(1).describe('瞬时冲量/重音爆破'),
});

/**
 * 音色特征验证 (Timbre)
 */
export const TimbreSchema = z.object({
  brightness: z.number().min(0).max(1).describe('哼唱开合度/亮度'),
  vibrato_depth: z.number().min(0).max(1).describe('颤音深度'),
  formant_shift: z.number().min(-1).max(1).describe('共振峰偏移'),
});

/**
 * 意图识别验证 (Intent)
 */
export const IntentSchema = z.object({
  gesture_id: z.string().describe('AI 识别出的动作意图'),
  active_stroke: z.boolean().describe('是否处于持续表达周期内'),
});

/**
 * 单帧数据验证 (Frame)
 */
export const FrameSchema = z.object({
  t: z.number().nonnegative().describe('时间戳 (ms)'),
  source: z.enum(['voice', 'fluid']).describe('输入源: voice (哼唱) 或 fluid (手势)'),
  pitch: PitchSchema,
  dynamics: DynamicsSchema,
  timbre: TimbreSchema,
  intent: IntentSchema,
});

/**
 * 帧流数据验证 (Frame Stream) - 数组格式
 */
export const FrameStreamSchema = z.array(FrameSchema);

// 导出类型定义
export type Pitch = z.infer<typeof PitchSchema>;
export type Dynamics = z.infer<typeof DynamicsSchema>;
export type Timbre = z.infer<typeof TimbreSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Frame = z.infer<typeof FrameSchema>;
export type FrameStream = z.infer<typeof FrameStreamSchema>;

/**
 * 验证帧流数据的辅助函数
 */
export function validateFrameStream(data: unknown): FrameStream {
  return FrameStreamSchema.parse(data);
}

/**
 * 安全验证帧流数据的辅助函数
 */
export function safeValidateFrameStream(data: unknown) {
  return FrameStreamSchema.safeParse(data);
}
