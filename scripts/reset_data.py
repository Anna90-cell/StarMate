# -*- coding: utf-8 -*-
"""
清空 data/ 中的运行数据，用于演示前恢复干净状态。
为防止误操作，必须显式加 --yes 才执行；执行前会自动先备份。
运行：.venv\\Scripts\\python.exe scripts\\reset_data.py --yes
"""
import os
import sys
import shutil
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")


def main():
    if "--yes" not in sys.argv:
        print("这是破坏性操作，确认执行请加 --yes 参数")
        return

    if not os.path.isdir(DATA_DIR):
        print("data/ 目录不存在，无需重置")
        return

    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    shutil.copytree(DATA_DIR, os.path.join(BACKUP_DIR, "before_reset_" + stamp))

    shutil.rmtree(DATA_DIR)
    os.makedirs(DATA_DIR, exist_ok=True)

    print("已重置 data/，重置前数据已备份到 backups/")


if __name__ == "__main__":
    main()
