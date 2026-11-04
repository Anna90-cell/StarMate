import json
import os
import tempfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")


class StorageError(Exception):
    """数据读写失败时抛出，由上层统一转换为 500 响应。"""


def load_json(filename, default=None):
    file_path = os.path.join(DATA_DIR, filename)

    if not os.path.exists(file_path):
        return default

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, OSError):
        # 文件损坏或无法读取时返回默认值，避免单个文件拖垮整个服务
        return default


def save_json(filename, data):
    os.makedirs(DATA_DIR, exist_ok=True)

    file_path = os.path.join(DATA_DIR, filename)

    # 先写入临时文件再原子替换，防止写入中途崩溃导致 JSON 文件损坏
    fd, temp_path = tempfile.mkstemp(
        dir=DATA_DIR,
        prefix=filename + ".",
        suffix=".tmp"
    )

    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
            file.flush()
            os.fsync(file.fileno())

        os.replace(temp_path, file_path)
    except OSError as exc:
        try:
            os.remove(temp_path)
        except OSError:
            pass
        raise StorageError("写入数据失败：" + filename) from exc

    return True
