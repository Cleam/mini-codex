import { readdir, stat } from 'node:fs/promises'
import { z } from 'zod'
import { defineTool } from './types.js'
import { resolveInWorkspace, toPosixPath } from './workspace.js'

// 给模型看的 JSON Schema。path 可选，省略时列出项目根目录。
const parameters: Record<string, unknown> = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: '相对于项目根目录的目录路径，例如 src。省略则列出项目根目录。',
    },
  },
}

const argsSchema = z.object({
  path: z.string().optional(),
})

export const listFilesTool = defineTool({
  name: 'list_files',
  description:
    '列出项目内某个目录下的文件和子目录（不递归）。省略 path 则列出项目根目录。',
  parameters,
  schema: argsSchema,
  async execute({ path: inputPath = '.' }) {
    const resolved = resolveInWorkspace(inputPath)
    if (!resolved.ok) {
      return { ok: false, kind: 'permission', error: resolved.error }
    }

    const info = await stat(resolved.absolutePath).catch(() => null)
    if (info === null) {
      return {
        ok: false,
        kind: 'execution',
        error: `目录不存在: ${toPosixPath(inputPath)}`,
      }
    }
    if (!info.isDirectory()) {
      return {
        ok: false,
        kind: 'execution',
        error: `${toPosixPath(inputPath)} 不是目录，请改用 read_file`,
      }
    }

    const entries = await readdir(resolved.absolutePath, { withFileTypes: true })
    if (entries.length === 0) {
      return { ok: true, content: '(空目录)' }
    }

    // readdir 的返回顺序依赖文件系统，Windows 和 macOS 上并不一致。
    // 这里显式排序，保证同一个目录在任何平台上生成的 Context 完全相同。
    // 不用 localeCompare 是因为它受系统语言环境影响，同样不确定。
    const sorted = [...entries].sort((a, b) => {
      const aIsDir = a.isDirectory()
      const bIsDir = b.isDirectory()
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
      if (a.name === b.name) return 0
      return a.name < b.name ? -1 : 1
    })

    // 目录带尾部 /，让模型不需要猜哪些能继续 list_files
    const lines = sorted.map((entry) =>
      entry.isDirectory() ? `${entry.name}/` : entry.name,
    )

    return { ok: true, content: lines.join('\n') }
  },
})
