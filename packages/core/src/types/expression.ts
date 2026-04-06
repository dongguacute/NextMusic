import { z } from 'zod'

/**
 * 表达曲线点：[时间偏移, 数值]
 * 时间偏移相对于音符开始，数值范围 0-1
 */
export const CurvePointSchema = z.tuple([z.number().min(0), z.number().min(0).max(1)])

/**
 * 演奏方式 (Articulation)：决定演奏的风格和动态特征
 */
export const ArticulationSchema = z.enum(['pad', 'lead', 'pluck']).default('lead')

/**
 * 表达系统参数
 */
export const ExpressionSchema = z.object({
  // 演奏方式
  articulation: ArticulationSchema,
  
  // 初始触发力度 (0-1)
  velocity: z.number().min(0).max(1).default(0.8),
  
  // 滑音 (Portamento)：从上一个音符滑向当前音符的时间（秒）
  glide: z.number().min(0).max(2).default(0),

  // 节奏微调 (Humanize)：起始时间的微小偏移
  timingOffset: z.number().min(-0.1).max(0.1).default(0),
  
  // 动态增益曲线 (用于膨胀、淡入淡出等)
  gainCurve: z.array(CurvePointSchema).optional(),
  
  // 动态亮度/滤波曲线 (用于音色变化)
  timbreCurve: z.array(CurvePointSchema).optional(),
  
  // 颤音幅度 (0-1)
  vibrato: z.number().min(0).max(1).default(0),
})

export type CurvePoint = z.infer<typeof CurvePointSchema>
export type Articulation = z.infer<typeof ArticulationSchema>
export type Expression = z.infer<typeof ExpressionSchema>
