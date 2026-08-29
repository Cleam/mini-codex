# AGENTS.md

## 1. 项目定位

这是一个用于系统学习 Agent Engineering（智能体工程）的长期实践项目。

项目目标不是快速做出一个功能完整的 AI Coding 产品，而是通过逐步实现一个简化版 Mini Codex，理解并掌握 Agent 系统的核心机制，包括：

- LLM API
- Structured Output
- Tool Calling
- Tool Registry
- Tool Runtime
- Agent Loop
- State
- Checkpoint
- Context Engineering
- Memory
- RAG
- MCP
- Skill
- Multi-Agent
- Agent Eval
- Trace / Replay
- Production Engineering

本项目强调：

> 先理解原理，再逐步工程化；先跑通最小版本，再抽象和扩展。

---

## 2. 当前项目原则

AI 在参与本项目开发时，必须优先遵循以下原则。

### 2.1 学习价值优先

本项目首先是学习项目，其次才是功能项目。

任何实现都应该优先保证：

- 核心机制容易理解
- 调用链清晰
- 代码容易阅读
- 设计原因可以解释
- 便于后续手动修改和实验

不要为了“架构先进”牺牲可理解性。

---

### 2.2 小步演进

严格按照 `docs/roadmap.md` 当前阶段推进。

不要主动实现后续阶段功能。

例如当前阶段如果是 Tool Calling，则不要主动加入：

- Agent Loop
- Memory
- RAG
- MCP
- Multi-Agent
- Database
- Web UI
- Distributed Queue
- Complex Observability

除非用户明确要求。

---

### 2.3 不要过度设计

优先使用当前问题所需的最小实现。

避免提前引入：

- 复杂继承体系
- 多层抽象
- Event Bus
- Plugin Framework
- Dependency Injection Container
- Repository Pattern
- CQRS
- Microservices
- 复杂配置系统
- 不必要的设计模式

如果只有一个实现，不要为了“未来可能扩展”提前抽象多个层级。

原则：

> 第一次先实现，第二次出现重复时再考虑抽象。

---

## 3. 技术栈原则

默认技术栈：

- Node.js
- TypeScript
- 原生或轻量 LLM SDK
- Zod
- Vitest
- ESLint
- Prettier

当前阶段不主动引入大型 Agent Framework。

除非用户明确要求，否则不要主动加入：

- LangChain
- LangGraph
- LlamaIndex
- AutoGen
- CrewAI
- Dify SDK
- DeerFlow

本项目需要优先手动实现这些框架隐藏的核心机制。

---

## 4. 跨平台开发约束（Cross-platform Development）

本项目需要同时兼容 Windows 和 macOS。编写代码、脚本、配置与 Tool 时，不得默认某一种操作系统、Shell 或文件系统行为。

### 4.1 路径处理

文件系统路径必须使用 Node.js 标准库处理：

- 使用 `path.join()` 拼接路径
- 使用 `path.resolve()` 生成绝对路径
- 使用 `path.relative()` 计算相对路径
- 使用 `path.normalize()` 规范化路径

不要手动拼接 `/` 或 `\`，也不要假设路径分隔符固定。

```typescript
import path from 'node:path'

const filePath = path.join(root, 'src', 'index.ts')
```

路径比较前应先规范化；涉及安全边界时，还必须验证解析后的路径没有逃逸 Workspace Root。

---

### 4.2 系统路径与逻辑路径分离

内部文件系统操作使用当前操作系统的真实路径格式。以下场景中的路径应转换为统一使用 `/` 的逻辑路径：

- Trace 与日志
- 提供给 LLM 的 Context
- Tool Result
- 跨平台快照测试
- 稳定资源标识

```typescript
function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
```

不要把仅用于展示或传输的逻辑路径直接当作系统路径使用。

---

### 4.3 文件操作与 Shell

Node.js API 能完成的任务，优先使用 `node:fs`、`node:path` 和 `node:os`，不要依赖 `cp`、`rm`、`find`、`sed`、`grep` 等平台命令。

如果必须执行 Shell 命令：

- 明确支持的操作系统和 Shell
- 不默认存在 Bash、zsh、PowerShell 或 cmd
- 不把 Bash 命令直接交给 Windows 执行
- 必要时分别提供 Windows 与 macOS 实现

---

### 4.4 npm Scripts 与环境变量

`package.json` 中的 Scripts 必须尽量跨平台。避免：

```json
{
  "scripts": {
    "clean": "rm -rf dist",
    "dev": "NODE_ENV=development node src/index.js"
  }
}
```

简单任务优先编写 Node.js 脚本；只有确有必要时才引入轻量跨平台依赖。

环境配置优先通过 `.env` 或 Node.js 读取 `process.env`。敏感配置不得提交，仓库只保留不含真实凭据的 `.env.example`。

---

### 4.5 换行符、大小写与文件名

- 文本文件统一使用 LF，仓库应通过 `.gitattributes` 配置 `* text=auto eol=lf`
- 文件名、目录名和 Import 路径的大小写必须完全一致
- 项目文件名优先使用 `kebab-case`
- 文件名避免空格及 `: * ? " < > | \` 等跨平台不安全字符

