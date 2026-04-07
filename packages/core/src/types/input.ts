import { z } from 'zod';

/**
 * 基础音阶参考
 */
export const GlobalContextSchema = z.object({
  scale: z.string().describe('当前基础音阶参考'),
  style_dna: z.string().describe('当前风格基因'),
});

/**
 * 消息头定义
 */
export const HeaderSchema = z.object({
  version: z.string().describe('版本号'),
  timestamp: z.number().describe('时间戳'),
  session_id: z.string().describe('会话唯一ID'),
  global_context: GlobalContextSchema,
});

/**
 * 音高数据
 */
export const PitchSchema = z.object({
  base_note: z.number().int().min(0).max(127).describe('基础音坐标 (MIDI编号参考)'),
  micro_offset: z.number().describe('微音程偏移 (Cents)'),
  is_gliding: z.boolean().describe('是否处于滑动状态'),
});

/**
 * 动态/力度感应
 */
export const DynamicsSchema = z.object({
  energy: z.number().min(0).max(1).describe('总体能量强度 (0-1)'),
  pressure: z.number().min(0).max(1).describe('压力感应 (0-1)'),
  velocity: z.number().describe('瞬时速度'),
});

/**
 * 空间/触控位置
 */
export const SpatialSchema = z.object({
  x_axis: z.number().min(0).max(1).describe('水平位置 (0-1)'),
  y_axis: z.number().min(0).max(1).describe('垂直位置 (0-1)'),
  area: z.number().min(0).max(1).describe('接触面积 (0-1)'),
});

/**
 * 演奏意图识别
 */
export const IntentSchema = z.object({
  staccato_weight: z.number().min(0).max(1).describe('断奏意向'),
  vibrato_depth: z.number().min(0).max(1).describe('物理揉弦深度'),
});

/**
 * 单个事件负载
 */
export const EventPayloadSchema = z.object({
  pitch: PitchSchema,
  dynamics: DynamicsSchema,
  spatial: SpatialSchema,
  intent: IntentSchema,
});

/**
 * 轨迹事件
 */
export const EventSchema = z.object({
  stroke_id: z.string().describe('轨迹唯一ID'),
  state: z.enum(['active', 'end']).describe('事件状态'),
  payload: EventPayloadSchema,
});

/**
 * 完整的输入 JSON 验证 Schema
 */
export const InputDataSchema = z.object({
  header: HeaderSchema,
  events: z.array(EventSchema),
});

// 导出类型定义
export type InputData = z.infer<typeof InputDataSchema>;
export type GlobalContext = z.infer<typeof GlobalContextSchema>;
export type Header = z.infer<typeof HeaderSchema>;
export type Event = z.infer<typeof EventSchema>;
export type EventPayload = z.infer<typeof EventPayloadSchema>;
export type Dynamics = z.infer<typeof DynamicsSchema>;

/**
 * 表现力向量 (Expression Vector)
 * 包含能量、不稳定度、攻击性、连贯性
 */
export interface ExpressionVector {
  energy: number;       // 能量 (0-1)
  instability: number;  // 不稳定度 (0-1)
  aggression: number;   // 攻击性 (0-1)
  coherence: number;    // 连贯性 (0-1)
}

/**
 * 衔接与装饰音类型 (Articulation Type)
 */
export type ArticulationType = 'None' | 'Legato' | 'Staccato' | 'Attack' | 'Glissando';

/**
 * 衔接分析结果
 */
export interface ArticulationResult {
  expression: ExpressionVector;
  type: ArticulationType;
  weight: number; // 触发强度 (0-1)
}

/**
 * 验证函数
 * @param data 待验证的 JSON 数据
 * @returns 验证结果
 */
export function validateInputData(data: unknown) {
  return InputDataSchema.safeParse(data);
}
