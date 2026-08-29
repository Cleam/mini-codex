
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
