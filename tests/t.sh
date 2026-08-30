#!/bin/bash

curl -s https://api.deepseek.com/chat/completions \
  -H "Authorization: Bearer sk-xxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"列出当前目录"}],"tools":[{"type":"function","function":{"name":"list_files","description":"列出目录下的文件","parameters":{"type":"object","properties":{"path":{"type":"string"}}}}}],"tool_choice":"auto"}'

# response:
# {"id":"016b14d6-4771-4b9b-b311-f3d55e576e84","object":"chat.completion","created":1788095001,"model":"deepseek-v4-flash","choices":[{"index":0,"message":{"role":"assistant","content":"","reasoning_content":"The user wants me to list the current directory. Let me use the list_files tool.","tool_calls":[{"index":0,"id":"call_00_BKdODmw7C0bC8Ijjo9RF3114","type":"function","function":{"name":"list_files","arguments":"{\"path\": \".\"}"}}]},"logprobs":null,"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":346,"completion_tokens":61,"total_tokens":407,"prompt_tokens_details":{"cached_tokens":0},"completion_tokens_details":{"reasoning_tokens":18},"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":346},"system_fingerprint":"a26a7955944dc5c60445bff77fac9c8e"}%
