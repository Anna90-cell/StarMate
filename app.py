import os
import uuid
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from services.chat_service import (
    ChatContextError,
    ChatFormatError,
    ChatInputError,
    chat_with_companion,
)
from services.companion_service import generate_companion
from services.diary_service import generate_diary
from services.focus_service import create_focus_session
from services.memory_service import merge_memory_update, update_recent_sessions
from services.mood_service import save_mood
from services.reward_service import (
    get_reward_info,
    claim_session_reward,
    grant_companion_created_bonus
)
from services.storage import load_json, save_json
from services.llm_service import LLMServiceError

# 显式基于本文件所在目录加载 .env，避免后台启动/工作目录不同时找不到配置
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# 通用辅助函数
# ---------------------------------------------------------------------------

def error_response(code, message, status_code):
    """统一失败响应格式，与 docs/api-contract.md 第 1 节保持一致。"""
    return jsonify({
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }), status_code


def parse_json_body():
    """解析请求体；非 JSON 或格式错误时返回 None，由路由统一处理。"""
    return request.get_json(silent=True)


def is_valid_mood(value):
    """情绪值必须是 1～5 的整数；布尔值在 Python 中属于 int，需要排除。"""
    return (
        not isinstance(value, bool)
        and isinstance(value, int)
        and 1 <= value <= 5
    )


# ---------------------------------------------------------------------------
# 基础检查路由
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "StarMate Backend Running!"})


@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({
        "success": True,
        "data": {"message": "API connection successful!"}
    })


# ---------------------------------------------------------------------------
# 伙伴相关接口
# ---------------------------------------------------------------------------

@app.route("/api/companion", methods=["GET"])
def get_companion():
    companion = load_json("companion.json")

    # 接口约定 3.2：尚未创建伙伴时返回 data: null，不伪造默认伙伴
    if not isinstance(companion, dict):
        return jsonify({"success": True, "data": None}), 200

    return jsonify({"success": True, "data": companion}), 200


@app.route("/api/companion", methods=["PUT"])
def update_companion():
    new_data = parse_json_body()

    if not isinstance(new_data, dict) or not new_data:
        return error_response(
            "INVALID_DATA",
            "请求数据不能为空，且必须是 JSON 对象",
            400
        )

    companion = load_json("companion.json")

    if not isinstance(companion, dict):
        return error_response(
            "COMPANION_NOT_FOUND",
            "伙伴信息不存在，请先生成伙伴",
            404
        )

    # level、exp 由成长系统维护，不允许前端通过此接口修改
    # 外貌走预设形象库，前端只传 avatar_id；appearance/旧 avatar 字段已废弃
    allowed_fields = [
        "name",
        "personality",
        "speaking_style",
        "companion_style",
        "avatar_id",
        "room"
    ]

    for key in new_data:
        if key not in allowed_fields:
            return error_response(
                "INVALID_FIELD",
                "包含不允许修改的字段：" + key,
                400
            )

    companion.update(new_data)
    save_json("companion.json", companion)

    return jsonify({
        "success": True,
        "data": {"saved": True}
    }), 200


@app.route("/api/companion/generate", methods=["POST"])
def create_companion():
    data = parse_json_body()

    if not isinstance(data, dict):
        return error_response(
            "INVALID_DATA",
            "请求数据必须是 JSON 对象",
            400
        )

    name = data.get("name")
    description = data.get("description")

    if not isinstance(name, str) or not name.strip():
        return error_response(
            "INVALID_ARGUMENT",
            "name 不能为空",
            400
        )

    if not isinstance(description, str) or not description.strip():
        return error_response(
            "INVALID_DATA",
            "伙伴描述不能为空",
            400
        )

    # 调用 B 提供的人设生成函数：名字用户填写，AI 只整理性格/风格三字段
    # avatar_id 不在此接口处理，由前端随后通过 PUT /api/companion 保存
    generated_data = generate_companion(name.strip(), description.strip())

    required_fields = [
        "name",
        "personality",
        "speaking_style",
        "companion_style"
    ]

    if not isinstance(generated_data, dict) or not all(
        field in generated_data for field in required_fields
    ):
        return error_response(
            "INVALID_GENERATED_DATA",
            "伙伴生成结果格式错误",
            502
        )

    # 保留已有的头像、房间、等级和经验值，只更新文字人设字段
    companion = load_json("companion.json")

    # 只有"之前根本没有伙伴"的这一次才算首次创建，改人设不算
    is_new_companion = not isinstance(companion, dict)

    if is_new_companion:
        companion = {
            "avatar_id": "",
            "room": "default",
            "level": 1,
            "exp": 0
        }

    companion.update(generated_data)

    if is_new_companion:
        grant_companion_created_bonus(companion)

    save_json("companion.json", companion)

    return jsonify({
        "success": True,
        "data": generated_data
    }), 200


