import { z } from 'zod'

/**
 * OpenAI 兼容协议的最小 LLM 客户端。
 *
 * 这里刻意不使用官方 SDK：v0.1 的学习目标就是看清 Tool Calling 在网络层
 * 到底长什么样——messages 数组怎么拼、tool_calls 的原始结构是什么、
 * finish_reason 在什么时候变化。SDK 恰好会把这些全部封装掉。
 *
 * 选择 OpenAI 兼容协议而不是做 Provider 抽象层，是因为"支持多模型"用
 * 配置就能实现（换 LLM_BASE_URL 和 LLM_MODEL），不需要多态。
 */

// ---------------------------------------------------------------------------
// 协议类型
// ---------------------------------------------------------------------------

/** 模型请求调用某个工具时返回的结构 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    /** 注意这是 JSON 字符串而不是对象，且不保证是合法 JSON，使用前必须解析并校验 */
    arguments: string
  }
}

export interface AssistantMessage {
  role: 'assistant'
  /** 模型决定调用工具时，content 通常为 null */
  content: string | null
  tool_calls?: ToolCall[]
}

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | AssistantMessage
  /**
   * 工具执行结果。tool_call_id 必须与模型给出的 ToolCall.id 严格对应，
   * 配不上的话请求会被直接拒绝——这是协议的硬性要求。
   */
  | { role: 'tool'; tool_call_id: string; content: string }

/**
 * 随请求发给模型的工具描述。
 * description 不是给人看的文档，它是 Prompt 的一部分：
 * 模型选不选这个工具、参数怎么填，几乎完全取决于它。
 */
export interface ToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    /** JSON Schema */
    parameters: Record<string, unknown>
  }
}

export interface ModelResponse {
  message: AssistantMessage
  /** 'tool_calls' 表示模型要求调用工具，'stop' 表示这是最终回答 */
  finishReason: string | null
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  latencyMs: number
}

// ---------------------------------------------------------------------------
// 响应校验
// ---------------------------------------------------------------------------

/**
 * 模型响应同样属于外部输入。各家的"OpenAI 兼容"实现存在细微差异，
 * 先校验形状，才能把"供应商返回了意料之外的结构"和"我的代码写错了"区分开。
 */
const toolCallSchema = z.object({
  id: z.string(),
  // 个别兼容实现会省略 type 字段，这里放宽而不是直接判定失败
  type: z.literal('function').optional(),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
})

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          role: z.literal('assistant'),
          content: z.string().nullable().optional(),
          tool_calls: z.array(toolCallSchema).optional(),
        }),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
})

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

let envLoaded = false

/**
 * 读取 .env。
 * Node 20.12+ 内置了 process.loadEnvFile，因此不需要引入 dotenv 依赖。
 */
function loadEnvOnce(): void {
  if (envLoaded) return
  envLoaded = true
  try {
    process.loadEnvFile()
  } catch {
    // .env 不存在是正常情况（例如直接用系统环境变量），
    // 真正缺配置会在下面 requireEnv 里报出明确错误
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`缺少环境变量 ${name}。请参考 .env.example 创建 .env 文件`)
  }
  return value.trim()
}

interface LlmConfig {
  apiKey: string
  baseUrl: string
  model: string
}

function loadConfig(): LlmConfig {
  loadEnvOnce()
  return {
    apiKey: requireEnv('LLM_API_KEY'),
    // 去掉结尾斜杠，避免拼出 //chat/completions 这种路径
    baseUrl: requireEnv('LLM_BASE_URL').replace(/\/+$/, ''),
    model: requireEnv('LLM_MODEL'),
  }
}

// ---------------------------------------------------------------------------
// 模型调用
// ---------------------------------------------------------------------------

/**
 * 调用模型一次。
 *
 * 注意这个函数只做一件事：把 messages 发出去、把响应解析回来。
 * 它不管工具怎么执行、不管要不要再调一轮——那是 main.ts 的编排职责。
 */
export async function callModel(
  messages: ChatMessage[],
  tools: ToolSchema[],
): Promise<ModelResponse> {
  const config = loadConfig()
  const startedAt = performance.now()

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools,
      // auto：由模型自行决定是否调用工具。
      // v0.1 需要观察"模型主动选择工具"这件事，所以不用 required 强制它调用。
      tool_choice: 'auto',
    }),
  })

  const latencyMs = Math.round(performance.now() - startedAt)

  if (!response.ok) {
    const body = await response.text()
    // 保留状态码和响应体：模型名写错、额度不足、参数不被兼容端点支持，
    // 这些原因几乎全藏在 body 里，吞掉它排查就无从下手了
    throw new Error(`模型请求失败 HTTP ${response.status}: ${body.slice(0, 500)}`)
  }

  const parsed = responseSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new Error(`模型响应结构不符合预期: ${formatIssues(parsed.error)}`)
  }

  const choice = parsed.data.choices[0]
  if (choice === undefined) {
    throw new Error('模型响应中没有任何 choice')
  }

  const message: AssistantMessage = {
    role: 'assistant',
    content: choice.message.content ?? null,
  }

  const toolCalls = (choice.message.tool_calls ?? []).map((call) => ({
    id: call.id,
    type: 'function' as const,
    function: {
      name: call.function.name,
      arguments: call.function.arguments,
    },
  }))
  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls
  }

  const result: ModelResponse = {
    message,
    finishReason: choice.finish_reason ?? null,
    latencyMs,
  }

  if (parsed.data.usage !== undefined) {
    result.usage = {
      promptTokens: parsed.data.usage.prompt_tokens,
      completionTokens: parsed.data.usage.completion_tokens,
      totalTokens: parsed.data.usage.total_tokens,
    }
  }

  return result
}
