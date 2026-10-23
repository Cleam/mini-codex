
# Mini Codex Roadmap

## 1. 项目目标

Mini Codex 是一个用于系统学习 Agent Engineering（智能体工程）的长期实践项目。

项目目标不是尽快做出一个功能齐全的 AI Coding 工具，而是通过逐步实现一个简化版 Coding Agent，系统理解并掌握：

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

最终目标：

> 从“会使用 Codex / Claude Code”升级为“理解并能够设计 Agent Runtime、Tool Runtime、Context、Memory、RAG、Eval 与生产工程体系”。

---

# 2. 学习原则

整个项目遵循以下原则：

1. 小步快跑
2. 先跑通，再抽象
3. 先理解，再引入框架
4. 核心机制尽量自己实现
5. AI 可以辅助编码，但不能替代理解
6. 不提前引入后续阶段能力
7. 每个阶段都必须有可运行成果
8. 每个阶段都必须留下学习记录
9. 每个阶段都必须有明确 Definition of Done
10. 每个阶段完成后打 Git Tag

---

# 3. 总体阶段

项目计划分为以下阶段：

```text
v0.1 Tool Calling
    ↓
v0.2 Tool Runtime
    ↓
v0.3 Agent Loop
    ↓
v0.4 Codebase Agent
    ↓
v0.5 Context Engineering & Memory
    ↓
v0.6 Codebase RAG
    ↓
v0.7 Agent Eval
    ↓
v0.8 MCP & Skill
    ↓
v0.9 Subagent / Multi-Agent
    ↓
v1.0 Production Ready Agent Platform
```

---

# 4. v0.1 Tool Calling

## 目标

先跑通最小工具调用链路：

```
User
 ↓
LLM
 ↓
Tool Call
 ↓
Tool Execute
 ↓
Tool Result
 ↓
LLM
 ↓
Final Answer
```

这一阶段重点理解：

- Tool Calling 是什么
- Tool Schema 是什么
- LLM 如何选择 Tool
- Tool 参数是谁生成的
- Tool 是谁真正执行的
- Tool Result 为什么需要重新交给模型

---

## 功能范围

实现：

- LLM 调用
- Tool Definition
- Tool Schema
- Tool Call Parsing
- Tool Execution
- Tool Result 回传
- Final Answer
- 基础 Trace

第一版只实现两个 Tool：

```
list_files
read_file
```

---

## 暂不实现

本阶段不要加入：

- Agent Loop
- Tool Registry 复杂抽象
- Permission
- Retry Framework
- Memory
- RAG
- MCP
- Multi-Agent
- Web UI
- Database
- Redis
- Docker
- LangChain
- LangGraph

---

## 推荐目录

```
src/
├── llm/
│   └── client.ts
├── tools/
│   ├── list-files.ts
│   └── read-file.ts
├── trace/
│   └── logger.ts
└── main.ts
```

---

## 重点学习

- OpenAI / Anthropic Tool Calling
- JSON Schema
- Zod Validation
- Tool Result Message
- Structured Output
- Model Stop Reason / Finish Reason

---

## 调试要求

至少能看到：

- User Input
- Model Output
- Tool Name
- Tool Arguments
- Tool Result
- Final Answer
- Latency

---

## Definition of Done

### 功能

- LLM 能主动调用 `list_files`
- LLM 能主动调用 `read_file`
- Tool 参数经过 Schema 校验
- Tool Result 能回传模型
- 模型可以给出 Final Answer

### 测试

至少覆盖：

- 正常读取文件
- 文件不存在
- 非法参数

### 理解

能够回答：

1. Tool Schema 给谁使用？
2. Tool 真正在哪里执行？
3. 为什么不能直接信任模型返回参数？
4. Tool Result 为什么还要回传给模型？
5. Tool Calling 和 Structured Output 的区别是什么？

### 文档

完成：

```
docs/learning/01-tool-calling.md
```

### Git

```
git tag v0.1.0-tool-calling
```

---

# 5. v0.2 Tool Runtime
状态：待开始

### 目标
建立统一 Tool Registry / Validation / Execution Runtime。

### 预计内容
- Tool Registry
- Schema Validation
- Error Handling
- Timeout
- Retry

> 具体设计在进入该阶段前补充。

---

# 6. v0.3 Agent Loop
状态：待开始

### 目标
实现多轮 Tool Calling 与 Agent Loop。

### 预计内容
- Agent Loop
- Max Steps
- State
- Finish Condition

> 具体设计在进入该阶段前补充。

