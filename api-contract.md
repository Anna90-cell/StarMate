# StarMate 接口约定（API Contract）

前后端统一按本文档对接，接口有变更时先改本文档再写代码。

- 基础地址：`http://localhost:5000`
- 所有接口返回 JSON，统一响应格式：

```json
{ "code": 0, "message": "success", "data": {} }
```

## 1. 健康检查

- `GET /api/health`
- 响应：`{ "status": "ok", "message": "StarMate backend is running" }`

## 2. AI 对话（成员 B）

- `POST /api/chat`
- 请求体：

```json
{ "user_id": "u001", "message": "今天有点累" }
```

- 响应 data：`{ "reply": "辛苦啦，要不要休息一下？" }`

## 3. 番茄钟（成员 C）

- `POST /api/focus/start`：开始一个番茄钟
- `POST /api/focus/stop`：结束当前番茄钟
- `GET /api/focus/status?user_id=u001`：查询当前状态
- 请求/响应字段待补充

## 4. 情绪记录（成员 C）

- `POST /api/mood`：提交情绪记录
- `GET /api/mood?user_id=u001`：查询历史情绪

## 5. 成长系统（成员 C）

- `GET /api/growth?user_id=u001`：查询等级、经验值、成就

> 备注：以上为初始约定，具体字段和状态码由各负责人在开发中补全并同步更新本文档。