不要依赖 Windows 默认大小写不敏感的文件系统行为。

---

### 4.6 临时目录、用户目录与操作系统识别

不要硬编码 `C:\Users\...`、`/Users/...` 或 `/tmp`。

- 临时目录使用 `os.tmpdir()`
- 用户目录使用 `os.homedir()`
- 项目目录基于 `process.cwd()` 或显式配置的 Workspace Root
- 操作系统判断使用 `process.platform`，不要通过路径或环境变量猜测

---

### 4.7 Tool 的跨平台要求

涉及文件系统或命令执行的 Tool，例如 `list_files`、`read_file`、`write_file`、`search_code` 和 `run_command`，不得把某个平台的路径或 Shell 规则作为核心业务逻辑。

后续实现 `run_command` 时，必须明确：

- 当前操作系统与 Shell 类型
- 命令支持的平台
- 是否允许执行平台相关命令
- 路径如何转换与校验

---

### 4.8 跨平台验证

新增以下能力时，应至少考虑 Windows 和 macOS：

- 路径处理与文件读写
- Shell / Command Tool
- npm Scripts
- Git 操作
- 临时目录
- Workspace Root

如果当前只能在一个平台验证，必须明确记录已验证的平台和尚未验证的平台。不要将“基于 Node.js”视为已经天然跨平台。

---

## 5. 代码设计原则

### 5.1 可读性优先

代码优先级：

1. 可读性
2. 可维护性
3. 正确性
4. 类型安全
5. 扩展性
6. 性能优化

不要为了减少代码行数写晦涩代码。

避免：

- 复杂一行表达式
- 深层嵌套
- 魔法字符串
- 隐式副作用
- 难以理解的高阶抽象

---

### 5.2 函数职责清晰

一个函数尽量只负责一个明确职责。

例如：

- `buildContext()`
- `executeTool()`
- `validateToolArguments()`
- `callModel()`

不要把模型调用、工具执行、日志记录、状态更新全部塞在一个函数中。

---

### 5.3 类型安全

TypeScript 中：

- 优先使用明确类型
- 避免 `any`
- 外部输入必须进行 Runtime Validation（运行时校验）
- Tool 参数必须通过 Schema 校验
- 不信任 LLM 输出

如确实需要 `any`，需要说明原因，并限制作用范围。

---

### 5.4 错误处理

不要吞掉错误。

错误应该：

- 明确类型
- 保留错误原因
- 提供上下文
- 可以被 Trace 记录

例如需要区分：

- Model Error
- Tool Not Found
- Tool Validation Error
- Tool Execution Error
- Timeout
- Permission Error

---

## 6. 注释规范

本项目要求适量且有价值的代码注释。

必须对以下内容增加解释性注释：

- Agent 核心循环
- Tool Calling 协议转换
- Context 构建逻辑
- State 更新逻辑
- Checkpoint 机制
- Retry / Timeout
- 非直观设计决策
- 安全边界
- 特殊兼容逻辑

注释重点解释：

> 为什么这样做。

不要大量注释显而易见的代码。

例如不推荐：

```typescript
// 设置名称
const name = tool.name
```

推荐：

```typescript
// Tool 名称由模型返回，因此执行前必须通过 Registry 再次校验，
// 不能直接信任模型生成的 tool name。
const tool = registry.get(toolCall.name)
```

---

## 7. AI 协作要求

AI 可以帮助实现代码，但不能只输出最终代码。

对于核心模块，完成后需要说明：

### 7.1 设计说明

简要说明：

- 模块职责
- 为什么这样设计
- 调用链是什么

### 7.2 当前限制

明确指出：

- 当前实现缺少什么
- 哪些能力属于后续阶段
- 哪些地方暂时是简化实现

### 7.3 关键知识点

指出本次实现涉及的 Agent Engineering 核心概念。

例如：

- Tool Schema
- Tool Result
- Agent State
- Context
- Agent Loop

---

## 8. 不允许 AI 主动做的事情

除非用户明确要求，否则不要：

- 一次性实现完整 Agent Platform
- 主动加入 RAG
- 主动加入 Vector Database
- 主动加入 MCP
- 主动加入 Multi-Agent
- 主动加入 Web UI
- 主动加入数据库
- 主动加入 Redis
- 主动加入 Docker
- 主动加入 Kubernetes
- 主动加入复杂 Observability 平台
- 主动加入 LangChain / LangGraph
- 主动做生产级架构扩展
- 主动重构与当前任务无关的代码

---

## 9. 修改代码前的要求

在修改代码前：

1. 先阅读相关代码
2. 理解调用链
3. 确认当前 Roadmap 阶段
4. 确认任务是否超出当前阶段
5. 尽量保持现有目录和风格

不要在未理解代码前进行大规模重构。

---

## 10. 新增依赖规则

新增依赖前，需要说明：

- 解决什么问题
- 为什么现有能力不能解决
- 是否存在更轻量的方案
- 是否增加学习复杂度
- 是否属于当前阶段必要依赖

如果只是为了少写几十行代码，不一定值得引入依赖。

---

