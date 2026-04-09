import fs from 'node:fs'
import path from 'node:path'
import { defineEventHandler, getHeader, setResponseHeaders, setResponseStatus, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const filePathParam = event.context.params?.path
  if (!filePathParam) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request: Missing path' })
  }

  // 安全校验：限制只能读取指定格式的音频文件
  const allowedExtensions = ['.bin', '.wav', '.mp3', '.ogg', '.flac']
  const ext = path.extname(filePathParam).toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Invalid file type' })
  }

  // 防止目录遍历攻击
  const normalizedPath = path.normalize(filePathParam).replace(/^(\.\.(\/|\\|$))+/, '')
  const baseDir = path.resolve(process.cwd(), 'public/samples')
  const absolutePath = path.join(baseDir, normalizedPath)

  // 确保最终路径仍在 public/samples 目录下
  if (!absolutePath.startsWith(baseDir)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Invalid path' })
  }

  try {
    const stat = await fs.promises.stat(absolutePath)
    const fileSize = stat.size
    const range = getHeader(event, 'range')

    // 设置基础响应头，优化加载速度
    setResponseHeaders(event, {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': ext === '.wav' ? 'audio/wav' : 'application/octet-stream'
    })

    // 处理 Range 请求 (Partial Content)
    if (typeof range === 'string') {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

      if (start >= fileSize || end >= fileSize) {
        setResponseStatus(event, 416)
        setResponseHeaders(event, { 'Content-Range': `bytes */${fileSize}` })
        return ''
      }

      const chunksize = (end - start) + 1
      setResponseStatus(event, 206) // 206 Partial Content
      setResponseHeaders(event, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize.toString()
      })

      return fs.createReadStream(absolutePath, { start, end })
    } else {
      // 完整请求
      setResponseHeaders(event, {
        'Content-Length': fileSize.toString()
      })
      return fs.createReadStream(absolutePath)
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: 'Not Found: File does not exist' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
})
