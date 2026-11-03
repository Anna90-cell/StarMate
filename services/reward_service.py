# -*- coding: utf-8 -*-
"""成长与奖励规则（分工 C）。

奖励规则来源：docs/api-contract.md 3.10
    1. 完成一次 25 分钟专注                     +10 EXP
    2. 连续完成两次专注（上一条也是成功专注）     +5 EXP
    3. 完成每日学习目标（当天第一次成功专注）     +10 EXP

说明：
- 规则只在 /api/reward/claim 里结算一次，session_id 就是幂等键，重复领奖会被拒绝。
- 每日目标这里按"当天第一次成功专注"算，暂时不做用户自定义目标。
"""

LEVEL_THRESHOLDS = {
    1: 0,
    2: 30,
    3: 70,
    4: 120
}

# 算作"一次专注"的最低分钟数
MIN_FOCUS_MINUTES = 25

EXP_FOCUS_COMPLETE = 10
EXP_STREAK_BONUS = 5
EXP_DAILY_GOAL = 10


def _safe_int(value, fallback):
    """把不确定的输入转成整数，布尔值和非整数一律回退到默认值。"""
    if isinstance(value, bool) or not isinstance(value, int):
        return fallback
    return value


def _is_success(session):
    """是否算一次"完成 25 分钟的专注"。"""
    if not isinstance(session, dict):
        return False

    if not session.get("completed"):
        return False

    return _safe_int(session.get("actual_minutes"), 0) >= MIN_FOCUS_MINUTES


def _day_of(session):
    """取 ISO 时间里的日期部分（2026-11-02T15:00:00+09:00 -> 2026-11-02）。"""
    started_at = session.get("started_at")

    if not isinstance(started_at, str) or len(started_at) < 10:
        return None

    return started_at[:10]


def get_reward_info(companion):
    level = _safe_int(companion.get("level"), 1)
    exp = _safe_int(companion.get("exp"), 0)

    if exp < 0:
        exp = 0

    next_level_exp = LEVEL_THRESHOLDS.get(level + 1)

    return {
        "level": level,
        "exp": exp,
        "next_level_exp": next_level_exp
    }


def calculate_level(total_exp):
    level = 1

    for target_level, required_exp in LEVEL_THRESHOLDS.items():
        if total_exp >= required_exp:
            level = target_level

    return level


def calculate_session_exp(session, history=None):
    """返回这条专注记录应得的经验。

    history: 全部专注记录（包含本条），按发生顺序排列。
             不传时只结算规则 1，保持向后兼容。
    """
    if not _is_success(session):
        return 0

    earned_exp = EXP_FOCUS_COMPLETE

    if not isinstance(history, list):
        return earned_exp

    session_id = session.get("session_id")
    others = [
        item for item in history
        if isinstance(item, dict) and item.get("session_id") != session_id
    ]

    # ---- 规则 2：连续两次专注 ----
    # 找本条在历史里的位置，看它前面那条是不是也完成了
    previous = None
    index = None

    for i, item in enumerate(history):
        if isinstance(item, dict) and item.get("session_id") == session_id:
            index = i
            break

    if index is None:
        previous = others[-1] if others else None
    elif index > 0:
        previous = history[index - 1]

    if _is_success(previous):
        earned_exp += EXP_STREAK_BONUS

    # ---- 规则 3：每日学习目标 ----
    # 当天之前已经有过成功专注，就不再给每日奖励
    day = _day_of(session)

    if day is not None:
        same_day_done = [
            item for item in others
            if _day_of(item) == day and _is_success(item)
        ]

        if not same_day_done:
            earned_exp += EXP_DAILY_GOAL

    return earned_exp


def claim_session_reward(companion, session, claimed_sessions, history=None):
    session_id = session.get("session_id")

    if session_id in claimed_sessions:
        return None

    earned_exp = calculate_session_exp(session, history)

    old_level = _safe_int(companion.get("level"), 1)
    total_exp = _safe_int(companion.get("exp"), 0) + earned_exp
    new_level = calculate_level(total_exp)

    companion["exp"] = total_exp
    companion["level"] = new_level

    claimed_sessions.append(session_id)

    return {
        "earned_exp": earned_exp,
        "total_exp": total_exp,
        "level": new_level,
        "leveled_up": new_level > old_level
    }