# ---------------------------------------------------------------------------
# AI 聊天接口
# ---------------------------------------------------------------------------

@app.route("/api/chat", methods=["POST"])
def chat():
    data = parse_json_body()

    if not isinstance(data, dict):
        return error_response(
            "INVALID_DATA",
            "请求数据必须是 JSON 对象",
            400
        )

    message = data.get("message")

    if not isinstance(message, str) or not message.strip():
        return error_response(
            "INVALID_ARGUMENT",
            "message 不能为空",
            400
        )

    mode = data.get("mode")

    if mode not in ["focus", "entertainment"]:
        return error_response(
            "INVALID_ARGUMENT",
            "mode 只能是 focus 或 entertainment",
            400
        )

    task = data.get("task")

    if task is not None and not isinstance(task, str):
        return error_response(
            "INVALID_ARGUMENT",
            "task 必须是字符串或 null",
            400
        )

    mood = data.get("mood")

    if mood is not None and not is_valid_mood(mood):
        return error_response(
            "INVALID_ARGUMENT",
            "mood 必须是 1 到 5 的整数或 null",
            400
        )

    companion = load_json("companion.json")
    history = load_json("chat_history.json", [])

    if not isinstance(history, list):
        history = []

    memory = load_json("memory.json", {})

    if not isinstance(memory, dict):
        memory = {}

    try:
        result = chat_with_companion(
            message=message.strip(),
            mode=mode,
            task=task,
            mood=mood,
            companion=companion,
            history=history,
            memory=memory
        )
    except ChatInputError as exc:
        return error_response("INVALID_ARGUMENT", str(exc), 400)
    except ChatContextError as exc:
        return error_response("INTERNAL_ERROR", str(exc), 500)
    except (ChatFormatError, LLMServiceError) as exc:
        return error_response("AI_SERVICE_ERROR", str(exc), 502)

    reply = result["reply"]

    history.append({"role": "user", "content": message.strip()})
    history.append({"role": "assistant", "content": reply})

    # 只保留最近 10 轮，避免上下文文件无限增大
    history = history[-10:]
    save_json("chat_history.json", history)

    # 由 D 合并 B 给出的 memory_update，recent_sessions 不在此处更新
    updated_memory = merge_memory_update(memory, result.get("memory_update"))
    save_json("memory.json", updated_memory)

    # 只向 A 返回 reply，memory_update 不暴露给前端
    return jsonify({
        "success": True,
        "data": {"reply": reply}
    }), 200


# ---------------------------------------------------------------------------
# 专注记录接口
# ---------------------------------------------------------------------------

