
import uuid


def create_focus_session(data):
    session = {
        "session_id": "session_" + uuid.uuid4().hex[:8],
        "task": data["task"],
        "planned_minutes": data["planned_minutes"],
        "actual_minutes": data["actual_minutes"],
        "completed": data["completed"],
        "started_at": data["started_at"],
        "mood_before": data["mood_before"],
        "mood_after": data["mood_after"]
    }

    return session
