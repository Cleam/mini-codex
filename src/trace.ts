import { randomUUID } from 'node:crypto'
import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { toPosixPath } from './tools/workspace.js'

/**
 * 最小 Trace 实现。
 *
 * Agent 的问题往往不在"模型笨"，而在链路上某一环出了偏差：
 * Context 拼错了、参数校验没过、工具返回了空内容。
 * 所以从第一阶段就要能把一次执行完整读一遍。
 *
 * 这里只用 console + JSONL 文件：需要的是"可以直接 cat 出来看"，
 * 不是可观测性平台。引入 OpenTelemetry 之类的东西现在解决不了任何真实问题。
 */

export interface TraceEvent {
  type:
    | 'user_input'
    | 'model_call'
    | 'tool_call'
    | 'final_answer'
    | 'messages_dump'
  /** 该环节耗时。模型调用和工具执行都需要，用来判断慢在哪里 */
  latencyMs?: number
  data?: Record<string, unknown>
}

export interface Tracer {
  taskId: string
  /** Trace 文件的逻辑路径（统一 / 分隔符），用于展示 */
  traceFile: string
  log: (event: TraceEvent) => void
}

const MAX_CONSOLE_DETAIL = 300

export function createTracer(taskId: string = randomUUID()): Tracer {
  const traceDir = path.join(process.cwd(), 'docs', 'traces')
  const traceFilePath = path.join(traceDir, `${taskId}.jsonl`)
  mkdirSync(traceDir, { recursive: true })

  let step = 0

  function log(event: TraceEvent): void {
    step += 1
    const record = {
      taskId,
      step,
      timestamp: new Date().toISOString(),
      ...event,
    }

    // JSONL：一行一个事件，追加写入。
    // 用同步写是刻意的——CLI 场景下顺序确定比吞吐重要，
    // 而且进程异常退出时已写入的事件不会丢。
    appendFileSync(traceFilePath, `${JSON.stringify(record)}\n`, 'utf8')

    console.log(formatForConsole(step, event))
  }

  return {
    taskId,
    traceFile: toPosixPath(path.relative(process.cwd(), traceFilePath)),
    log,
  }
}

/** 控制台只打摘要，完整内容去 JSONL 文件里看 */
function formatForConsole(step: number, event: TraceEvent): string {
  const latency = event.latencyMs === undefined ? '' : ` ${event.latencyMs}ms`
  const detail =
    event.data === undefined ? '' : ` ${truncate(JSON.stringify(event.data))}`
  return `[${step}] ${event.type}${latency}${detail}`
}

function truncate(text: string): string {
  return text.length <= MAX_CONSOLE_DETAIL
    ? text
    : `${text.slice(0, MAX_CONSOLE_DETAIL)}…(共 ${text.length} 字符，完整内容见 trace 文件)`
}
