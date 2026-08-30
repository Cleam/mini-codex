import type { ZodType } from 'zod'

/**
 * Tool 执行结果。
 *
 * 关键设计：工具失败不抛异常，而是作为一种正常返回值。
 * 因为工具错误（文件不存在、参数不合法、路径越权）是"模型的输入"，
 * 不是"程序的异常"——模型需要看到错误信息才能决定下一步怎么做。
 * 如果这里写成 throw，到 v0.3 Agent Loop 时整个编排都要推倒重来。
 *
 * kind 用来区分错误发生在哪一环，Trace 里能直接定位问题：
 * - validation：模型给的参数不符合 Schema
 * - permission：参数合法，但触碰了安全边界（例如路径逃逸出 workspace）
 * - execution：参数和权限都没问题，是执行时失败（文件不存在、读取失败）
 */
export type ToolResult =
  | { ok: true; content: string }
  | { ok: false; kind: 'validation' | 'permission' | 'execution'; error: string }

export interface Tool {
  name: string
  description: string
  /** JSON Schema，随请求发给模型，模型据此生成参数 */
  parameters: Record<string, unknown>
  /** 接收模型生成的原始参数（尚未校验），内部完成校验后才真正执行 */
  run: (rawArgs: unknown) => Promise<ToolResult>
}

/**
 * 定义一个 Tool。
 *
 * 这是本阶段唯一引入的抽象，理由不是"减少重复"，而是收敛一条安全不变量：
 * 校验和执行被绑定在一起，execute 在结构上就不可能拿到未经 Schema 校验的参数。
 * 如果让每个 Tool 自己写 safeParse，将来漏写一个就是一个真实的安全缺口。
 *
 * 同时它解决一个类型问题：每个 Tool 的参数类型不同，但注册表需要用统一类型
 * 存放它们。unknown -> TArgs 的转换收敛在这里一处完成，外部只看到 Tool。
 */
export function defineTool<TArgs>(spec: {
  name: string
  description: string
  parameters: Record<string, unknown>
  /** 运行时校验用的 Schema，与发给模型的 JSON Schema 用途不同 */
  schema: ZodType<TArgs>
  execute: (args: TArgs) => Promise<ToolResult>
}): Tool {
  return {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    async run(rawArgs: unknown): Promise<ToolResult> {
      // 参数由模型生成，等同于不可信的用户输入，执行前必须校验
      const parsed = spec.schema.safeParse(rawArgs)
      if (!parsed.success) {
        const detail = parsed.error.issues
          .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; ')
        return {
          ok: false,
          kind: 'validation',
          error: `参数校验失败: ${detail}`,
        }
      }
      return spec.execute(parsed.data)
    },
  }
}
