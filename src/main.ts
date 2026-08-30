import { callModel } from './llm/client.js'
import type { ChatMessage, ModelResponse, ToolCall } from './llm/client.js'
import { findTool, toToolSchemas } from './tools/index.js'
import type { ToolResult } from './tools/types.js'
import { createTracer } from './trace.js'
import type { Tracer } from './trace.js'

/**
 * Mini Codex v0.1 —— 最小 Tool Calling 链路。
 *
 *   user input
 *     ↓
 *   callModel        第一次：模型看到工具列表，自己决定要不要用
 *     ↓
 *   tool_calls       模型返回调用意图（注意：模型本身不执行任何东西）
 *     ↓
 *   validate         工具名 + 参数都由模型生成，全部当作不可信输入校验
 *     ↓
 *   execute          真正的执行发生在这个进程里
 *     ↓
 *   tool_result      结果写回 messages —— API 无状态，不回传等于没发生
 *     ↓
 *   callModel        第二次：带着工具结果产出 Final Answer
 *
 * 本阶段刻意只做"一轮半"，不做 Agent Loop（那是 v0.3）。
 * 编排逻辑集中放在这个文件里，先看清整条链路，之后再谈拆分。
 */

const SYSTEM_PROMPT = `你是一个 coding agent，正在协助用户理解当前这个项目的代码。
你可以使用 list_files 和 read_file 查看项目内的文件。
所有路径都相对于项目根目录，不要尝试访问项目之外的文件。
拿到工具结果后，用简洁的中文直接回答用户的问题，不要复述工具的原始输出。`

const DEFAULT_QUESTION = '这个项目的 package.json 里定义了哪些 npm scripts？'

async function main(): Promise<void> {
  const question = process.argv.slice(2).join(' ').trim() || DEFAULT_QUESTION
  const tracer = createTracer()
  const toolSchemas = toToolSchemas()

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ]
  tracer.log({ type: 'user_input', data: { question } })

  // ---- 第一次模型调用 ----
  const first = await callModel(messages, toolSchemas)
  logModelCall(tracer, first)

  // 模型返回的 assistant 消息必须原样回填进历史。
  // 少了它，后面的 tool 消息会找不到对应的 tool_call，请求直接被 API 拒绝。
  messages.push(first.message)

  const toolCalls = first.message.tool_calls ?? []

  if (toolCalls.length === 0) {
    // 模型判断不需要工具，一轮就结束
    finish(tracer, messages, first.message.content)
    return
  }

  // ---- 执行工具 ----
  // 模型可能在一次响应里请求多个工具调用，必须逐个执行、逐个回填结果，
  // 且每条结果都要带上对应的 tool_call_id
  for (const call of toolCalls) {
    const content = await runToolCall(tracer, call)
    messages.push({ role: 'tool', tool_call_id: call.id, content })
  }

  // ---- 第二次模型调用 ----
  // 之所以必须再调一次：LLM API 是无状态的，模型看不到我们本地执行了什么，
  // 只有把工具结果放进 messages 重新发过去，它才"知道"结果是什么。
  const second = await callModel(messages, toolSchemas)
  logModelCall(tracer, second)
  messages.push(second.message)

  if ((second.message.tool_calls ?? []).length > 0) {
    // v0.1 刻意只支持单轮工具调用。这里明确提示而不是静默丢弃，
    // 因为"模型还想继续调用工具"正是 v0.3 Agent Loop 要解决的问题。
    console.log(
      '\n注意：模型请求了新一轮工具调用，但 v0.1 只支持单轮，已在此停止。',
    )
  }

  finish(tracer, messages, second.message.content)
}

/**
 * 执行一次工具调用，返回要回填给模型的文本。
 *
 * 注意返回值永远是字符串：无论成功还是失败，模型都需要看到结果。
 */
async function runToolCall(tracer: Tracer, call: ToolCall): Promise<string> {
  const startedAt = performance.now()
  const result = await executeToolCall(call)
  const latencyMs = Math.round(performance.now() - startedAt)

  tracer.log({
    type: 'tool_call',
    latencyMs,
    data: {
      name: call.function.name,
      // 记录模型生成的原始参数字符串，而不是解析后的对象：
      // 参数解析失败本身就是需要排查的问题之一
      arguments: call.function.arguments,
      ok: result.ok,
      ...(result.ok ? { result: result.content } : { kind: result.kind, error: result.error }),
    },
  })

  return result.ok ? result.content : `工具执行失败: ${result.error}`
}

async function executeToolCall(call: ToolCall): Promise<ToolResult> {
  // ① 工具名由模型生成，可能是幻觉出来的名字
  const tool = findTool(call.function.name)
  if (tool === undefined) {
    return {
      ok: false,
      kind: 'validation',
      error: `工具不存在: ${call.function.name}`,
    }
  }

  // ② arguments 是模型生成的 JSON 字符串，不保证能解析
  let rawArgs: unknown
  try {
    // 无参调用时部分供应商会返回空字符串而不是 "{}"，这里做兼容
    const text = call.function.arguments.trim()
    rawArgs = text === '' ? {} : JSON.parse(text)
  } catch {
    return {
      ok: false,
      kind: 'validation',
      error: `参数不是合法 JSON: ${call.function.arguments}`,
    }
  }

  // ③ run 内部先做 Schema 校验，通过后才真正执行
  return tool.run(rawArgs)
}

function logModelCall(tracer: Tracer, response: ModelResponse): void {
  tracer.log({
    type: 'model_call',
    latencyMs: response.latencyMs,
    data: {
      finishReason: response.finishReason,
      toolCalls: (response.message.tool_calls ?? []).map((call) => ({
        name: call.function.name,
        arguments: call.function.arguments,
      })),
      contentPreview: response.message.content,
      usage: response.usage,
    },
  })
}

function finish(
  tracer: Tracer,
  messages: ChatMessage[],
  answer: string | null,
): void {
  tracer.log({ type: 'final_answer', data: { answer } })

  // 把完整的 messages 数组落进 Trace。
  // 这是本阶段最值得看的东西：Tool Calling 的全部机制都体现在
  // 这个数组是怎么一层层长出来的（user -> assistant(tool_calls) -> tool -> assistant）。
  tracer.log({ type: 'messages_dump', data: { messages } })

  console.log(`\n=== Final Answer ===\n${answer ?? '(模型没有返回文本内容)'}`)
  console.log(`\nTrace: ${tracer.traceFile}`)
}

main().catch((error: unknown) => {
  console.error('\n执行失败:')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
