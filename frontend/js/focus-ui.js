// ==============================
// 1. 获取页面元素
// ==============================

// 读取伙伴角色图片
const sceneImage = document.getElementById("scene-image");

const savedCompanion = JSON.parse(
    localStorage.getItem("starMateData") || "null"
);

if (sceneImage && savedCompanion) {
    const avatarId = savedCompanion.avatar_id || "character-01";
    sceneImage.src = `assets/characters/${avatarId}.png`;
}

const timerDisplay = document.getElementById("timer");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const moodSection = document.getElementById("mood-section");
const chatSection = document.getElementById("chat-section");
const diarySection = document.getElementById("diary-section");

const normalActions = document.getElementById("normal-actions");

const endScreen = document.getElementById("focus-end-screen");
const exitFocusBtn = document.getElementById("exitFocusBtn");

// 保存本次专注结果
let focusFinishResult = null;

// 保存提交中的 Promise，防止重复提交
let focusSubmitPromise = null;

// 保存已经创建的专注记录 ID
let focusSessionId = null;

// 防止重复生成日记
let diaryGenerated = false;


// ==============================
// 2. 进入专注模式
// ==============================

// 说明：本版本不在“开始专注”时调用 enterFocusMode，
// 避免把聊天区和日记区一起隐藏，导致暂停时无法聊天。
function enterFocusMode() {
    document.body.classList.add("focus-mode");

    moodSection.hidden = true;
    chatSection.hidden = true;
    diarySection.hidden = true;

    normalActions.hidden = true;
}


// ==============================
// 3. 恢复正常界面
// ==============================

function exitFocusMode() {
    document.body.classList.remove("focus-mode");

    moodSection.hidden = false;
    chatSection.hidden = false;
    diarySection.hidden = false;

    normalActions.hidden = false;

    endScreen.hidden = true;
}


// ==============================
// 4. 显示专注结束界面
// ==============================

function handleFocusFinish() {
    endScreen.hidden = false;
}


// ==============================
// 5. 退出专注结束界面
// ==============================

async function exitFinishedFocus() {
    // 先保存专注记录并生成日记，完成后再清理
    try {
        await submitFocusResult();
    } catch (error) {
        console.error("保存专注记录或生成日记失败：", error);
    }

    // 恢复正常页面
    exitFocusMode();

    // 重置计时器
    StarMateFocus.reset();

    // 清理本次专注状态
    focusFinishResult = null;
    focusSubmitPromise = null;
    focusSessionId = null;
    diaryGenerated = false;

    // 清理前后心情
    StarMateMood.reset();
}

exitFocusBtn.addEventListener("click", exitFinishedFocus);


// ==============================
// 6. 任务列表
// ==============================

const taskInput = document.getElementById("taskInput");
const todoList = document.getElementById("todo-list");

// 从 localStorage 读取任务
let tasks = JSON.parse(localStorage.getItem("starMateTasks")) || [];

// 保存任务
function saveTasks() {
    localStorage.setItem("starMateTasks", JSON.stringify(tasks));
}

// 渲染任务列表
function renderTasks() {
    todoList.innerHTML = "";

    tasks.forEach(function (task) {
        const li = document.createElement("li");
        li.className = "todo-item";

        if (task.completed) {
            li.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.checked = task.completed;

        const span = document.createElement("span");
        span.className = "todo-text";
        span.textContent = task.text;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "todo-delete";
        deleteBtn.textContent = "×";
        deleteBtn.title = "删除任务";

        checkbox.addEventListener("change", function () {
            task.completed = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        deleteBtn.addEventListener("click", function () {
            tasks = tasks.filter(function (item) {
                return item.id !== task.id;
            });
            saveTasks();
            renderTasks();
        });

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);

        todoList.appendChild(li);
    });
}

// 添加任务
function addTask() {
    const taskText = taskInput.value.trim();

    if (taskText === "") {
        return;
    }

    const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    taskInput.value = "";
}

// 按回车添加
taskInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addTask();
    }
});

// 页面加载时显示已保存的任务
renderTasks();


// ==============================
// 7. 专注结束事件
// ==============================

StarMateFocus.on("finish", function (result) {
    focusFinishResult = result;

    // 清理上一轮提交状态
    focusSubmitPromise = null;
    focusSessionId = null;
    diaryGenerated = false;

    // 显示结束界面
    handleFocusFinish();
});


// ==============================
// 8. 专注前后心情
// ==============================

// 专注前心情
StarMateMood.bind("#moodBefore", {
    stage: "before",
    onChange: function (value, level) {
        const label = (level && level.label) ? level.label : ("心情档位 " + value);
        StarMateGrowth.toast("已选择当前心情：" + label);
    }
});

