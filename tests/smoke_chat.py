"""聊天功能的手动真实调用脚本，不属于最终产品。

每次运行只调用一次真实 API。注意：当前聊天已改为普通文本输出，
memory_update 固定为 None。

用法（在项目根目录运行，先配置 DEEPSEEK_API_KEY）：
    python -m tests.smoke_chat
"""

import json
import time

from services.chat_service import (
    ChatContextError,
    ChatFormatError,
    ChatInputError,
    chat_with_companion,
)
from services.llm_service import LLMServiceError

COMPANION = {
    "name": "小橘",
    "personality": ["温柔", "活泼", "幽默"],
    "speaking_style": "亲切、简短、偶尔开玩笑",
    "companion_style": "鼓励为主，不严厉催促",
}

HISTORY = [
    {"role": "user", "content": "今天的作业好多"},
    {"role": "assistant", "content": "我们一件一件来，先挑最简单的。"},
]

MEMORY = {
    "user_preferences": ["喜欢被温柔鼓励"],
    "current_goal": "完成机器学习作业",
    "recent_sessions": [
        {
            "task": "机器学习作业",
            "planned_minutes": 25,
            "actual_minutes": 25,
            "completed": True,
            "started_at": "2026-11-03T20:00:00+08:00",
            "mood_before": 2,
            "mood_after": 4,
        }
    ],
}

MESSAGE = "我这周要完成机器学习作业，但今天有点学不下去了。"


def main():
    print(f"用户消息：{MESSAGE}")

    started = time.time()
    try:
        result = chat_with_companion(
            MESSAGE,
            "focus",
            task="完成机器学习作业",
            mood=2,
            companion=COMPANION,
            history=HISTORY,
            memory=MEMORY,
        )
    except ChatInputError as exc:
        print(f"[输入错误] {exc}")
        return 1
    except ChatContextError as exc:
        print(f"[上下文错误] {exc}")
        return 1
    except ChatFormatError as exc:
        print(f"[聊天格式错误] {exc}")
        return 1
    except LLMServiceError as exc:
        print(f"[AI 调用失败] {type(exc).__name__}: {exc}")
        return 1

    elapsed = time.time() - started
    print(f"[成功] 用时 {elapsed:.2f} 秒")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
