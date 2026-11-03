LEVEL_THRESHOLDS = {
    1: 0,
    2: 30,
    3: 70,
    4: 120
}


def _safe_int(value, fallback):
    """数据文件被手动改坏时回退到安全默认值，而不是直接抛异常。"""
    if isinstance(value, bool) or not isinstance(value, int):
        return fallback
    return value


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


def calculate_session_exp(session):
    earned_exp = 0

    # 奖励规则（接口约定 3.10）：完成一次 25 分钟以上专注 +10 EXP
    if session.get("completed") and session.get("actual_minutes", 0) >= 25:
        earned_exp += 10

    return earned_exp


def claim_session_reward(companion, session, claimed_sessions):
    session_id = session.get("session_id")

    if session_id in claimed_sessions:
        return None

    earned_exp = calculate_session_exp(session)

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
