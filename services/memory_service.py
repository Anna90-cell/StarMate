# -*- coding: utf-8 -*-
"""轻量记忆的合并与维护（分工 D）。

约定（已与 B 确认）：
- user_preferences：偏好追加并去重，保持原有顺序。
- current_goal：有新的非空值时替换；null、缺失或空字符串时保留原目标。
- recent_sessions：不接受 B 的 memory_update，由后端在专注会话写入时维护，
  按时间从新到旧排列，只保留最近 3 条供 B 直接读取。
"""

MAX_RECENT_SESSIONS = 3

DEFAULT_MEMORY = {
    "user_preferences": [],
    "current_goal": "",
    "recent_sessions": [],
}


def normalize_memory(memory):
    """数据文件缺失或损坏时回退到安全结构，而不是直接抛异常。"""
    if not isinstance(memory, dict):
        return dict(DEFAULT_MEMORY)

    preferences = memory.get("user_preferences")
    goal = memory.get("current_goal")
    recent = memory.get("recent_sessions")

    return {
        "user_preferences": list(preferences) if isinstance(preferences, list) else [],
        "current_goal": goal if isinstance(goal, str) else "",
        "recent_sessions": list(recent) if isinstance(recent, list) else [],
    }


def merge_memory_update(memory, update):
    """把 B 给出的 memory_update 合并进当前记忆，返回新的记忆字典。

    recent_sessions 不在 update 中读取，始终保留后端维护的值。
    """
    result = normalize_memory(memory)

    if not isinstance(update, dict):
        return result

    # 1. 偏好追加去重
    incoming_prefs = update.get("user_preferences")
    if isinstance(incoming_prefs, list):
        for item in incoming_prefs:
            if isinstance(item, str) and item and item not in result["user_preferences"]:
                result["user_preferences"].append(item)

    # 2. current_goal：有新值才替换，null/缺失/空串保留原目标
    if "current_goal" in update:
        new_goal = update.get("current_goal")
        if isinstance(new_goal, str) and new_goal.strip():
            result["current_goal"] = new_goal.strip()

    return result


def update_recent_sessions(memory, session):
    """写入一条专注会话后更新 recent_sessions（新→旧，最多 3 条）。

    同一 session_id 不重复计入。
    """
    result = normalize_memory(memory)

    if not isinstance(session, dict):
        return result

    session_id = session.get("session_id")
    recent = [
        item for item in result["recent_sessions"]
        if isinstance(item, dict) and item.get("session_id") != session_id
    ]
    recent.insert(0, session)
    result["recent_sessions"] = recent[:MAX_RECENT_SESSIONS]
    return result
