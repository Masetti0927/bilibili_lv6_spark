# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 Tampermonkey 用户脚本，支持 OpenAI 兼容格式（OpenAI/DashScope/DeepSeek/Moonshot 等）和 Anthropic 格式，辅助回答 B 站硬核会员答题。

## 核心架构

**单文件结构**: `b站硬核会员答题辅助-YYYY-MM-DD.user.js`（文件名随版本号更新）

脚本工作流程:
1. **用户配置**: 启动时通过 `prompt()` 依次请求 `FORMAT`（1=OpenAI 兼容 / 2=Anthropic）、`BASE_URL`、`API_KEY`、`MODEL`
2. **DOM 监听**: 使用 `MutationObserver` 监听 `document.body` 的 `childList` 变化
3. **题目提取**: 当检测到 `.senior-question.fade-out` 元素时，提取题目文本 (`.senior-question__qs`) 和选项 (`.senior-question__answer--item`)
4. **API 调用**: 根据 `FORMAT` 选择不同请求格式：
   - OpenAI 兼容: `POST ${BASE_URL}/chat/completions`，`Authorization: Bearer ${API_KEY}`，响应结构 `data.choices[0].message.content`
   - Anthropic: `POST ${BASE_URL}/messages`，`x-api-key: ${API_KEY}` + `anthropic-version: 2023-06-01`，响应结构 `data.content[0].text`
5. **结果输出**: 在浏览器控制台显示推荐答案

**关键配置点** (脚本开头):
- `FORMAT`: API 格式选择（`isAnthropic` 布尔值）
- `BASE_URL`: API 基础地址，自动去除尾部 `/` 并拼接对应 endpoint
- `API_KEY`: 鉴权密钥，根据格式使用不同 header
- `MODEL`: 模型名，直接在请求体中发送

**Prompt 模板**: `getPrompt(questionText, answersText)` 函数生成发送给 API 的提示词，要求只返回最可能正确的选项，不提供解释。

**请求频率控制**:
- `debounce(func, 1000)`: 防抖延迟 1 秒，避免重复触发
- `throttle(func, 2000)`: 节流间隔 2 秒，限制 API 调用频率
- `lastQuestionText`: 缓存上次问题文本，相同问题不重复发送

## 开发注意事项

- 这是浏览器端用户脚本，无构建/测试流程，直接编辑 JS 文件即可
- 脚本仅在 `https://www.bilibili.com/h5/senior-newbie/qa` 页面生效 (通过 `@match` 配置)
- **修改脚本时务必同步**: 文件内 `@version` 日期、文件名日期、`readme.md` 中的使用说明
- 支持两种 API 格式：OpenAI 兼容（`/chat/completions`）和 Anthropic（`/messages`），新增格式需修改 `fetchOptions` 构建逻辑和响应解析