@app.route("/api/focus/session", methods=["POST"])
def create_session():
    data = parse_json_body()

    if not isinstance(data, dict):
        return error_response(
            "INVALID_DATA",
            "请求数据必须是 JSON 对象",
            400
        )

    required_fields = [
        "task",
        "planned_minutes",
        "actual_minutes",
        "completed",
        "started_at",
        "mood_before",
        "mood_after"
    ]

    for field in required_fields:
        if field not in data:
            return error_response(
                "INVALID_ARGUMENT",
                "缺少必填字段：" + field,
                400
            )

    if not isinstance(data["task"], str) or not data["task"].strip():
        return error_response(
            "INVALID_ARGUMENT",
            "task 必须是非空字符串",
            400
        )

    for field in ["planned_minutes", "actual_minutes"]:
        value = data[field]
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or value < 0
        ):
            return error_response(
                "INVALID_ARGUMENT",
                field + " 必须是非负数字",
                400
            )

    if not isinstance(data["completed"], bool):
        return error_response(
            "INVALID_ARGUMENT",
            "completed 必须是布尔值",
            400
        )

    for field in ["mood_before", "mood_after"]:
        value = data[field]
        if value is not None and not is_valid_mood(value):
            return error_response(
                "INVALID_ARGUMENT",
                field + " 必须是 1 到 5 的整数或 null",
                400
            )

    if not isinstance(data["started_at"], str):
        return error_response(
            "INVALID_ARGUMENT",
            "started_at 必须是 ISO 8601 字符串",
            400
        )

    try:
        datetime.fromisoformat(data["started_at"].replace("Z", "+00:00"))
    except ValueError:
        return error_response(
            "INVALID_ARGUMENT",
            "started_at 时间格式错误",
            400
        )

    session = create_focus_session(data)

    history = load_json("history.json", [])

    if not isinstance(history, list):
        history = []

    history.append(session)
    save_json("history.json", history)

    # recent_sessions 由后端维护：新→旧、最多 3 条，B 直接取前 3 条即可
    memory = load_json("memory.json", {})
    memory = update_recent_sessions(memory, session)
    save_json("memory.json", memory)

    return jsonify({
        "success": True,
        "data": {
            "session_id": session["session_id"],
            "saved": True
        }
    }), 201


@app.route("/api/focus/history", methods=["GET"])
def get_focus_history():
    history = load_json("history.json", [])

    if not isinstance(history, list):
        history = []

    return jsonify({
        "success": True,
        "data": {"sessions": history}
    }), 200


@app.route("/api/focus/diary", methods=["POST"])
def create_diary():
    data = parse_json_body()

    if not isinstance(data, dict):
        return error_response(
            "INVALID_DATA",
            "请求数据必须是 JSON 对象",
            400
        )

    session_id = data.get("session_id")

    if not isinstance(session_id, str) or not session_id.strip():
        return error_response(
            "INVALID_ARGUMENT",
            "session_id 必须是非空字符串",
            400
        )

    history = load_json("history.json", [])

    if not isinstance(history, list):
        history = []

    session = None

    for item in history:
        if isinstance(item, dict) and item.get("session_id") == session_id:
            session = item
            break

    if session is None:
        return error_response(
            "SESSION_NOT_FOUND",
            "专注记录不存在",
            404
        )

    diaries = load_json("diary.json", [])

    if not isinstance(diaries, list):
        diaries = []

    # 同一 session 重复请求时直接返回已生成的日记，不重复调用 AI
    for diary in diaries:
        if isinstance(diary, dict) and diary.get("session_id") == session_id:
            return jsonify({
                "success": True,
                "data": {
                    "diary_id": diary["diary_id"],
                    "content": diary["content"],
                    "created_at": diary["created_at"]
                }
            }), 200

    companion = load_json("companion.json")

    try:
        content = generate_diary(session, companion)
    except Exception:
        return error_response(
            "AI_SERVICE_ERROR",
            "日记生成服务暂时不可用",
            502
        )

    if not isinstance(content, str) or not content.strip():
        return error_response(
            "AI_SERVICE_ERROR",
            "日记生成失败",
            502
        )

    diary = {
        "diary_id": "diary_" + uuid.uuid4().hex[:8],
        "session_id": session_id,
        "content": content,
        "created_at": datetime.now().astimezone().isoformat()
    }

    diaries.append(diary)
    save_json("diary.json", diaries)

    return jsonify({
        "success": True,
        "data": {
            "diary_id": diary["diary_id"],
            "content": diary["content"],
            "created_at": diary["created_at"]
        }
    }), 201


# ---------------------------------------------------------------------------
# 情绪接口
# ---------------------------------------------------------------------------

