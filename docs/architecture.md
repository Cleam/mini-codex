# 当前架构：v0.1 Tool Calling

核查日期：2026-10-19。本文描述当前源码，不代表已完成真实模型验收。

## 调用链与职责

```text
CLI 问题 → main.ts 构造 system/user messages
  → client.ts 调用模型并校验响应
  → main.ts 回填 assistant 消息
  → 工具名查找 → JSON 参数解析 → Zod 校验 → 本地工具执行
  → 回填带 tool_call_id 的 tool 消息
  → 再次调用模型 → 输出回答与 messages_dump
```

| 文件 | 当前职责 |
| --- | --- |
| `src/main.ts` | CLI 入口、固定两次模型调用的编排、工具调用解析与结果回填 |
| `src/llm/client.ts` | 加载配置、原生 fetch 请求、响应 Zod 校验、兼容字段标准化 |
| `src/tools/index.ts` | 数组与 Map 构成最小注册表，导出模型可见的工具描述 |
| `src/tools/types.ts` | `ToolResult` 联合类型；`defineTool` 绑定参数校验与执行 |
| `src/tools/list-files.ts` | 非递归列目录，目录优先且稳定排序 |
| `src/tools/read-file.ts` | UTF-8 文本读取，200 KiB 文件大小上限 |
| `src/tools/workspace.ts` | 以启动时 cwd 为根目录，做词法路径边界检查与逻辑路径转换 |
| `src/trace.ts` | taskId、递增 step、时间、耗时及事件写入控制台与 JSONL |

## 数据与状态

状态只是 `main()` 内存中的 `messages` 数组，没有持久化状态或检查点（Checkpoint）。模型返回的工具调用必须先作为 assistant 消息回填，然后为每个调用追加对应的 tool 消息；模型不会自动知道本地工具执行结果。

JSON Schema 给模型描述能力；Zod 在本地验证不可信参数。当前两份 Schema 手工维护，新增字段时必须同步核对。`defineTool` 暴露统一 `run(unknown)`，避免调用方绕过参数校验。

工具结果区分成功与 validation / permission / execution 失败。未知工具和非法 JSON 在入口处理；工具错误作为文本回传模型。没有统一异常捕获层，`readdir` 等未捕获异常仍可能直接结束任务。

## Trace 与限制

Trace 写入 `docs/traces/<taskId>.jsonl`，当前被 Git 忽略。正常路径包含 user_input、model_call、tool_call、final_answer、messages_dump。完整消息通常只在结束时写出；模型请求失败只在顶层控制台报错，没有 error 事件。模型耗时在响应头返回后计算，不含完整响应体解析。

第二次模型响应仍带工具调用时不会执行；即使无最终文本，仍会记录 final_answer 并显示提示。因此出现该事件不等于任务成功。这是固定编排的边界，不应通过偷偷加入循环解决。

安全边界尚不完整：未解析符号链接实际目标；未屏蔽敏感文件；Trace 会保留文件内容。文件大小检查发生在读取前，也没有二进制识别。当前不是可对任意代码库开放的安全沙箱。

本阶段不引入 Provider 抽象、复杂 Registry、自动重试或 UI。下一阶段先收敛工具执行与错误处理，再在 v0.3 引入有最大步数的循环。
