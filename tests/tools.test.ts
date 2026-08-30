import { describe, expect, it } from 'vitest'
import { listFilesTool } from '../src/tools/list-files.js'
import { readFileTool } from '../src/tools/read-file.js'
import { findTool } from '../src/tools/index.js'

/**
 * 这些测试不调用 LLM。
 *
 * Tool 的正确性和模型无关：模型只负责"决定调用哪个工具、参数填什么"，
 * 而"参数合不合法、执行结果对不对"完全由本地代码决定。
 * 把这两件事分开测，才能在出问题时区分是模型的问题还是代码的问题。
 *
 * 测试用例直接跑在本仓库上（vitest 的 cwd 就是项目根目录），
 * 不额外造临时目录，保持最小。
 */

describe('read_file', () => {
  it('能读取存在的文件', async () => {
    const result = await readFileTool.run({ path: 'package.json' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.content).toContain('"name": "mini-codex"')
    }
  })

  it('文件不存在时返回 execution 错误，而不是抛异常', async () => {
    const result = await readFileTool.run({ path: 'no-such-file.txt' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('execution')
      expect(result.error).toContain('文件不存在')
    }
  })

  it('传入目录时提示改用 list_files', async () => {
    const result = await readFileTool.run({ path: 'src' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('list_files')
    }
  })

  it('参数类型不合法时返回 validation 错误', async () => {
    const result = await readFileTool.run({ path: 123 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('validation')
    }
  })

  it('缺少必填参数时返回 validation 错误', async () => {
    const result = await readFileTool.run({})

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('validation')
    }
  })

  it('参数不是对象时返回 validation 错误', async () => {
    const result = await readFileTool.run('package.json')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('validation')
    }
  })

  it('拒绝逃逸出项目根目录的相对路径', async () => {
    const result = await readFileTool.run({ path: '../../secret.txt' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('permission')
    }
  })

  it('拒绝绝对路径', async () => {
    // 用一个确定在项目之外的绝对路径。
    // 在 Windows 上跨盘符时 path.relative 会返回绝对路径，
    // 在 POSIX 上则会返回一串 ..，两条判断分支都要能拦住。
    const outsidePath = process.platform === 'win32' ? 'C:\\Windows\\win.ini' : '/etc/passwd'
    const result = await readFileTool.run({ path: outsidePath })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('permission')
    }
  })
})

describe('list_files', () => {
  it('省略 path 时列出项目根目录', async () => {
    const result = await listFilesTool.run({})

    expect(result.ok).toBe(true)
    if (result.ok) {
      const lines = result.content.split('\n')
      expect(lines).toContain('src/')
      expect(lines).toContain('package.json')
    }
  })

  it('目录在前、文件在后，且按名称排序', async () => {
    const result = await listFilesTool.run({ path: 'src' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      const lines = result.content.split('\n')
      const lastDirIndex = lines.findLastIndex((line) => line.endsWith('/'))
      const firstFileIndex = lines.findIndex((line) => !line.endsWith('/'))
      expect(lastDirIndex).toBeLessThan(firstFileIndex)
      expect(lines).toContain('main.ts')
    }
  })

  it('目录不存在时返回 execution 错误', async () => {
    const result = await listFilesTool.run({ path: 'no-such-dir' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('execution')
      expect(result.error).toContain('目录不存在')
    }
  })

  it('传入文件时提示改用 read_file', async () => {
    const result = await listFilesTool.run({ path: 'package.json' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('read_file')
    }
  })

  it('拒绝逃逸出项目根目录的路径', async () => {
    const result = await listFilesTool.run({ path: '..' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('permission')
    }
  })
})

describe('tool registry', () => {
  it('能按名字找到已注册的工具', () => {
    expect(findTool('read_file')?.name).toBe('read_file')
    expect(findTool('list_files')?.name).toBe('list_files')
  })

  it('模型幻觉出的工具名查不到', () => {
    // 这是 main.ts 里第一道防线要拦住的情况
    expect(findTool('write_file')).toBeUndefined()
    expect(findTool('run_command')).toBeUndefined()
  })
})
