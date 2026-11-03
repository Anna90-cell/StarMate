"""陪伴人设/对话编排服务（初始骨架）。

负责把桌宠人设、记忆、情绪等信息组装成提示词，
再调用 llm_service 完成对话。具体逻辑随各模块集成后补充。
"""
from services.llm_service import chat


def talk(user_id: str, user_message: str) -> str:
    """根据用户输入生成桌宠回复。

    :param user_id: 用户标识，用于区分不同用户的记忆数据
    :param user_message: 用户输入的文本
    :return: 桌宠的回复
    """
    # TODO: 接入人设提示词、历史记忆、情绪状态
    messages = [
        {"role": "system", "content": "你是 StarMate，一个温暖的桌面陪伴伙伴。"},
        {"role": "user", "content": user_message},
    ]
    return chat(messages)
