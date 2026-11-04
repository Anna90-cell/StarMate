# StarMate API 接口约定（第一版）

> 用途：第一天下午先统一 A（前端）、B（AI）、C（番茄钟/情绪/成长）和
> D（Flask 后端）之间的数据格式。\
> 当前版本优先保证大家能并行开发；AI 尚未接好时，后端可以先返回
> Mock（模拟）数据。\
> **约定状态：待团队确认。**
> 请四位成员确认后再开始按此版本开发；有修改只改这一份文档。

## 0. 全体成员先遵守的规则

1.  前端统一请求后端地址：`http://127.0.0.1:5000`（本机开发时）。
2.  所有请求和响应的数据格式均为 JSON。
3.  请求体使用 `Content-Type: application/json`。
4.  成功响应统一包含 `success: true`；失败响应统一包含 `success: false`
    和 `error`。
5.  时间统一使用 ISO 8601 字符串，例如：`2026-11-02T15:30:00+08:00`。
6.  情绪值统一为整数
    `1～5`：1=非常低落，2=有点疲惫，3=比较平静，4=心情不错，5=非常开心。
7.  布尔值只能使用 `true` / `false`，不要用字符串 `"true"`。
8.  字段名严格按本文档拼写。不要一边用 `taskName`、另一边用 `task`。
9.  暂时使用 JSON
    文件存储；调用接口的成员不需要知道数据具体存在哪个文件。
10. API Key 只放在后端环境变量中，不能写进前端代码，也不能提交 `.env`。

## 1. 统一响应格式

### 成功

``` json
{
  "success": true,
  "data": {}
}
```

### 失败

``` json
{
  "success": false,
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "mood 必须是 1 到 5 的整数"
  }
}
```

常见 HTTP 状态码：

  状态码   含义          什么时候使用
  -------- ------------- ----------------------------------
  200      成功          查询、更新或处理成功
  201      已创建        新记录创建成功
  400      请求错误      缺字段、字段类型错误、参数超范围
  404      不存在        查询的伙伴或记录不存在
  500      服务器错误    后端内部异常
  502      AI 服务错误   大模型服务调用失败

注意：HTTP 状态码和 JSON 中的 `success` 要保持一致。

## 2. 接口总表

  接口                        方法   主要调用方    用途
  --------------------------- ------ ------------- ----------------------
  `/api/companion/generate`   POST   A → D → B     根据描述生成伙伴人设
  `/api/companion`            GET    A             获取已保存的伙伴
  `/api/companion`            PUT    A → D         保存/更新伙伴信息
  `/api/chat`                 POST   A → D → B     专注或娱乐模式聊天
  `/api/focus/session`        POST   C → D         保存一次专注记录
  `/api/focus/diary`          POST   C/A → D → B   生成并保存陪伴日记
  `/api/focus/history`        GET    A/C → D       获取专注历史
  `/api/mood`                 POST   C → D         保存情绪反馈
  `/api/reward`               GET    A/C → D       获取经验值和等级
  `/api/reward/claim`         POST   C → D         结算一次专注奖励

## 3. 各接口的详细约定

### 3.1 生成伙伴人设

`POST /api/companion/generate`

请求（混合模式：用户填名字，性格和风格写在一个描述框里）：

``` json
{
  "name": "小星",
  "description": "希望它温柔耐心，平时可以陪我聊天，学习时能鼓励我"
}
```

字段说明：

- `name`：用户自己填写的角色名字，必填，2～8 个汉字，后端原样保留、不交给 AI 改动。
- `description`：用户对性格、说话风格、陪伴方式的自由描述，必填。
- `avatar_id` 不在本接口处理；用户选择预设形象后，由前端通过 `PUT /api/companion` 保存。

成功响应：

``` json
{
  "success": true,
  "data": {
    "name": "小星",
    "personality": ["温柔", "耐心"],
    "speaking_style": "自然亲切",
    "companion_style": "学习时给予鼓励，平时可以轻松聊天"
  }
}
```

负责关系：A 收集用户填写的 name 与描述框；D 接收请求并调用 B 提供的角色生成函数；
B 负责 Prompt 和文字人设结果，只整理 `personality`、`speaking_style`、
`companion_style` 三个字段，不取名、不生成外貌。

**首次创建伙伴 +5 EXP**：如果之前还没有伙伴，这个接口在保存时会调用
`reward_service.grant_companion_created_bonus()` 给 `companion.exp` 加 5。
只是修改人设（已经有伙伴了）不会重复加。返回值只有上面 4 个文字人设字段，
avatar_id 与经验值要用 `GET /api/companion` 或 `GET /api/reward` 读。