# 7. v0.4 Codebase Agent
# 8. v0.5 Context / Memory
# 9. v0.6 RAG
# 10. v0.7 Eval
...


## 当前进度核查（2026-10-19）

结论：**v0.1 核心实现已具备，阶段尚未完成验收**。这里的状态优先于上文的目标清单；后续阶段仍为待开始。

| 完成标准 | 当前证据与判断 |
| --- | --- |
| LLM 调用与响应解析 | `src/llm/client.ts` 已实现；本次未调用真实服务 |
| list_files / read_file | 工具已实现，macOS 本地 15 项测试通过；模型主动选用两个工具仍待复验 |
| 参数校验与结果回传 | `defineTool` + `main.ts` 已实现；完整协议链缺少自动化测试 |
| Final Answer | 固定第二次请求产出；继续请求工具或无文本时仅提示停止 |
| Basic Trace | 正常路径有 taskId/step/耗时/消息；请求异常没有 error 事件 |
| 学习记录与架构 | 本次由空文件补齐；个人理解与真实验收仍需本人确认 |
| Git 里程碑 | 当前本地无 Tag；main 未包含功能提交，远端最新状态未查询 |

### v0.1 收尾顺序与验收门槛

1. `src/tools/workspace.ts`、文件工具与 `tests/tools.test.ts`：先确定真实路径边界和敏感文件拒绝策略，再补符号链接越界/敏感路径用例。当前仅有词法检查，不能作为安全沙箱。此项涉及权限策略，实施前需明确确认范围。
2. `src/main.ts`、`src/trace.ts`：让模型/工具异常留下有阶段上下文的错误 Trace，区分停止与有效最终回答；不要加入循环。仅做必要拆分以便离线测试。
3. 为 `src/llm/client.ts` 与编排补离线模拟测试：正常响应、异常响应、非法参数 JSON、未知工具、tool_call_id 回填、第二次仍请求工具与空文本。模拟服务不产生真实 API 费用。
4. 人工确认后运行 README 中两个真实模型场景，保存脱敏验收摘要（日期、模型标识、工具、结果、Trace 关联）；原始 Trace 不直接提交。Windows 单独验证并记录，不能以 macOS 结果代替。
5. 本人复述 v0.1 五个核心问题；同步 learning / Review；验收通过后再合并 main 并创建 `v0.1.0-tool-calling`。本次不执行 Git 发布操作。

### 后续规划：按成果推进，不按日历赶阶段

| 阶段 | 最小闭环与进入下一阶段的门槛 |
| --- | --- |
| v0.2 Tool Runtime | 复用当前 Tool / ToolResult / Map；从 main 收敛统一执行入口，覆盖未知工具、校验失败、执行异常与超时。先不用插件框架；重试仅对明确可重试且幂等的失败考虑，超时不等于底层操作已取消 |
| v0.3 Agent Loop | 在稳定执行入口外增加继续/结束判断、maxSteps 和逐轮 Trace；测试直接回答、多轮成功、工具失败、步数耗尽。仍先用 CLI |
| v0.4 Codebase Agent | 先增加只读 search_code，用小仓库问题验证查找→读取→解释。git_diff / run_test 分开评估，命令执行另定平台与权限边界 |
| v0.5 Context & Memory | 先测上下文膨胀，再实现预算和裁剪；区分会话状态、任务摘要与长期记忆，以可复现实验判断收益 |
| v0.6 RAG | 仅在检索确实优于直接搜索的任务上引入索引，对比召回与成本，避免先建向量库再找用途 |
| v0.7 Eval | 建正式数据集与回归报告；从 v0.2 起积累小型确定性案例，不必等本阶段才开始测试 |
| v0.8 / v0.9 | 单工具协议与单智能体评测稳定后，再分别研究 MCP / Skill、子智能体协调，验证其实际收益 |
| v1.0 | 依据真实使用场景再确定可靠性与部署目标，不预设必须建设平台 |

建议恢复节奏：先用一次学习时段读 main 并画消息序列；下一次补 v0.1 缺口；随后验收和归档。每周 Review 写成果、理解、问题、阶段判断与下一周 1～3 项重点，暂停周无需补造活动。可视化仅在 JSONL 已不足以定位问题时另行评估。

本次验证：macOS 上 `npm run typecheck` 与 `npm test`（15 项）通过，`git diff --check` 通过。依赖审计报告 source-map-js 一项 high 漏洞，另列维护任务，不自动更新锁文件；详见 W43 Review。