## 11. Tool 设计规范

每个 Tool 应尽量包含：

- `name`
- `description`
- `inputSchema`
- `execute()`

后续阶段可以逐步增加：

- permission
- riskLevel
- timeout
- retry
- version

不要在早期阶段一次性实现全部企业级能力。

---

## 12. Tool 安全原则

LLM 输出一律视为不可信输入。

Tool 执行前必须考虑：

- Tool 是否存在
- 参数是否满足 Schema
- 路径是否允许访问
- 是否存在越权操作
- 是否存在危险命令
- 是否需要 Timeout

尤其对：

- File Write
- Shell
- Git
- Network
- Database

必须谨慎处理。

---

## 13. Agent Loop 设计原则

实现 Agent Loop 时至少要明确：

- Continue Condition
- Finish Condition
- Max Steps
- Tool Call Handling
- Tool Result Feedback
- Error Handling

必须避免无限循环。

任何循环都必须存在最大步数或明确终止机制。

---

## 14. Context Engineering 原则

不要简单把全部历史内容一直追加给模型。

后续阶段需要逐步考虑：

- Context Budget
- Context Priority
- Context Compression
- Tool Result Compression
- Long File Summary
- Task Summary

但不要在早期阶段提前实现复杂 Context Manager。

---

## 15. Trace First

Agent 的执行过程应尽量可观察。

从第一阶段开始，优先记录：

- Task ID
- Step
- Model Call
- Tool Call
- Tool Arguments
- Tool Result
- Error
- Latency

早期可以只使用：

- Console Log
- JSON Trace 文件

不要为了可观测性提前引入大型平台。

---

## 16. 调试原则

遇到问题时优先定位具体环节：

```text
User Input
  ↓
Context
  ↓
Model
  ↓
Tool Selection
  ↓
Tool Arguments
  ↓
Validation
  ↓
Tool Execution
  ↓
Tool Result
  ↓
Model
  ↓
Final Answer
```

不要把所有 Agent 问题都归因于 Prompt。

---

## 17. 测试要求

核心逻辑需要测试。

优先测试：

- 正常路径
- 非法输入
- 不存在资源
- Tool 执行失败
- 边界情况

早期阶段无需追求极高覆盖率。

测试重点：

> 保证核心机制的行为可预测。

---

## 18. 学习记录要求

每完成一个阶段，应建议用户更新：

```text
docs/learning/
```

至少记录：

- 本阶段学习目标
- 实现了什么
- 核心原理
- 遇到的问题
- 错误认知
- 最终理解
- 当前限制
- 下一阶段目标

---

## 19. Architecture Decision Record

对于重要设计决策，建议记录到：

```text
docs/decisions/
```

例如：

```text
001-why-typescript.md
002-why-use-zod.md
003-why-not-use-langgraph-yet.md
004-why-agent-loop-needs-max-steps.md
```

ADR 内容建议包括：

- Context
- Decision
- Reasons
- Trade-offs

---

## 20. Git 阶段管理

项目采用：

- `main` 作为持续演进主分支
- Feature Branch 用于开发
- 完成后合并 `main`
- 每个学习里程碑使用 Git Tag

推荐 Tag：

```text
v0.1.0-tool-calling
v0.2.0-tool-runtime
v0.3.0-agent-loop
v0.4.0-codebase-agent
v0.5.0-context-memory
v0.6.0-rag
v0.7.0-eval
v1.0.0
```

---

## 21. 当前阶段 Definition of Done

每个阶段开始开发前，应明确完成标准。

DoD 至少包括：

### 功能

功能是否按预期工作。

### 调试

是否可以观察关键执行链路。

### 测试

是否覆盖关键路径。

### 理解

用户是否能够解释核心机制。

### 文档

是否留下学习记录。

### Git

是否完成阶段 Tag。

---

## 22. 第一阶段特殊规则：Tool Calling

如果当前阶段为：

> v0.1 Tool Calling

当前只重点实现：

- LLM 调用
- `list_files`
- `read_file`
- Tool Schema
- Tool Call Parsing
- Tool Execution
- Tool Result 回传
- Final Answer
- Basic Trace

暂时不要实现：

- 通用复杂 Tool Runtime
- Agent Loop
- Memory
- RAG
- MCP
- Multi-Agent
- UI
- Database
- Persistent Checkpoint

---

## 23. AI 输出风格

默认使用简体中文。

专业术语采用中文 + English，例如：

- 工具调用（Tool Calling）
- 工具运行时（Tool Runtime）
- 智能体循环（Agent Loop）
- 上下文工程（Context Engineering）
- 检索增强生成（RAG）

回答顺序优先：

1. 结论
2. 实现方案
3. 设计原因
4. 风险和限制
5. 下一步

---

## 24. 最终原则

本项目不追求：

> 最快写出最多代码。

而追求：

> 每新增一层能力，都真正理解它解决了什么问题。

如果某项技术不能明确说明：

- 为什么需要
- 当前解决什么问题
- 不使用会怎样

则暂时不要引入。

始终遵循：

> 小步快跑 → 跑通 → 理解 → 复盘 → 抽象 → 再自动化。
