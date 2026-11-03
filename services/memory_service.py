# -*- coding: utf-8 -*-
"""
轻量记忆的合并与维护（分工 D）。

职责约定（已与 B 确认）：
1. user_preferences：
   - 接收 B 清洗后的 user_preferences_add。
   - 追加并去重，保持原有顺序。
   - 最多保留 5 条。

2. current_goal：
   - 有新的非空字符串时替换原目标。
   - null、缺失或空字符串时保留原目标。

3. recent_sessions：
   - 不接受 B 的 memory_update。
   - 由后端在专注会话写入时独立维护。
   - 使用原始专注会话记录及 session_id 去重。
   - 按时间从新到旧排列，只保留最近 3 条。

4. normalize_memory：
   - 保证记忆具有统一的数据结构。
   - 进行基本的数据类型检查。
   - 不代替 B 的严格记忆清洗。

B 负责：
- sanitize_memory：清洗已有记忆。
- build_memory_block：生成 Prompt 中的记忆背景块。
- clean_memory_update：清洗模型返回的记忆增量。

D 负责：
- 合并记忆增量。
- 维护专注记录。
- 记忆持久化。
"""

MAX_PREFERENCES = 5
MAX_RECENT_SESSIONS = 3

DEFAULT_MEMORY = {
    "user_preferences": [],
    "current_goal": "",
    "recent_sessions": [],
}


def normalize_memory(memory):
    """
    将记忆规范化为统一结构。

    注意：
    这里只做基本的数据类型检查，
    不代替 B 的 sanitize_memory() 严格清洗。
    """

    if not isinstance(memory, dict):
        return {
            "user_preferences": [],
            "current_goal": "",
            "recent_sessions": [],
        }

    preferences = memory.get("user_preferences")
    goal = memory.get("current_goal")
    recent = memory.get("recent_sessions")

    # 1. 基本处理用户偏好
    if isinstance(preferences, list):
        clean_preferences = []

        for item in preferences:
            if isinstance(item, str) and item.strip():
                item = item.strip()

                if item not in clean_preferences:
                    clean_preferences.append(item)

            if len(clean_preferences) >= MAX_PREFERENCES:
                break
    else:
        clean_preferences = []

    # 2. 基本处理当前目标
    if isinstance(goal, str):
        clean_goal = goal.strip()
    else:
        clean_goal = ""

    # 3. 基本处理最近专注记录
    if isinstance(recent, list):
        clean_recent = [
            item for item in recent
            if isinstance(item, dict)
        ][:MAX_RECENT_SESSIONS]
    else:
        clean_recent = []

    return {
        "user_preferences": clean_preferences,
        "current_goal": clean_goal,
        "recent_sessions": clean_recent,
    }


def merge_memory_update(memory, update):
    """
    将 B 清洗后的 memory_update 合并到当前记忆。

    B 返回的数据格式：
    {
        "user_preferences_add": ["喜欢简洁的回答"],
        "current_goal": "完成项目"
    }

    规则：
    1. 偏好只追加，不覆盖原有偏好。
    2. 偏好去重，最多保留 5 条。
    3. 新目标非空时才替换旧目标。
    4. 不接受 B 对 recent_sessions 的修改。
    """

    result = normalize_memory(memory)

    if not isinstance(update, dict):
        return result

    # 1. 用户偏好：追加、去重
    incoming_prefs = update.get("user_preferences_add")

    if isinstance(incoming_prefs, list):

        for item in incoming_prefs:

            if not isinstance(item, str):
                continue

            item = item.strip()

            if not item:
                continue

            if item not in result["user_preferences"]:
                result["user_preferences"].append(item)

            # 最多保留 5 条
            if len(result["user_preferences"]) >= MAX_PREFERENCES:
                break

    # 2. 当前目标：有新的非空值才替换
    if "current_goal" in update:

        new_goal = update.get("current_goal")

        if isinstance(new_goal, str) and new_goal.strip():
            result["current_goal"] = new_goal.strip()

    # 3. recent_sessions 不读取 update 中的值
    # 始终保留后端自己维护的专注记录

    return result


def update_recent_sessions(memory, session):
    """
    写入一条专注会话后更新 recent_sessions。

    参数：
        memory：当前完整记忆字典。
        session：后端获取的原始专注会话记录。

    规则：
        1. 使用 session_id 去重。
        2. 新记录放在最前面。
        3. 最多保留最近 3 条。
        4. 不负责从数据库读取记录。
        5. 不依赖 B 清洗后的专注记录。
    """

    result = normalize_memory(memory)

    if not isinstance(session, dict):
        return result

    # 必须有有效的 session_id
    session_id = session.get("session_id")

    if session_id is None or session_id == "":
        return result

    # 过滤掉相同 session_id 的旧记录
    recent = [
        item for item in result["recent_sessions"]
        if item.get("session_id") != session_id
    ]

    # 新记录插入最前面
    recent.insert(0, session)

    # 只保留最近 3 条
    result["recent_sessions"] = recent[:MAX_RECENT_SESSIONS]

    return result
