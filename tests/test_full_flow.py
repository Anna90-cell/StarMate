# -*- coding: utf-8 -*-
"""
StarMate 完整演示链路测试（E2E）：
生成伙伴 -> 专注记录 -> 情绪反馈 -> 陪伴日记 -> 奖励结算 -> 聊天 -> 数据持久化校验

运行：.venv\\Scripts\\python.exe tests\\test_full_flow.py
在独立临时数据目录中进行，不影响 data/ 真实数据。
"""
import os
import sys
import tempfile
import shutil

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import services.storage as storage  # noqa: E402

TEMP_DATA_DIR = tempfile.mkdtemp(prefix="starmate_e2e_")
storage.DATA_DIR = TEMP_DATA_DIR

from app import app  # noqa: E402

# E2E 不依赖真实大模型：mock 掉人设生成与聊天的 LLM 调用，无 API Key 也能跑
import json  # noqa: E402
import services.companion_service as companion_service  # noqa: E402
import services.chat_service as chat_service  # noqa: E402


def _fake_companion(messages, **kwargs):
    return json.dumps({
        "name": "小星",
        "personality": ["温柔", "耐心", "会鼓励人"],
        "speaking_style": "温柔、简短，偶尔用颜文字",
        "companion_style": "学习搭子",
    }, ensure_ascii=False)


companion_service.chat_completion = _fake_companion
chat_service.chat_completion = lambda messages, **kwargs: "测试回复：我陪着你，慢慢来。"

client = app.test_client()
steps = []


def step(name, condition):
    steps.append((name, condition))
    print(("[PASS] " if condition else "[FAIL] ") + name)


# 第一幕：创造专属伙伴
resp = client.post("/api/companion/generate",
                   json={"description": "温柔活泼的猫耳少女",
                         "avatar_id": "orange_cat"})
companion_data = resp.get_json()["data"]
step("1. 生成伙伴", resp.status_code == 200 and companion_data["name"])

# 第三幕：一起专注
resp = client.post("/api/focus/session", json={
    "task": "完成机器学习作业",
    "planned_minutes": 25,
    "actual_minutes": 25,
    "completed": True,
    "started_at": "2026-11-03T10:00:00+09:00",
    "mood_before": 2,
    "mood_after": 4
})
session_id = resp.get_json()["data"]["session_id"]
step("2. 保存专注记录", resp.status_code == 201)

# 情绪温度计
resp = client.post("/api/mood",
                   json={"session_id": session_id, "stage": "before", "mood": 2})
step("3. 专注前情绪", resp.status_code == 200)
resp = client.post("/api/mood",
                   json={"session_id": session_id, "stage": "after", "mood": 4})
step("4. 专注后情绪", resp.status_code == 200)

# AI 陪伴对话
resp = client.post("/api/chat",
                   json={"message": "我有点学不下去了", "mode": "focus",
                         "task": "机器学习作业", "mood": 2})
step("5. AI 对话", resp.status_code == 200 and resp.get_json()["data"]["reply"])

# 第四幕：陪伴日记 + 成长
resp = client.post("/api/focus/diary", json={"session_id": session_id})
diary = resp.get_json()["data"]
step("6. 生成陪伴日记", resp.status_code == 201 and diary["content"])

resp = client.post("/api/reward/claim", json={"session_id": session_id})
claim = resp.get_json()["data"]
# 当天首条成功专注：focus_complete +10、daily_goal +10，共 20
step("7. 领取奖励 +20 EXP（含每日目标）",
     resp.status_code == 200 and claim["earned_exp"] == 20)

# 持久化校验：重新从磁盘读取，模拟刷新页面
companion_on_disk = storage.load_json("companion.json")
history_on_disk = storage.load_json("history.json")
moods_on_disk = storage.load_json("mood.json")
diaries_on_disk = storage.load_json("diary.json")
claimed_on_disk = storage.load_json("claimed_sessions.json")

# 首次创建 +5，本次专注奖励 +20，合计 25
step("8. 伙伴成长数据已落盘（exp=25）",
     companion_on_disk["exp"] == 25 and session_id in claimed_on_disk)
step("9. 专注/情绪/日记数据均已落盘",
     len(history_on_disk) == 1 and len(moods_on_disk) == 2
     and len(diaries_on_disk) == 1)

shutil.rmtree(TEMP_DATA_DIR, ignore_errors=True)

failed = [n for n, ok in steps if not ok]
print()
print("E2E 汇总：%d 步，失败 %d 步" % (len(steps), len(failed)))
sys.exit(1 if failed else 0)
