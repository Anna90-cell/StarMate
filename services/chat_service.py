# -*- coding: utf-8 -*-
"""AI 聊天编排服务（B 的 Prompt 与 D 的上下文组织在此对接）。

职责：
1. 校验本轮输入，非法时抛 ChatInputError。
2. 基于人设、历史记录、轻量记忆组装上下文，组装失败抛 ChatContextError。
3. 调用 llm_service.chat_completion，底层异常原样透传，由 D 映射为 502。
4. 校验模型回复，格式异常抛 ChatFormatError。

异常映射（已与 B 确认）：
    ChatInputError  -> 400
    ChatContextError -> 500
    ChatFormatError / LLMServiceError -> 502
"""

from services.llm_service import LLMServiceError, chat_completion

VALID_MODES = ("focus", "entertainment")

# companion=None 时使用的默认人设，仅用于聊天兜底，不会写入 companion.json，
# 因此 GET /api/companion 仍按约定返回 data=null，不伪造默认伙伴。
DEFAULT_COMPANION = {
    "name": "小星",
    "personality": "温柔、耐心、会鼓励人",
    "speaking_style": "亲切、简短，语气温和",
    "companion_style": "学习搭子，安静陪伴并适时鼓励",
}


class ChatInputError(Exception):
    """本轮请求输入不合法，D 应返回 400。"""


class ChatContextError(Exception):
    """上下文组装失败（服务端责任），D 应返回 500。"""


class ChatFormatError(LLMServiceError):
    """模型回复不符合约定，D 应返回 502。"""


def chat_with_companion(message, mode, task=None, mood=None,
                        companion=None, history=None, memory=None):
    """完成一次聊天编排，返回 {"reply": 回复文本, "memory_update": 记忆更新}。

    history 只包含过去的聊天记录、不含本轮 message，顺序从旧到新。
    memory_update 交给 D 合并，本函数不直接读写文件。
    """
    _validate_inputs(message, mode, task, mood, history, memory)

    effective_companion = companion if isinstance(companion, dict) else DEFAULT_COMPANION

    try:
        messages = _build_messages(
            effective_companion, mode, task, mood, history, memory, message
        )
    except Exception as exc:
        raise ChatContextError("聊天上下文组装失败") from exc

    reply = chat_completion(messages)

    if not isinstance(reply, str) or not reply.strip():
        raise ChatFormatError("模型回复为空或格式不正确")

    memory_update = _build_memory_update(mode, task)
    return {"reply": reply.strip(), "memory_update": memory_update}


def _validate_inputs(message, mode, task, mood, history, memory):
    if not isinstance(message, str) or not message.strip():
        raise ChatInputError("message 必须是非空字符串")

    if mode not in VALID_MODES:
        raise ChatInputError("mode 只能是 focus 或 entertainment")

    if task is not None and not isinstance(task, str):
        raise ChatInputError("task 必须是字符串或 null")

    if mood is not None and (isinstance(mood, bool) or not isinstance(mood, int)
                             or not 1 <= mood <= 5):
        raise ChatInputError("mood 必须是 1 到 5 的整数或 null")

    if history is not None and not isinstance(history, list):
        raise ChatInputError("history 必须是列表")

    if memory is not None and not isinstance(memory, dict):
        raise ChatInputError("memory 必须是字典")


def _build_messages(companion, mode, task, mood, history, memory, message):
    personality = companion.get("personality", DEFAULT_COMPANION["personality"])
    if isinstance(personality, list):
        personality = "、".join(personality)

    system_lines = [
        f"你是{companion.get('name', DEFAULT_COMPANION['name'])}，"
        f"性格{personality}。",
        f"说话风格：{companion.get('speaking_style', DEFAULT_COMPANION['speaking_style'])}。",
        f"陪伴方式：{companion.get('companion_style', DEFAULT_COMPANION['companion_style'])}。",
    ]

    if isinstance(memory, dict):
        goal = memory.get("current_goal")
        if isinstance(goal, str) and goal.strip():
            system_lines.append(f"用户当前的学习目标是：{goal.strip()}。")

    if mode == "focus":
        system_lines.append("现在是专注模式，以鼓励为主，帮助用户安心学习。")
        if isinstance(task, str) and task.strip():
            system_lines.append(f"当前任务：{task.strip()}。")
    else:
        system_lines.append("现在是娱乐模式，氛围轻松，可以陪用户闲聊放松。")

    if mood is not None:
        system_lines.append(f"用户当前情绪值为 {mood}（1 很低落，5 很开心），据此调整语气。")

    messages = [{"role": "system", "content": " ".join(system_lines)}]

    if isinstance(history, list):
        for item in history:
            if isinstance(item, dict) and item.get("role") in ("user", "assistant") \
                    and isinstance(item.get("content"), str):
                messages.append({"role": item["role"], "content": item["content"]})

    messages.append({"role": "user", "content": message.strip()})
    return messages


def _build_memory_update(mode, task):
    """构造本轮记忆更新。

    recent_sessions 不在这里更新；专注模式下有任务名时作为新的 current_goal 候选，
    最终是否替换由 D 的 merge_memory_update 按规则决定。
    """
    update = {"user_preferences": []}
    if mode == "focus" and isinstance(task, str) and task.strip():
        update["current_goal"] = task.strip()
    return update
