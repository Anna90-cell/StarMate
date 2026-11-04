# StarMate「伴星」AI 数字伙伴

你的专属 AI 数字伙伴：融合 AI 角色定制、专注陪伴、情绪反馈、成长系统与陪伴日记。
项目采用 Flask + DeepSeek + JSON 文件存储，由四人协作开发。

## 功能特性

- **AI 角色定制**：用户自己填写名字，AI 根据描述整理性格、说话风格、陪伴方式；外貌从 5 款预设形象库中选择。
- **AI 聊天**：支持专注（focus）与娱乐（entertainment）两种模式，带轻量记忆与多轮上下文（保留最近 10 条消息）。
- **番茄钟专注**：记录每次专注任务、计划/实际时长、完成情况与情绪。
- **情绪反馈**：专注前后各一次五档情绪自评，允许为空。
- **成长系统**：按规则结算经验值与等级，前端无法篡改。
- **陪伴日记**：专注结束后由 AI 生成一篇连贯的日记，引用本次专注与情绪数据。
- **桌宠状态**：娱乐空间可在待机／学习／开心／休息／睡觉五种状态间切换，每种状态对应独立立绘，状态保存在后端，换设备或刷新后自动恢复。

## 技术栈

- 后端：Python 3.10+、Flask 3.1、Flask-CORS
- 大模型：DeepSeek（deepseek-chat），统一通过 `services/llm_service.py` 调用
- 存储：本地 JSON 文件，原子写入、损坏容错
- 配置：python-dotenv 加载 `.env`，API Key 只从环境变量读取，不写进代码
- 前端：原生 HTML / CSS / JavaScript，无构建步骤，由 Flask 直接托管

## 安装与启动

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

# 配置环境变量（复制模板后填入真实 Key）
copy .env.example .env        # macOS/Linux: cp .env.example .env

# 启动服务（后端 + 前端页面）
python app.py
```

- 打开 `http://127.0.0.1:5000` 即为应用首页，前后端同源、只占用一个端口。
- 健康检查：`http://127.0.0.1:5000/api/test` 返回成功即服务运行正常。
- 也可直接双击 `run.bat`（Windows）或运行 `run.sh`（macOS / Linux）一键建环境并启动。
- 未配置 `DEEPSEEK_API_KEY` 时，非 AI 接口仍可正常使用，AI 相关接口会返回 502。

### 局域网演示（让其他电脑访问）

在 `.env` 中设置 `STAR_HOST=0.0.0.0`，其他电脑通过 `http://本机IP:5000` 访问。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | 是 | 无 | DeepSeek 密钥，只放后端，禁止写进前端 |
| `DEEPSEEK_BASE_URL` | 否 | `https://api.deepseek.com` | 接口地址 |
| `DEEPSEEK_MODEL` | 否 | `deepseek-chat` | 模型名称 |
| `STAR_HOST` | 否 | `127.0.0.1` | 监听地址 |
| `STAR_PORT` | 否 | `5000` | 监听端口 |

`.env` 已在 `.gitignore` 中，不会被提交。

## 运行测试

```bash
# 后端接口测试（独立临时数据目录，不污染真实数据）
python tests/test_api.py

# 端到端完整流程测试（mock 大模型，无需真实 Key）
python tests/test_full_flow.py
```

两个测试都不调用真实大模型，没有 API Key 也能跑。当前 `test_api.py` 共 **49 项断言全部通过**，
`test_full_flow.py` 共 **9 步全部通过**。也可在浏览器打开 `tests/backend_check.html` 进行接口点测。

> 根目录的 `test_storage.py` 是存储层的手动验证脚本，会写入真实 `data/companion.json`，
> 不属于上面两个测试套件，日常请勿随意执行。

## 目录结构

```text
StarMate/
├── app.py                      # Flask 入口、全部路由与前端静态托管
├── requirements.txt            # 依赖清单
├── .env.example                # 环境变量模板（.env 不提交）
├── run.bat / run.sh            # 一键启动脚本
├── test_storage.py             # 存储层手动验证脚本（会写真实 data/）
├── data/                       # JSON 数据存储（运行后自动生成，内容不入库）
├── frontend/                   # 前端页面、样式、脚本与形象素材
│   ├── index.html              # 首页
│   ├── create.html             # 创建伙伴
│   ├── companion.html          # 我的伙伴
│   ├── focus.html              # 专注空间
│   ├── entertainment.html      # 娱乐空间
│   ├── css/                    # 样式文件
│   ├── js/
│   │   ├── companion-store.js  # 伙伴数据统一入口（后端优先 + 离线兜底）
│   │   ├── api.js / c-api.js   # 请求封装
│   │   ├── create.js           # 创建伙伴页逻辑
│   │   ├── companion.js        # 伙伴主页逻辑
│   │   ├── index.js            # 首页逻辑
│   │   ├── scene.js            # 专注空间场景初始化
│   │   ├── focus*.js           # 番茄钟计时与流程
│   │   ├── mood.js             # 情绪自评组件
│   │   ├── growth.js           # 等级与经验展示
│   │   └── entertainment.js    # 娱乐空间与桌宠状态
│   └── assets/characters/      # 5 款预设形象 + 5 种状态立绘
├── services/                   # 业务逻辑层
│   ├── storage.py              # JSON 读写（原子写入、损坏容错）
│   ├── llm_service.py          # DeepSeek 唯一调用模块与异常分级
│   ├── companion_service.py    # 人设生成（混合模式，AI 整理三字段）
│   ├── chat_service.py         # AI 聊天编排与校验
│   ├── memory_service.py       # 记忆合并与 recent_sessions 维护
│   ├── memory_service_ai.py    # 记忆清洗与上下文拼装
│   ├── diary_service.py        # 陪伴日记生成
│   ├── focus_service.py        # 专注记录组装
│   ├── mood_service.py         # 情绪记录组装
│   └── reward_service.py       # EXP 与等级计算
├── scripts/
│   ├── backup_data.py          # 数据备份到 backups/
│   └── reset_data.py           # 数据重置（需 --yes，执行前自动备份）
├── tests/
│   ├── test_api.py             # 接口测试
│   ├── test_full_flow.py       # 端到端测试
│   └── backend_check.html      # 接口自测页
└── docs/
    ├── api-contract.md         # 接口约定（团队唯一事实来源）
    ├── demo-script.md          # 演示脚本
    └── test-report.md          # 测试记录
```

