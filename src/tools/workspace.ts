import path from 'node:path'

/**
 * Workspace 安全边界。
 *
 * 所有文件类 Tool 的路径参数都来自模型，属于不可信输入。
 * 这个模块负责回答一个问题：这个路径是否允许访问。
 */

/**
 * Workspace 根目录。
 * 用 process.cwd() 而不是硬编码路径，也不是 __dirname——
 * Agent 操作的对象是"用户当前所在的项目"，而不是 Agent 自身的安装位置。
 */
export const WORKSPACE_ROOT = process.cwd()

export type ResolveResult =
  | { ok: true; absolutePath: string }
  | { ok: false; error: string }

/**
 * 把模型给的相对路径解析成 workspace 内的绝对路径，并拒绝任何越界访问。
 *
 * 用 path.relative 判断而不是字符串前缀比较，是因为前缀比较有两个坑：
 * 1. '/work' 会错误地匹配到 '/workspace'
 * 2. Windows 上跨盘符（D: -> C:）无法通过前缀判断
 * path.relative 在跨盘符时会直接返回一个绝对路径，正好覆盖第 2 种情况。
 */
export function resolveInWorkspace(inputPath: string): ResolveResult {
  const absolutePath = path.resolve(WORKSPACE_ROOT, inputPath)
  const relative = path.relative(WORKSPACE_ROOT, absolutePath)

  // relative 为空字符串表示目标就是 root 本身，属于合法情况。
  // 这里不用 startsWith('..')，否则根目录下一个名为 '..foo' 的文件会被误判。
  const escapesRoot = relative === '..' || relative.startsWith(`..${path.sep}`)
  if (escapesRoot || path.isAbsolute(relative)) {
    return {
      ok: false,
      error: `路径超出了项目范围，拒绝访问: ${toPosixPath(inputPath)}`,
    }
  }

  return { ok: true, absolutePath }
}

/**
 * 把系统路径转换成统一使用 / 的逻辑路径。
 *
 * 凡是要交给模型、写进 Trace、或者参与快照测试的路径都必须走这一步，
 * 否则同一个项目在 Windows 和 macOS 上会产生不同的 Context，
 * 排查问题时两台机器的日志无法对齐。
 */
export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
