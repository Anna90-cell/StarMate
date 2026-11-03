# -*- coding: utf-8 -*-
"""
StarMate 后端完整接口测试（不依赖 pytest，直接运行：
    .venv\\Scripts\\python.exe tests\\test_api.py
）

测试在独立的临时数据目录中进行，不会污染 data/ 下的真实数据。
"""
import json
import os
import sys
import tempfile
import shutil

# 保证可以从项目根目录导入 app
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import services.storage as storage  # noqa: E402

# 在导入 app 之前把数据目录指向临时目录
TEMP_DATA_DIR = tempfile.mkdtemp(prefix="starmate_test_")
storage.DATA_DIR = TEMP_DATA_DIR

from app import app  # noqa: E402

# 测试不调用真实大模型：用固定人设替掉 companion_service 里的 LLM 调用。
# 否则没配 DEEPSEEK_API_KEY 的机器（以及 CI）连测试都跑不起来。
import services.companion_service as companion_service  # noqa: E402


def _fake_chat_completion(messages, **kwargs):
    return json.dumps({
        "name": "小星",
        "appearance": "银色长发，蓝色眼睛，穿白色卫衣",
        "personality": ["温柔", "耐心", "会鼓励人"],
        "speaking_style": "温柔、简短，偶尔用颜文字",
        "companion_style": "学习搭子",
    }, ensure_ascii=False)


companion_service.chat_completion = _fake_chat_completion

# 聊天路径走 chat_service -> llm_service，测试不调用真实大模型，固定返回模拟回复
import services.chat_service as chat_service  # noqa: E402

chat_service.chat_completion = lambda messages, **kwargs: "测试回复：我陪着你，慢慢来。"

client = app.test_client()

PASS_COUNT = 0
FAIL_COUNT = 0


def check(name, condition, detail=""):
    global PASS_COUNT, FAIL_COUNT
    if condition:
        PASS_COUNT += 1
        print("[PASS] " + name)
    else:
        FAIL_COUNT += 1
        print("[FAIL] " + name + " -> " + detail)


def post_json(path, payload):
    return client.post(path, json=payload)


def put_json(path, payload):
    return client.put(path, json=payload)


def valid_session_payload():
    return {
        "task": "完成机器学习作业",
        "planned_minutes": 25,
        "actual_minutes": 25,
        "completed": True,
        "started_at": "2026-11-02T15:00:00+09:00",
        "mood_before": 2,
        "mood_after": 4
    }


# ---------------------------------------------------------------------------
# 0. 基础检查
# ---------------------------------------------------------------------------
resp = client.get("/api/test")
check("GET /api/test 连通", resp.status_code == 200 and resp.get_json()["success"])

# ---------------------------------------------------------------------------
# 1. 伙伴：空数据 -> 生成 -> 读取 -> 修改
# ---------------------------------------------------------------------------
resp = client.get("/api/companion")
check("未创建伙伴时 GET /api/companion 返回 data=null",
      resp.status_code == 200 and resp.get_json()["data"] is None)

resp = post_json("/api/companion/generate", {"description": "想要一个温柔的猫耳少女"})
body = resp.get_json()
check("POST /api/companion/generate 成功",
      resp.status_code == 200 and body["success"], str(body))
generated = body["data"]
check("生成结果包含 5 个约定字段",
      all(k in generated for k in
          ["name", "appearance", "personality", "speaking_style", "companion_style"]),
      str(generated))
check("personality 是数组", isinstance(generated["personality"], list))

resp = post_json("/api/companion/generate", {"description": "   "})
check("description 为空 -> 400", resp.status_code == 400)

resp = client.post("/api/companion/generate",
                    data="not-json", content_type="application/json")
check("非法 JSON 请求体 -> 400", resp.status_code == 400)

resp = client.get("/api/companion")
check("生成后 GET /api/companion 有数据",
      resp.status_code == 200 and resp.get_json()["data"]["name"])

check("首次创建伙伴自动 +5 EXP",
      resp.get_json()["data"]["exp"] == 5, str(resp.get_json()))

resp = post_json("/api/companion/generate", {"description": "换一个更活泼的性格"})
body = resp.get_json()
check("重新生成人设不给重复经验",
      resp.status_code == 200
      and client.get("/api/companion").get_json()["data"]["exp"] == 5,
      str(body))

