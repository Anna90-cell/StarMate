"""大模型调用服务（成员 B 的 AI 模块对接处）。

这里只放初始骨架，具体实现由负责 AI 模块的成员补充。
"""
import os

import requests


def chat(messages: list[dict], model: str = "deepseek-chat") -> str:
    """调用 DeepSeek 对话接口，返回模型回复文本。

    :param messages: OpenAI 风格的消息列表，如 [{"role": "user", "content": "你好"}]
    :param model: 模型名称
    :return: 模型回复的文本内容
    """
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    if not api_key:
        raise RuntimeError("未配置 DEEPSEEK_API_KEY，请在 .env 中设置")

    # TODO(B): 补充请求与异常处理逻辑
    resp = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": model, "messages": messages},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]
