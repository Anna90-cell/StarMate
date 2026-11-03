# -*- coding: utf-8 -*-
"""
备份 data/ 目录到 backups/ 下，文件名带时间戳。
演示前和联调出现异常数据时各跑一次，方便回滚。
运行：.venv\\Scripts\\python.exe scripts\\backup_data.py
"""
import os
import shutil
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")


def main():
    if not os.path.isdir(DATA_DIR):
        print("data/ 目录不存在，无需备份")
        return

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = os.path.join(BACKUP_DIR, "data_" + stamp)

    os.makedirs(BACKUP_DIR, exist_ok=True)
    shutil.copytree(DATA_DIR, target)

    print("备份完成：" + target)


if __name__ == "__main__":
    main()
