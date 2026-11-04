# StarMate 后端测试记录

- 最近更新：2026-11-04
- 测试方式：Flask test_client，临时数据目录隔离，不影响 `data/` 真实数据
- 后端接口测试：`python tests/test_api.py` → **46 项断言全部通过，0 失败**
- 端到端流程测试：`python tests/test_full_flow.py` → **9 步全部通过，0 失败**（mock 大模型，无需真实 Key）

## 覆盖范围

| 接口 | 正常场景 | 异常/边界场景 |
|---|---|---|
| GET `/api/test` | 服务连通 | — |
| POST `/api/companion/generate` | 生成成功，含 4 个约定字段，personality 为数组，name 原样保留 | name 缺失 400；description 空白 400；非法 JSON 400 |
| GET `/api/companion` | 生成后可读取 | 未创建时返回 200 `data: null` |
| PUT `/api/companion` | 正常更新返回 `saved: true`，可保存 avatar_id | 改 level/exp 被拒 400；空对象 400 |
| POST `/api/chat` | focus / entertainment 两种模式 | 空消息、非法 mode、越界 mood、非法 task 均 400；聊天记录落盘 |
| POST `/api/focus/session` | 返回 201 与 session_id | 缺字段、负时长、非法情绪、非法时间、非法布尔均 400 |
| GET `/api/focus/history` | 含新专注记录 | — |
| POST `/api/mood` | before / after 均可保存 | 非法 stage、越界 mood 400；session 不存在 404 |
| POST `/api/focus/diary` | 首次生成 201 | 重复请求 200 返回同一篇；session 不存在 404 |
| GET `/api/reward` | 返回 level/exp/next_level_exp | — |
| POST `/api/reward/claim` | 完成 25 分钟 +10 EXP | 重复领取 400；session 不存在 404；未完成短专注 earned_exp=0 |
| 全局错误处理 | — | 未知路径 JSON 404；不支持方法 JSON 405 |

## 真实大模型联调（已完成）

配置真实 `DEEPSEEK_API_KEY` 后通过实际 HTTP 请求验证：

- 人设生成：返回 name + personality/speaking_style/companion_style，字段正确；
- AI 聊天：focus、entertainment 模式均返回自然、连贯的真实回复；
- 陪伴日记：真实生成，且准确引用本次专注时长与情绪变化数据；
- 异常分支：未配置 Key 时返回 502 并给出明确提示；模型偶发空回复会被识别为错误，重试即恢复。

## 奖励规则（均已实现并测试）

- 完成 25 分钟专注：+10 EXP
- 连续两次专注：额外 +5 EXP
- 每日首次完成目标：+10 EXP
- 首次创建伙伴：+5 EXP（仅一次）
- level/exp 由后端计算，前端不可改；同一 session 奖励仅结算一次。

## 人工冒烟验证

实际执行 `python app.py` 启动服务后：

- `GET /api/test` → 200，连接成功；
- 后台启动方式（run.bat / 隐藏进程）也能正确加载 `.env` 并读取 Key。

## 备注

- `data/` 已改为运行时数据，不再纳入 Git 跟踪，仅保留 `.gitkeep` 占位；测试在独立临时目录运行。
- 待完成：前端预设形象库素材合并后，进行带界面的完整联调。
