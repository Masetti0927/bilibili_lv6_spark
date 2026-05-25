// ==UserScript==
// @name         b站硬核会员答题辅助
// @namespace    https://github.com/Masetti0927
// @version      2026-05-25
// @description  b站硬核会员答题辅助，支持 OpenAI / Anthropic 等格式
// @author       masetti
// @match        https://www.bilibili.com/h5/senior-newbie/qa
// @license      GPL-3.0-only
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        none
// ==/UserScript==
(function () {
    'use strict';

    // ⭐⭐⭐ 用户配置 ⭐⭐⭐
    const FORMAT = prompt("请选择 API 格式 (1/2):\n1 = OpenAI 兼容 (OpenAI/DashScope/DeepSeek/Moonshot 等)\n2 = Anthropic");
    const BASE_URL = prompt("请输入 API Base URL:");
    const API_KEY = prompt("请输入 API Key:");
    const MODEL = prompt("请输入模型名称:");

    const isAnthropic = FORMAT === '2';
    const ENDPOINT = isAnthropic
        ? `${BASE_URL.replace(/\/+$/, '')}/messages`
        : `${BASE_URL.replace(/\/+$/, '')}/chat/completions`;

    // Prompt模板，想改可以改。
    const getPrompt = (questionText, answersText) => {
        return `你是一个资深的 B 站答题专家。你只能告诉我最有可能正确的选项。不要提供任何解释或其他文本。问题: ${questionText}；选项：${answersText}`
    }

    let lastQuestionText = ""; // 存储上一次的文本
    let isThrottled = false; // 节流标志


    // 防抖函数
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // 节流函数
    function throttle(func, limit) {
        return function (...args) {
            if (!isThrottled) {
                func.apply(this, args);
                isThrottled = true;
                setTimeout(() => {
                    isThrottled = false;
                }, limit);
            }
        };
    }

    // 创建一个观察者实例
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // 重新获取所有带有 fade-out 类的 senior-question 元素
                const fadeOutQuestions = document.querySelectorAll('.senior-question.fade-out');

                fadeOutQuestions.forEach(question => {
                    // 获取问题文本
                    const questionText = question.querySelector('.senior-question__qs').innerText;

                    // 获取所有答案文本
                    const answerElements = question.querySelectorAll('.senior-question__answer .senior-question__answer--item');
                    const answersText = Array.from(answerElements).map(answer => answer.innerText);

                    // 防抖处理，创建或更新内容
                    // 使用 getPrompt() 生成最终发送给 API 的文本
                    createOrUpdateContent(getPrompt(questionText, answersText));
                });
            }
        });
    });

    // 创建或更新内容的函数
    const createOrUpdateContent = throttle(debounce((promptText) => {
        // 如果新的文本和上一次的文本相同，则不发送请求
        if (promptText === lastQuestionText) {
            return;
        }

        lastQuestionText = promptText; // 更新上一次的文本

        // 使用彩色输出问题文本
        console.log('%cPrompt: ' + promptText, 'font-weight: bold;');

        // 根据 API 格式构建请求
        const fetchOptions = isAnthropic ? {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: promptText
                    }
                ]
            })
        } : {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'user',
                        content: promptText
                    }
                ]
            })
        };

        fetch(ENDPOINT, fetchOptions)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        console.error('API 错误详情:', err.error || err);
                        throw new Error(`网络响应错误，状态码: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // 根据 API 格式解析响应
                const content = isAnthropic
                    ? (data?.content?.[0]?.text || "未找到答案")
                    : (data?.choices?.[0]?.message?.content || "未找到答案");

                // 使用彩色输出响应内容
                console.log('%c【AI 推荐选项】: ' + content, 'color: #34A853; font-weight: bold; font-size: 1.2em;');
            })
            .catch(error => {
                console.error('Fetch error:', error);
                console.log('%c请检查：1. 您的 API Key 是否正确；2. Base URL 是否正确；3. 您的 API 是否被限流。', 'color: red;');
            });
    }, 1000), 2000); // 防抖延迟为 1000 毫秒，节流间隔为 2000 毫秒

    // 观察目标节点，配置观察选项
    const targetNode = document.body; // 你可以根据需要选择特定的父元素
    const config = { childList: true, subtree: true };

    // 开始观察
    observer.observe(targetNode, config);
})();