// 专注后心情
StarMateMood.bind("#moodAfter", {
    stage: "after",
    onChange: function () {
        const text = document.getElementById("mood-change-text");
        text.textContent = StarMateMood.describeDiff();

        // 选择专注后心情后，自动保存记录并生成日记
        submitFocusResult().catch(function (error) {
            console.error("提交专注结果失败：", error);
        });
    }
});


// ==============================
// 9. 绑定专注计时器
// ==============================

StarMateFocus.mount({
    time: "#timer",
    status: "#focusStatus",

    // 不再把 startBtn 交给 mount 自动绑定：改成下方自定义逻辑，
    // 先校验“专注前的心情”是否已选择，未选择则提示并拦截，不能开始专注。
    pauseBtn: "#pauseBtn",
    resumeBtn: "#resumeBtn",
    endBtn: "#endBtn",

    taskInput: "#taskInput"
});

// 开始专注：必须先选择“专注前的心情”，否则提示并拦截
startBtn.addEventListener("click", function () {
    const mood = StarMateMood.get("before");

    if (mood === null || mood === undefined || mood === "") {
        StarMateGrowth.toast("请选择专注前的心情");
        return;
    }

    StarMateFocus.start(taskInput.value);
});

// 还原 mount 对开始按钮的禁用逻辑：专注中 / 暂停时不允许再点“开始”
StarMateFocus.on("tick", function (s) {
    startBtn.disabled = s.status === "running" || s.status === "paused";
});


// ==============================
// 10. 重置按钮
// ==============================

resetBtn.addEventListener("click", function () {
    if (focusFinishResult) {
        // 结束后重置：等待提交和日记生成，再退出
        exitFinishedFocus();
    } else {
        StarMateFocus.reset();
    }
});


// ==============================
// 11. 提交专注记录并生成日记
// ==============================

async function submitFocusResult() {
    // 没有专注结果，不执行
    if (!focusFinishResult) {
        return null;
    }

    // 已经存在提交任务，直接等待同一个任务
    if (focusSubmitPromise) {
        return focusSubmitPromise;
    }

    focusSubmitPromise = (async function () {
        let saved = null;

        // 尚未保存 session 时，创建专注记录
        if (!focusSessionId) {
            saved = await StarMateFocusFlow.saveSession(focusFinishResult);

            // 保存失败，不继续生成日记
            if (!saved || !saved.session_id) {
                return null;
            }

            focusSessionId = saved.session_id;
        }

        // 专注记录保存成功后，生成陪伴日记
        if (!diaryGenerated) {
            diaryGenerated = await generateDiary(focusSessionId);
        }

        return {
            session_id: focusSessionId,
            reward: saved ? saved.reward : null
        };
    })();

    try {
        return await focusSubmitPromise;
    } finally {
        // 释放提交锁，允许失败后再次尝试
        focusSubmitPromise = null;
    }
}


// ==============================
// 12. 聊天框与伙伴消息气泡
// ==============================

const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const focusPetBubble = document.getElementById("focusPetBubble");

async function sendChatMessage() {
    const message = chatInput.value.trim();

    if (message === "") {
        return;
    }

    focusPetBubble.textContent = "伙伴正在思考……";
    chatInput.value = "";

    try {
        const result = await StarMateC.post("/api/chat", {
            message: message,
            mode: "focus",
            task: StarMateFocus.getState().task || null,
            // 把当前任务清单一起发给 AI，让它能看到用户添加的任务
            task_list: tasks.map(function (t) {
                return { text: t.text, completed: !!t.completed };
            }),
            mood: StarMateMood.get("before")
        });

        focusPetBubble.textContent = result.reply;
    } catch (error) {
        console.error("专注模式聊天请求失败：", error);
        focusPetBubble.textContent = "伙伴暂时无法回应，请稍后再试～";
    }
}

// 点击发送按钮
sendBtn.addEventListener("click", sendChatMessage);

// 按回车发送
chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        sendChatMessage();
    }
});


// ==============================
// 13. 生成并显示陪伴日记
// ==============================

async function generateDiary(sessionId) {
    const diaryPreview = document.getElementById("diaryPreview");

    if (!diaryPreview) {
        console.error("找不到 #diaryPreview，无法显示陪伴日记");
        return false;
    }

    // 显示等待提示
    diaryPreview.textContent = "伙伴正在整理今天的陪伴日记……";

    try {
        const result = await StarMateC.post("/api/focus/diary", {
            session_id: sessionId
        });

        if (!result || !result.content) {
            throw new Error("后端没有返回日记内容");
        }

        const diaryText = document.createElement("p");
        diaryText.textContent = result.content;

        diaryPreview.replaceChildren(diaryText);

        return true;
    } catch (error) {
        console.error("陪伴日记生成失败：", error);
        diaryPreview.textContent = "陪伴日记生成失败，请稍后再试～";
        return false;
    }
}
//（注：内容由AI生成）