## 接口总表

| 接口 | 方法 | 用途 |
|---|---|---|
| `/api/test` | GET | 连通性检查 |
| `/api/companion/generate` | POST | 接收 `{name, description}`，AI 整理文字人设 |
| `/api/companion` | GET | 获取伙伴信息（未创建时 `data: null`） |
| `/api/companion` | PUT | 保存文字人设、`avatar_id`、`room` 与 `pet_state`（不可改 level、exp） |
| `/api/chat` | POST | AI 对话（focus / entertainment，可带 `task`、`mood`、`task_list`） |
| `/api/focus/session` | POST | 保存一次专注记录 |
| `/api/focus/history` | GET | 获取专注历史（旧到新） |
| `/api/focus/diary` | POST | 生成陪伴日记（重复请求返回同一篇） |
| `/api/mood` | POST | 保存情绪反馈 |
| `/api/reward` | GET | 获取经验值与等级 |
| `/api/reward/claim` | POST | 结算专注奖励（同一 session 仅可领一次） |

统一响应：成功 `{"success": true, "data": {...}}`；
失败 `{"success": false, "error": {"code": "...", "message": "..."}}`。
404、405、500 也统一返回 JSON，不会返回 Flask 默认 HTML 页面。
字段、状态码与数据类型的完整约定见 `docs/api-contract.md`。

## 前端数据流

所有页面的伙伴数据（名字、`avatar_id`、房间背景 `room`、桌宠状态 `pet_state`）
统一由 `frontend/js/companion-store.js` 读写，规则如下：

1. 读取一律走 `GET /api/companion`，后端是唯一数据源；
2. 修改先 `PUT /api/companion` 落盘，成功后再更新本地缓存；
3. `localStorage` 只在后端请求失败时作为离线兜底展示，不参与数据判定。

因此清空浏览器缓存或换一台电脑演示时，伙伴形象、名字、背景与桌宠状态都能完整恢复。

## 人设生成流程（混合模式）

1. 前端收集用户填写的 `name` 和一个自由描述框，调用 `POST /api/companion/generate`；
2. 名字以用户填写为准，AI 只整理 `personality`、`speaking_style`、`companion_style` 三个字段，不取名、不生成外貌；
3. 用户从预设形象库选择形象与房间背景，前端通过 `PUT /api/companion` 保存 `avatar_id` 与 `room`；
4. `GET /api/companion` 返回这些字段，前端据此加载 `frontend/assets/characters/` 下对应的 PNG 与桌宠状态立绘。

## 奖励规则

- 完成一次专注（`completed` 为真且实际时长 ≥ 25 分钟）：+10 EXP
- 连续两次专注：额外 +5 EXP
- 每日首次完成专注：+10 EXP
- 首次创建伙伴：+5 EXP（仅一次）
- 等级阈值：Lv.1 = 0、Lv.2 = 30、Lv.3 = 70、Lv.4 = 120 EXP
- `level`、`exp` 由后端计算，前端不可修改；同一 session 奖励只结算一次。

## 工程实现要点

- 全部 11 个接口（含 `/api/test`）均已实现并通过测试，AI 模块接入真实大模型，无 Mock 残留。
- 前端 5 个功能页面与预设形象库素材（5 款形象 × 5 种状态，共 25 张立绘）齐备；
  Flask 以 `frontend/` 为站点根目录托管页面，前后端同源、单端口运行。
- 伙伴数据以后端为唯一数据源，`localStorage` 仅作离线兜底，换设备可完整恢复。
- 后端保护：请求体／字段／类型校验、`pet_state` 取值白名单、`level`/`exp` 防篡改、
  奖励防重复领取、JSON 原子写入与损坏容错、AI 异常分级、全局 JSON 错误处理。
- 数据运维：`scripts/backup_data.py` 一键备份，`scripts/reset_data.py --yes` 重置前自动备份。

## 成员分工

- A：前端页面、样式与预设形象库
- B：DeepSeek 接入、人设/聊天/记忆/日记的 AI 逻辑
- C：番茄钟、情绪与成长奖励
- D：Flask 后端、JSON 存储与最终集成
