"""StarMate 应用入口。

负责初始化 Flask 应用、注册各功能模块的路由。
各成员的功能模块完成后，在这里统一挂载蓝图（Blueprint）。
"""
import os

from flask import Flask, jsonify
from dotenv import load_dotenv

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/api/health")
    def health_check():
        """健康检查接口，用于确认后端服务是否正常运行。"""
        return jsonify({"status": "ok", "message": "StarMate backend is running"})

    # TODO(D): 在此注册 AI、番茄钟、情绪、成长系统等蓝图
    # app.register_blueprint(xxx_bp, url_prefix="/api/...")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