@app.route("/api/mood", methods=["POST"])
def create_mood():
    data = parse_json_body()

    if not isinstance(data, dict):
        return error_response(
            "INVALID_DATA",
            "请求数据必须是 JSON 对象",
            400
        )

    required_fields = ["session_id", "stage", "mood"]

    for field in required_fields:
        if field not in data:
            return error_response(
                "INVALID_ARGUMENT",
                "缺少必填字段：" + field,
                400
            )

    if not isinstance(data["session_id"], str) or not data["session_id"].strip():
        return error_response(
            "INVALID_ARGUMENT",
            "session_id 必须是非空字符串",
            400
        )

    if data["stage"] not in ["before", "after"]:
        return error_response(
            "INVALID_ARGUMENT",
            "stage 只能是 before 或 after",
            400
        )

    if not is_valid_mood(data["mood"]):
        return error_response(
            "INVALID_ARGUMENT",
            "mood 必须是 1 到 5 的整数",
            400
        )

    history = load_json("history.json", [])

    if not isinstance(history, list):
        history = []

    if not any(
        isinstance(session, dict)
        and session.get("session_id") == data["session_id"]
        for session in history
    ):
        return error_response(
            "SESSION_NOT_FOUND",
            "专注记录不存在",
            404
        )

    mood_record = save_mood(data)

    moods = load_json("mood.json", [])

    if not isinstance(moods, list):
        moods = []

    moods.append(mood_record)
    save_json("mood.json", moods)

    return jsonify({
        "success": True,
        "data": {"saved": True}
    }), 200


# ---------------------------------------------------------------------------
# 成长奖励接口
# ---------------------------------------------------------------------------

@app.route("/api/reward", methods=["GET"])
def get_reward():
    companion = load_json("companion.json")

    if not isinstance(companion, dict):
        return error_response(
            "COMPANION_NOT_FOUND",
            "伙伴信息不存在，请先生成伙伴",
            404
        )

    reward_info = get_reward_info(companion)

    return jsonify({
        "success": True,
        "data": reward_info
    }), 200


@app.route("/api/reward/claim", methods=["POST"])
def claim_reward():
    data = parse_json_body()

    if not isinstance(data, dict):
        return error_response(
            "INVALID_DATA",
            "请求数据必须是 JSON 对象",
            400
        )

    session_id = data.get("session_id")

    if not isinstance(session_id, str) or not session_id.strip():
        return error_response(
            "INVALID_ARGUMENT",
            "session_id 必须是非空字符串",
            400
        )

    history = load_json("history.json", [])
    companion = load_json("companion.json")
    claimed_sessions = load_json("claimed_sessions.json", [])

    if not isinstance(companion, dict):
        return error_response(
            "COMPANION_NOT_FOUND",
            "伙伴信息不存在，请先生成伙伴",
            404
        )

    if not isinstance(history, list):
        history = []

    if not isinstance(claimed_sessions, list):
        claimed_sessions = []

    session = None

    for item in history:
        if isinstance(item, dict) and item.get("session_id") == session_id:
            session = item
            break

    if session is None:
        return error_response(
            "SESSION_NOT_FOUND",
            "专注记录不存在",
            404
        )

    # history 用于「连续两次 +5」「每日目标 +10」的结算（规则见 reward_service）
    result = claim_session_reward(companion, session, claimed_sessions, history)

    if result is None:
        return error_response(
            "REWARD_ALREADY_CLAIMED",
            "该专注记录已经领取过奖励",
            400
        )

    save_json("companion.json", companion)
    save_json("claimed_sessions.json", claimed_sessions)

    return jsonify({
        "success": True,
        "data": result
    }), 200


# ---------------------------------------------------------------------------
# 全局异常处理：保证任何错误都返回 JSON，而不是 Flask 默认 HTML 页面
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def handle_not_found(error):
    return error_response("NOT_FOUND", "请求的资源不存在", 404)


@app.errorhandler(405)
def handle_method_not_allowed(error):
    return error_response("METHOD_NOT_ALLOWED", "请求方法不被允许", 405)


@app.errorhandler(500)
def handle_internal_error(error):
    return error_response("INTERNAL_ERROR", "服务器内部错误", 500)


if __name__ == "__main__":
    host = os.environ.get("STAR_HOST", "127.0.0.1")
    port = int(os.environ.get("STAR_PORT", "5000"))
    app.run(debug=True, host=host, port=port)
