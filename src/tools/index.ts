import type { ToolSchema } from '../llm/client.js'
import { listFilesTool } from './list-files.js'
import { readFileTool } from './read-file.js'
import type { Tool } from './types.js'

/**
 * v0.1 只有两个 Tool，所以"注册表"就是一个数组加一个 Map。
 *
 * 这里刻意不做 Registry 类、不做插件机制、不做动态发现：
 * 那些能力要等到 Tool 数量和生命周期需求真正出现时（v0.2 Tool Runtime）再说。
 */
export const tools: Tool[] = [listFilesTool, readFileTool]

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]))

/**
 * 按名字查找 Tool。
 *
 * 工具名是模型生成的，模型完全可能幻觉出一个不存在的名字，
 * 所以执行前必须在这里查一次，不能直接信任模型返回的 name。
 */
export function findTool(name: string): Tool | undefined {
  return toolsByName.get(name)
}

/** 转换成随请求发给模型的格式 */
export function toToolSchemas(): ToolSchema[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}
