import { readFile, stat } from 'node:fs/promises'
import { z } from 'zod'
import { defineTool } from './types.js'
import { resolveInWorkspace, toPosixPath } from './workspace.js'

/**
 * 单个文件最大读取字节数。
 *
 * 这不是 Context Engineering（截断、摘要是 v0.5 的内容），只是一条防御性上限：
 * 避免一次 read_file 把几 MB 内容塞进请求体，直接把这一轮调用打爆。
 */
const MAX_FILE_BYTES = 200 * 1024

/**
 * 给模型看的 JSON Schema。
 *
 * 它和下面的 zod schema 刻意各写一份，因为两者用途完全不同：
 * 这一份是 Prompt 的组成部分，作用是让模型知道有什么能力、参数怎么填；
 * 下面那一份是运行时防线，作用是不信任模型真的填对了。
 * 等 Tool 数量变多、重复变明显时，再考虑由 zod 自动生成 JSON Schema。
 */
const parameters: Record<string, unknown> = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: '相对于项目根目录的文件路径，例如 src/main.ts',
    },
  },
  required: ['path'],
}

const argsSchema = z.object({
  path: z.string().min(1),
})

export const readFileTool = defineTool({
  name: 'read_file',
  description:
    '读取项目内单个文件的完整内容。path 必须是相对于项目根目录的路径，不能访问项目之外的文件。',
  parameters,
  schema: argsSchema,
  async execute({ path: inputPath }) {
    const resolved = resolveInWorkspace(inputPath)
    if (!resolved.ok) {
      return { ok: false, kind: 'permission', error: resolved.error }
    }

    // 先 stat 再读：这样"文件不存在"能给出一句模型看得懂的话，
    // 而不是把 "ENOENT: no such file or directory, open 'D:\\...'" 这种
    // 夹带绝对路径的原始错误丢给模型
    const info = await stat(resolved.absolutePath).catch(() => null)
    if (info === null) {
      return {
        ok: false,
        kind: 'execution',
        error: `文件不存在: ${toPosixPath(inputPath)}`,
      }
    }
    if (info.isDirectory()) {
      return {
        ok: false,
        kind: 'execution',
        error: `${toPosixPath(inputPath)} 是一个目录，请改用 list_files`,
      }
    }
    if (info.size > MAX_FILE_BYTES) {
      return {
        ok: false,
        kind: 'execution',
        error: `文件过大: ${info.size} 字节，超过上限 ${MAX_FILE_BYTES} 字节`,
      }
    }

    try {
      const content = await readFile(resolved.absolutePath, 'utf8')
      return { ok: true, content }
    } catch (error) {
      // 权限不足、文件在 stat 之后被删除等情况都会走到这里，
      // 保留原始原因，否则模型只会看到一句无用的"读取失败"
      const reason = error instanceof Error ? error.message : String(error)
      return {
        ok: false,
        kind: 'execution',
        error: `读取失败: ${reason}`,
      }
    }
  },
})