resp = put_json("/api/companion", {"name": "小橘", "avatar": "orange_cat.png"})
check("PUT /api/companion 正常更新",
      resp.status_code == 200 and resp.get_json()["data"]["saved"] is True)

resp = put_json("/api/companion", {"level": 99})
check("PUT 试图修改 level 被拒绝", resp.status_code == 400)

resp = put_json("/api/companion", {"exp": 999})
check("PUT 试图修改 exp 被拒绝", resp.status_code == 400)

resp = put_json("/api/companion", {})
check("PUT 空对象 -> 400", resp.status_code == 400)

# ---------------------------------------------------------------------------
# 2. AI 聊天
# ---------------------------------------------------------------------------
resp = post_json("/api/chat", {"message": "我有点学不下去了", "mode": "focus",
                               "task": "机器学习作业", "mood": 2})
check("POST /api/chat 专注模式",
      resp.status_code == 200 and isinstance(resp.get_json()["data"]["reply"], str))

resp = post_json("/api/chat", {"message": "你好呀", "mode": "entertainment"})
check("POST /api/chat 娱乐模式", resp.status_code == 200)

resp = post_json("/api/chat", {"message": "", "mode": "focus"})
check("chat 空消息 -> 400", resp.status_code == 400)

resp = post_json("/api/chat", {"message": "test", "mode": "wrong"})
check("chat 非法 mode -> 400", resp.status_code == 400)

resp = post_json("/api/chat", {"message": "test", "mode": "focus", "mood": 9})
check("chat 非法 mood -> 400", resp.status_code == 400)

resp = post_json("/api/chat", {"message": "test", "mode": "focus", "task": 123})
check("chat 非法 task -> 400", resp.status_code == 400)

saved_history = storage.load_json("chat_history.json", [])
check("聊天记录已写入 chat_history.json", len(saved_history) >= 2)

# ---------------------------------------------------------------------------
# 3. 专注记录
# ---------------------------------------------------------------------------
resp = post_json("/api/focus/session", valid_session_payload())
body = resp.get_json()
check("POST /api/focus/session 创建成功",
      resp.status_code == 201 and body["data"]["session_id"].startswith("session_"))
session_id = body["data"]["session_id"]

bad_payload = valid_session_payload()
del bad_payload["task"]
resp = post_json("/api/focus/session", bad_payload)
check("session 缺字段 -> 400", resp.status_code == 400)

bad_payload = valid_session_payload()
bad_payload["actual_minutes"] = -5
resp = post_json("/api/focus/session", bad_payload)
check("session 负时长 -> 400", resp.status_code == 400)

bad_payload = valid_session_payload()
bad_payload["mood_before"] = 7
resp = post_json("/api/focus/session", bad_payload)
check("session 非法情绪 -> 400", resp.status_code == 400)

bad_payload = valid_session_payload()
bad_payload["started_at"] = "not-a-time"
resp = post_json("/api/focus/session", bad_payload)
check("session 非法时间 -> 400", resp.status_code == 400)

bad_payload = valid_session_payload()
bad_payload["completed"] = "yes"
resp = post_json("/api/focus/session", bad_payload)
check("session 非法布尔 -> 400", resp.status_code == 400)

resp = client.get("/api/focus/history")
sessions = resp.get_json()["data"]["sessions"]
check("GET /api/focus/history 含新记录",
      resp.status_code == 200 and any(s["session_id"] == session_id for s in sessions))

# ---------------------------------------------------------------------------
# 4. 情绪反馈
# ---------------------------------------------------------------------------
resp = post_json("/api/mood", {"session_id": session_id, "stage": "before", "mood": 2})
check("POST /api/mood before", resp.status_code == 200)

resp = post_json("/api/mood", {"session_id": session_id, "stage": "after", "mood": 4})
check("POST /api/mood after", resp.status_code == 200)

resp = post_json("/api/mood", {"session_id": session_id, "stage": "middle", "mood": 3})
check("mood 非法 stage -> 400", resp.status_code == 400)