### 3.2 获取伙伴信息

`GET /api/companion`

成功响应：

``` json
{
  "success": true,
  "data": {
    "name": "小橘",
    "personality": ["温柔", "活泼"],
    "speaking_style": "亲切幽默",
    "companion_style": "鼓励为主",
    "avatar_id": "orange_cat",
    "room": "study_room.jpg",
    "level": 1,
    "exp": 5
  }
}
```

如果还没有创建伙伴，建议返回 `data: null`，不要伪造默认伙伴。

### 3.3 保存/更新伙伴信息

`PUT /api/companion`

请求：

``` json
{
  "name": "小橘",
  "personality": ["温柔", "活泼"],
  "speaking_style": "亲切幽默",
  "companion_style": "鼓励为主",
  "avatar_id": "orange_cat",
  "room": "study_room.jpg",
  "pet_state": "idle"
}
```

成功响应：

``` json
{
  "success": true,
  "data": {
    "saved": true
  }
}
```

注意：`level` 和 `exp`
由成长系统维护，前端保存伙伴资料时不要覆盖这两个字段。

`pet_state` 保存娱乐空间最近一次的桌宠状态，取值只能是
`idle`、`study`、`happy`、`rest`、`sleep` 之一，其他值返回 400 `INVALID_ARGUMENT`。
前端由 `frontend/js/companion-store.js` 统一读写，不要在页面里各自保存。

### 3.4 AI 聊天

`POST /api/chat`

请求：

``` json
{
  "message": "我有点学不下去了",
  "mode": "focus",
  "task": "完成机器学习作业",
  "mood": 2
}
```

字段说明：

  字段        类型              必填   说明
  ----------- ----------------- ------ -----------------------------------
  `message`   string            是     用户本轮输入
  `mode`      string            是     只能是 `focus` 或 `entertainment`
  `task`      string 或 null    否     当前学习任务；娱乐模式可为 null
  `mood`      integer 或 null   否     当前情绪值，范围 1～5

成功响应：

``` json
{
  "success": true,
  "data": {
    "reply": "别着急，我们慢慢完成，我陪着你。"
  }
}
```

负责关系：A 负责聊天界面和发送请求；D 负责接口与上下文组织；B 负责 AI
调用、角色人设、专注/娱乐 Prompt 和轻量记忆。

### 3.5 保存专注记录

`POST /api/focus/session`

请求：

``` json
{
  "task": "完成机器学习作业",
  "planned_minutes": 25,
  "actual_minutes": 25,
  "completed": true,
  "started_at": "2026-11-02T15:00:00+08:00",
  "mood_before": 2,
  "mood_after": 4
}
```

成功响应：

``` json
{
  "success": true,
  "data": {
    "session_id": "session_001",
    "saved": true
  }
}
```

字段说明： - `task`：任务名称，字符串。 -
`planned_minutes`、`actual_minutes`：分钟数，非负数。 -
`completed`：是否完成，布尔值。 - `started_at`：开始时间。 -
`mood_before`、`mood_after`：1～5 的整数；暂时没有记录时可传 `null`。

`earned_exp` 不由前端传入，避免客户端随意修改奖励；由后端奖励接口计算。

### 3.6 生成陪伴日记

`POST /api/focus/diary`

请求：

``` json
{
  "session_id": "session_001"
}
```

成功响应：

``` json
{
  "success": true,
  "data": {
    "diary_id": "diary_001",
    "content": "今天你完成了机器学习作业的专注练习……",
    "created_at": "2026-11-02T15:30:00+08:00"
  }
}
```

负责关系：D 根据 `session_id` 读取专注记录，再调用 B 的日记生成函数。B
不要自行编造任务完成情况或时长。

### 3.7 获取专注历史

`GET /api/focus/history`

成功响应：

``` json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "session_001",
        "task": "完成机器学习作业",
        "planned_minutes": 25,
        "actual_minutes": 25,
        "completed": true,
        "started_at": "2026-11-02T15:00:00+08:00",
        "mood_before": 2,
        "mood_after": 4
      }
    ]
  }
}
```

### 3.8 保存情绪反馈

`POST /api/mood`

请求：

``` json
{
  "session_id": "session_001",
  "stage": "before",
  "mood": 2
}
```

`stage` 只能是 `before` 或 `after`；`mood` 为 1～5 的整数。

