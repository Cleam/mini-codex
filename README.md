# Mini Codex

从零实现简化版 Coding Agent，系统学习智能体工程（Agent Engineering）。优先理解机制，小步演进。

## 当前进度

截至 2026-10-19：**v0.1 核心代码已实现，阶段尚未验收完成**。当前分支 `chore/v0.1-scaffold`；本地 `main` 尚未包含功能实现，未发现本地阶段 Tag。未刷新远端，不能据此判断远端最新状态。

已实现模型调用、`list_files`、`read_file`、参数校验、工具结果回传、最终回答与基础 JSONL Trace。只支持一轮工具调用，最多两次模型请求；第二次仍请求工具时明确停止。

阶段缺口、验收证据与下一步见 [Roadmap](docs/roadmap.md#当前进度核查2026-10-19)。

## 恢复开发

需要 Node.js >=24 与 npm。在仓库根目录执行：

```sh
npm ci
npm run typecheck
npm test
```

真实模型验收由人工执行：将 `.env.example` 复制为 `.env`，填写 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`。客户端使用 OpenAI 兼容的 Chat Completions 协议，在 Base URL 后追加 `/chat/completions`。

```sh
npm run dev -- "读取 package.json，说明其中的 npm scripts"
npm run dev -- "列出 src 目录的直接子项，不要继续读取文件"
```

需要联网并消耗模型额度。检查 Trace 中工具名称、参数、结果、`tool_call_id` 对应关系与最终回答，不只看终端是否输出文字。

**当前工具仅适合受控学习目录**：路径只做词法边界检查，尚未防止符号链接越界，也未阻止读取 `.env` 等敏感文件。不要对含凭据或隐私数据的目录运行；工具结果会发送给配置的模型服务，并写入本地 Trace。

## 阅读顺序

1. [当前架构](docs/architecture.md)：对照 `src/main.ts` 看完整调用链。
2. [v0.1 学习记录](docs/learning/01-tool-calling.md)：核心原理与自测问题。
3. [Roadmap](docs/roadmap.md)：先收尾 v0.1，再进入 v0.2。
4. [每周 Review](docs/reviews/README.md)：每周一页，记录证据与下一步。

原始讨论保留在 `PLAN.md`，其中未来建议不是已实现能力。当前不支持 Agent Loop、Memory、RAG、MCP、Multi-Agent 或 Web UI。
