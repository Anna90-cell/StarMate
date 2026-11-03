# StarMate「伴星」AI 数字伙伴 — 后端

你的专属 AI 数字伙伴：融合 AI 角色定制、专注陪伴、情绪反馈、成长系统与陪伴日记。
本仓库为成员 D 负责的 Flask 后端，对 A（前端）、B（AI）、C（番茄钟/成长）提供统一 API。

## 1. 环境要求

- Python 3.10 及以上
- Windows / macOS / Linux 均可

## 2. 安装与启动

```bash
# 进入项目目录
cd StarMate

# 创建并激活虚拟环境
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# （可选）配置环境变量
copy .env.example .env        # macOS/Linux: cp .env.example .env

# 启动后端
python app.py
```

启动后访问 `http://127.0.0.1:5000/`，看到 `StarMate Backend Running!` 即成功。
前端统一请求基地址：`http://127.0.0.1:5000`。

### 局域网演示（让其他电脑访问）

启动前设置环境变量 `STAR_HOST=0.0.0.0`，其他电脑通过 `http://本机IP:5000` 访问。

## 3. 运行测试

```bash
.venv\Scripts\python.exe tests\test_api.py
```

测试在独立临时数据目录中运行，不污染 `data/` 真实数据；当前共 41 项断言，全部通过。
测试结果记录见 `docs/test-report.md`。

## 4. 目录结构

```text
StarMate/
├── app.py                  # Flask 入口与全部路由
├── requirements.txt        # 依赖清单
├── .env.example            # 环境变量模板（.env 不提交）
├── data/                   # JSON 数据存储（运行后自动生成/更新）
│   ├── companion.json      # 伙伴信息、level、exp
│   ├── history.json        # 专注记录
│   ├── mood.json           # 情绪反馈
│   ├── diary.json          # 陪伴日记
│   ├── chat_history.json   # 最近聊天上下文
│   ├── memory.json         # 轻量记忆
│   └── claimed_sessions.json  # 已领取奖励的 session，防重复领取
├── services/               # 业务逻辑层
│   ├── storage.py          # JSON 读写（原子写入、损坏容错）
│   ├── companion_service.py # 人设生成（当前 Mock，待 B 替换）
│   ├── chat_service.py     # AI 对话（当前 Mock，待 B 替换）
│   ├── diary_service.py    # 日记生成（当前 Mock，待 B 替换）
│   ├── focus_service.py    # 专注记录组装
│   ├── mood_service.py     # 情绪记录组装
│   └── reward_service.py   # EXP 与等级计算
├── tests/
│   └── test_api.py         # 完整接口测试
└── docs/
    ├── api-contract.md     # 接口约定（团队唯一事实来源）
    └── test-report.md      # 测试记录
```

## 5. 接口总表

| 接口 | 方法 | 用途 |
|---|---|---|
| `/api/companion/generate` | POST | 根据描述生成伙伴人设 |
| `/api/companion` | GET | 获取伙伴信息（未创建时 `data: null`） |
| `/api/companion` | PUT | 保存/更新伙伴资料（不可改 level、exp） |
| `/api/chat` | POST | AI 对话（focus / entertainment） |
| `/api/focus/session` | POST | 保存一次专注记录 |
| `/api/focus/history` | GET | 获取专注历史 |
| `/api/focus/diary` | POST | 生成陪伴日记（重复请求返回同一篇） |
| `/api/mood` | POST | 保存情绪反馈 |
| `/api/reward` | GET | 获取经验值与等级 |
| `/api/reward/claim` | POST | 结算专注奖励（同一 session 仅可领一次） |

统一响应：成功 `{"success": true, "data": {...}}`；
失败 `{"success": false, "error": {"code": "...", "message": "..."}}`。
字段、状态码与数据类型的完整约定见 `docs/api-contract.md`。

## 6. 当前状态与联调说明

- 全部 10 个接口已按 `api-contract.md` 实现并通过测试，可直接与 A、C 联调。
- `companion_service.py`、`chat_service.py`、`diary_service.py` 目前为 Mock，
  函数签名与返回字段已对齐契约；B 接入真实 AI 时直接替换函数体即可，无需改动路由。
- 已实现的后端保护：请求体/字段/类型校验、`level`/`exp` 防篡改、
  奖励防重复领取、JSON 文件原子写入与损坏容错、AI 异常返回 502、全局 JSON 错误处理。
- 待与团队确认：奖励规则中「连续专注 +5」「每日目标 +10」「首次创建 +5」的触发时机，
  确认后在 `reward_service.py` 中扩展，不影响现有接口结构。