五档含义（与前端按钮文案一致，前后端和 AI 都按这张表理解）：

| 数值 | 含义 | 说明 |
| --- | --- | --- |
| 1 | 非常低落 | 状态最差的一档 |
| 2 | 有点疲惫 | 提不起劲，但还能做事 |
| 3 | 比较平静 | 中性，不特别好也不特别差 |
| 4 | 心情不错 | 状态比较好 |
| 5 | 非常开心 | 状态最好的一档 |

数值越大表示状态越好。

两条使用约定：

- 这是**用户主动选择的自评分**，不是系统推断出来的情绪。AI 只能引用这个分数和对应含义，
  不得反推用户的心理状态。
- 用户跳过选择时，`mood_before` / `mood_after` **传 `null`，但字段必须出现**
  （`POST /api/focus/session` 会校验 key 是否存在）。AI 拿不到值时按「用户未填写」处理，
  不要猜一个数字。

成功响应：

``` json
{
  "success": true,
  "data": {
    "saved": true
  }
}
```

### 3.9 获取成长数据

`GET /api/reward`

成功响应：

``` json
{
  "success": true,
  "data": {
    "level": 1,
    "exp": 15,
    "next_level_exp": 30
  }
}
```

### 3.10 结算成长奖励

`POST /api/reward/claim`

请求：

``` json
{
  "session_id": "session_001"
}
```

成功响应：

``` json
{
  "success": true,
  "data": {
    "earned_exp": 10,
    "total_exp": 15,
    "level": 1,
    "leveled_up": false
  }
}
```

同一个 `session_id` 只能领取一次奖励。奖励规则按项目说明书：完成一次
25 分钟专注 +10 EXP；连续完成两次专注 +5 EXP；完成每日学习目标 +10
EXP；首次创建伙伴 +5 EXP。

结算方式（C、D 已确认，实现在 `services/reward_service.py`）：

- 前三条规则都在 `POST /api/reward/claim` 里一次算完，`earned_exp` 由后端计算，
  前端不传、也不能传。
- **连续完成两次**：本条记录在历史里的前一条也是"完成且实际时长 ≥ 25 分钟"时 +5；
  中途提前结束或不足 25 分钟会中断连续。
- **每日学习目标**：当天（按 `started_at` 的日期部分）第一条成功专注 +10，
  同一天后续再完成不重复给。
- **首次创建伙伴 +5**：由 `POST /api/companion/generate` 在创建伙伴时直接加到
  `companion.exp`，不经过奖励接口。

## 4. Mock（模拟数据）开发约定

B 的 AI 函数还没完成时，D 可以先让接口返回固定模拟数据。A、C
只要按请求格式发送数据、按响应格式读取数据，就能先开发页面和功能。

例如 `/api/chat` 暂时固定返回：

``` json
{
  "success": true,
  "data": {
    "reply": "我在这里陪你。我们先完成一个小步骤。"
  }
}
```

Mock 只能用于开发联调，最终演示前要替换为真实逻辑或明确标注演示模式。

## 5. 前端统一调用约定

A 在 `frontend/js/api.js` 中统一封装请求。其他前端文件不要各自重复写
`fetch`。

示例（供 A 参考）：

``` javascript
const API_BASE = "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.error?.message || "请求失败");
  }

  return result.data;
}
```

调用示例：

``` javascript
const result = await request("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    message: "我有点学不下去了",
    mode: "focus",
    task: "完成机器学习作业",
    mood: 2
  })
});

console.log(result.reply);
```

## 6. 目录与文件约定

``` text
StarMate/
├── app.py
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── data/
├── services/
├── routes/
├── frontend/
└── docs/
    └── api-contract.md
```

本文件保存为：`docs/api-contract.md`。

## 7. 四位成员现在需要确认的事项

-   [ ] A：确认前端页面是否能按上述路径调用接口；确认是否接受 `data`
    统一包装。
-   [ ] B：确认角色生成、聊天、日记三个 AI
    函数的输入输出字段；尤其确认聊天返回 `reply` 字符串。
-   [ ] C：确认专注记录、情绪值、奖励结算所需字段；确认由谁触发
    `/api/reward/claim`。
-   [ ] D：按本文件实现 Flask 路由、JSON 存储和 Mock 响应。

**协作规则：**
如果某个字段需要修改，先在群里提出并由相关成员确认，再统一修改本文件。不要各自私自改字段名。第一轮目标不是把所有功能写完，而是让每个人都能依据同一份接口约定独立开发。
