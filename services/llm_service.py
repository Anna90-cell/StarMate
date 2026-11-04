"""与 DeepSeek 通信的唯一模块。

设计原则：
1. 全项目只有这里直接发 HTTP 请求，其他模块只负责组装 messages。
2. API Key 只从环境变量 DEEPSEEK_API_KEY 读取，不写进代码、不打印。
3. 所有失败都转换成 LLMServiceError 的子类，方便 D 统一返回 502。
4. 普通聊天不检查回复是不是 JSON；只有 json_mode=True 时才检查。
"""

import json
import os

import requests

DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"
DEFAULT_TIMEOUT = (10, 60)  # (连接超时秒数, 读取超时秒数)
MAX_ERROR_DETAIL = 300  # 错误信息里最多保留多少字响应内容


class LLMServiceError(Exception):
    """AI 调用失败的基类。D 可以统一捕获它并返回 502。"""


class LLMConfigError(LLMServiceError):
    """配置错误：例如没有设置 API Key，或地址格式不对。"""


class LLMTimeoutError(LLMServiceError):
    """网络超时：连接 DeepSeek 或等待回复超时。"""


class LLMRequestError(LLMServiceError):
    """HTTP 请求失败：无法连接，或返回的状态码不是 2xx。"""


class LLMResponseError(LLMServiceError):
    """响应数据异常：不是 JSON、缺少 choices，或 json_mode 下不是合法 JSON。"""


class LLMEmptyReplyError(LLMServiceError):
    """AI 回复为空：content 缺失、为空字符串或只有空白。"""


def chat_completion(
    messages,
    *,
    temperature=0.8,
    max_tokens=800,
    json_mode=False,
    timeout=DEFAULT_TIMEOUT,
):
    """调用 DeepSeek 的聊天接口，返回模型回复的纯文本。

    参数:
        messages: 消息列表，例如
            [{"role": "user", "content": "你好"}]。
            role 只能是 system、user 或 assistant，content 必须是非空字符串。
        temperature: 随机程度，0 到 2 之间。越高越活泼，聊天建议 0.8。
        max_tokens: 回复的最大 token 数，用来限制长度。
        json_mode: 为 True 时要求模型返回 JSON，并检查文本能被解析。
            开启时最好在 Prompt 里明确写出“请返回 JSON”，否则模型可能返回空内容。
        timeout: (连接超时, 读取超时)，单位秒。

    返回:
        str: 模型回复的文本。json_mode=True 时会去掉代码块标记，
             返回的文本保证能被 json.loads 解析。

    异常:
        LLMConfigError: 缺少 API Key 或地址配置错误。
        LLMTimeoutError: 网络超时。
        LLMRequestError: 无法连接，或 HTTP 状态码不是 2xx。
        LLMResponseError: 响应不是合法 JSON、缺少 choices，或 json_mode 下内容不是 JSON。
        LLMEmptyReplyError: 模型回复为空。
    """
    _validate_messages(messages)
    api_key, base_url, model = _load_config()

    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=timeout,
        )
    except requests.exceptions.Timeout as exc:
        # Timeout 是 RequestException 的子类，必须放在前面捕获。
        raise LLMTimeoutError("请求 DeepSeek 超时，请检查网络后重试。") from exc
    except requests.exceptions.RequestException as exc:
        raise LLMRequestError(
            "无法连接 DeepSeek，请检查网络或 DEEPSEEK_BASE_URL 配置。"
        ) from exc

    if not 200 <= response.status_code < 300:
        detail = _short_detail(response.text)
        raise LLMRequestError(f"DeepSeek 返回 HTTP {response.status_code}：{detail}")

    try:
        data = response.json()
    except ValueError as exc:
        raise LLMResponseError("DeepSeek 返回的内容不是合法 JSON。") from exc

    if not isinstance(data, dict):
        raise LLMResponseError("DeepSeek 返回的 JSON 不是一个对象。")

    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise LLMResponseError("DeepSeek 返回的数据缺少 choices，或 choices 为空。")

    first_choice = choices[0]
    message = first_choice.get("message") if isinstance(first_choice, dict) else None
    content = message.get("content") if isinstance(message, dict) else None

    if not isinstance(content, str) or not content.strip():
        raise LLMEmptyReplyError("DeepSeek 返回了空回复。")

    content = content.strip()

    if json_mode:
        content = _strip_code_fence(content)
        try:
            json.loads(content)
        except json.JSONDecodeError as exc:
            raise LLMResponseError(
                "json_mode 已开启，但模型返回的内容不是合法 JSON。"
            ) from exc

    return content


def _load_config():
    """从环境变量读取配置，返回 (api_key, base_url, model)。"""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise LLMConfigError(
            "未配置 DEEPSEEK_API_KEY 环境变量，请先设置 API Key 再调用。"
        )

    base_url = os.environ.get("DEEPSEEK_BASE_URL", DEFAULT_BASE_URL).strip().rstrip("/")
    if not base_url.startswith(("http://", "https://")):
        raise LLMConfigError(
            "DEEPSEEK_BASE_URL 必须以 http:// 或 https:// 开头。"
        )

    model = os.environ.get("DEEPSEEK_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    return api_key, base_url, model


def _validate_messages(messages):
    """在发请求前检查 messages 的形状，尽早暴露调用方写的 bug。"""
    if not isinstance(messages, list) or not messages:
        raise ValueError("messages 必须是非空列表。")

    for index, message in enumerate(messages):
        if not isinstance(message, dict):
            raise ValueError(f"messages[{index}] 必须是字典。")
        if message.get("role") not in ("system", "user", "assistant"):
            raise ValueError(
                f"messages[{index}] 的 role 必须是 system、user 或 assistant。"
            )
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ValueError(f"messages[{index}] 的 content 必须是非空字符串。")


def _strip_code_fence(text):
    """去掉模型偶尔加上的 ```json ... ``` 代码块标记。"""
    text = text.strip()
    if not text.startswith("```"):
        return text

    lines = text.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _short_detail(text):
    """截断响应内容，避免错误信息太长；绝不拼接 API Key 或 headers。"""
    text = (text or "").strip().replace("\n", " ")
    if not text:
        return "（无返回内容）"
    if len(text) > MAX_ERROR_DETAIL:
        return text[:MAX_ERROR_DETAIL] + "…"
    return text