resp = post_json("/api/mood", {"session_id": session_id, "stage": "before", "mood": 0})
check("mood 越界 -> 400", resp.status_code == 400)

resp = post_json("/api/mood", {"session_id": "session_notexist",
                               "stage": "before", "mood": 3})
check("mood 不存在的 session -> 404", resp.status_code == 404)

# ---------------------------------------------------------------------------
# 5. 陪伴日记
# ---------------------------------------------------------------------------
resp = post_json("/api/focus/diary", {"session_id": session_id})
body = resp.get_json()
check("POST /api/focus/diary 首次生成 201",
      resp.status_code == 201 and body["data"]["diary_id"])
diary_id = body["data"]["diary_id"]

resp = post_json("/api/focus/diary", {"session_id": session_id})
check("重复请求日记返回同一篇 200",
      resp.status_code == 200 and resp.get_json()["data"]["diary_id"] == diary_id)

resp = post_json("/api/focus/diary", {"session_id": "session_notexist"})
check("diary 不存在的 session -> 404", resp.status_code == 404)

# ---------------------------------------------------------------------------
# 6. 成长奖励
# ---------------------------------------------------------------------------
resp = client.get("/api/reward")
body = resp.get_json()
check("GET /api/reward 结构完整",
      resp.status_code == 200
      and all(k in body["data"] for k in ["level", "exp", "next_level_exp"]),
      str(body))

resp = post_json("/api/reward/claim", {"session_id": session_id})
body = resp.get_json()
check("POST /api/reward/claim 领取成功（完成 10 + 每日目标 10）",
      resp.status_code == 200 and body["data"]["earned_exp"] == 20, str(body))

resp = post_json("/api/reward/claim", {"session_id": session_id})
check("重复领取奖励 -> 400", resp.status_code == 400)

resp = post_json("/api/reward/claim", {"session_id": "session_notexist"})
check("claim 不存在的 session -> 404", resp.status_code == 404)

# 规则 2：连续完成两次专注 +5（当天每日目标已经领过，所以是 10 + 5）
streak_payload = valid_session_payload()
streak_payload["task"] = "连续第二次专注"
resp = post_json("/api/focus/session", streak_payload)
streak_id = resp.get_json()["data"]["session_id"]
body = post_json("/api/reward/claim", {"session_id": streak_id}).get_json()
check("连续第二次专注 -> earned_exp=15",
      body["success"] and body["data"]["earned_exp"] == 15, str(body))

# 规则 3：换一天的第一条专注拿回每日目标 +10（10 + 5 连续 + 10 每日）
next_day = valid_session_payload()
next_day["task"] = "第二天第一次专注"
next_day["started_at"] = "2026-11-03T09:00:00+09:00"
resp = post_json("/api/focus/session", next_day)
next_day_id = resp.get_json()["data"]["session_id"]
body = post_json("/api/reward/claim", {"session_id": next_day_id}).get_json()
check("第二天第一次专注 -> earned_exp=25",
      body["success"] and body["data"]["earned_exp"] == 25, str(body))

# 未完成的短专注不应获得奖励
short = valid_session_payload()
short["actual_minutes"] = 10
short["completed"] = False
resp = post_json("/api/focus/session", short)
short_id = resp.get_json()["data"]["session_id"]
resp = post_json("/api/reward/claim", {"session_id": short_id})
check("未完成且不足 25 分钟 -> earned_exp=0",
      resp.status_code == 200 and resp.get_json()["data"]["earned_exp"] == 0)

# ---------------------------------------------------------------------------
# 7. 全局错误处理
# ---------------------------------------------------------------------------
resp = client.get("/api/not-exist")
check("未知路径返回 JSON 404",
      resp.status_code == 404 and resp.get_json()["success"] is False)

resp = client.delete("/api/companion")
check("不支持的方法返回 JSON 405",
      resp.status_code == 405 and resp.get_json()["success"] is False)

# ---------------------------------------------------------------------------
# 汇总
# ---------------------------------------------------------------------------
shutil.rmtree(TEMP_DATA_DIR, ignore_errors=True)

print()
print("测试汇总：通过 %d 项，失败 %d 项" % (PASS_COUNT, FAIL_COUNT))

if FAIL_COUNT:
    sys.exit(1)
