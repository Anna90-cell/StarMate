# StarMate 后端接口测试记录

- 测试时间：2026-11-03
- 测试方式：Flask test_client，临时数据目录隔离，不影响 `data/` 真实数据
- 执行命令：`.venv\Scripts\python.exe tests\test_api.py`
- 结果：**41 项断言全部通过，0 失败**

## 覆盖范围

| 接口 | 正常场景 | 异常/边界场景 |
|---|---|---|
| GET `/api/test` | 服务连通 | — |
| POST `/api/companion/generate` | 生成成功，含 5 个约定字段，personality 为数组 | description 空白 400；非法 JSON 400 |
| GET `/api/companion` | 生成后可读取 | 未创建时返回 200 `data: null` |
| PUT `/api/companion` | 正常更新返回 `saved: true` | 改 level/exp 被拒 400；空对象 400 |
| POST `/api/chat` | focus / entertainment 两种模式 | 空消息、非法 mode、越界 mood、非法 task 均 400；聊天记录落盘 |
| POST `/api/focus/session` | 返回 201 与 session_id | 缺字段、负时长、非法情绪、非法时间、非法布尔均 400 |
| GET `/api/focus/history` | 含新专注记录 | — |
| POST `/api/mood` | before / after 均可保存 | 非法 stage、越界 mood 400；session 不存在 404 |
| POST `/api/focus/diary` | 首次生成 201 | 重复请求 200 返回同一篇；session 不存在 404 |
| GET `/api/reward` | 返回 level/exp/next_level_exp | — |
| POST `/api/reward/claim` | 完成 25 分钟 +10 EXP | 重复领取 400；session 不存在 404；未完成短专注 earned_exp=0 |
| 全局错误处理 | — | 未知路径 JSON 404；不支持方法 JSON 405 |

## 另外的人工冒烟验证

实际执行 `python app.py` 启动服务后，用 HTTP 请求验证：

- `GET /api/test` → 200，连接成功
- `GET /api/reward`（读取现有真实数据）→ `{level: 1, exp: 10, next_level_exp: 30}`
- `GET /api/companion` → 正常返回现有伙伴「星星」

## 未覆盖/待确认项

1. 真实 AI 调用路径尚未测试（B 的模块未接入，当前为 Mock）；接入后需复测 502 异常分支。
2. 「连续专注 +5」「每日目标 +10」「首次创建伙伴 +5」奖励规则待 C、D 确认触发时机后再补测试。
