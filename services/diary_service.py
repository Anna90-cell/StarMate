def generate_diary(session, companion=None):
    """
    Mock 日记生成函数，只使用专注记录中已提供的字段，不编造任务完成情况。
    B 接入真实 AI 后保持相同签名替换即可。
    """
    task = session.get("task", "本次任务")
    actual_minutes = session.get("actual_minutes", 0)
    completed = session.get("completed", False)

    if completed:
        result_text = "顺利完成了"
    else:
        result_text = "暂时没有完成，但坚持专注了"

    return (
        "今天的任务是“" + task + "”，你" + result_text
        + str(actual_minutes) + " 分钟。每一次专注都在让你变得更好，我会一直陪着你。"
    )
