
def save_mood(data):
    mood_record = {
        "session_id": data["session_id"],
        "stage": data["stage"],
        "mood": data["mood"]
    }

    return mood_record
