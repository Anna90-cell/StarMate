// ==============================
// 1. 获取页面元素
// ==============================
// ==============================
// 读取伙伴角色图片
// ==============================

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

// 防止重复提交
let focusSubmitStarted = false;


function enterFocusMode() {

    document.body.classList.add("focus-mode");

    moodSection.hidden = true;
    chatSection.hidden = true;
    diarySection.hidden = true;

    normalActions.hidden = true;
}


// ==============================
// 5. 恢复正常界面
// ==============================

function exitFocusMode() {

    document.body.classList.remove("focus-mode");

    moodSection.hidden = false;
    chatSection.hidden = false;
    diarySection.hidden = false;

    normalActions.hidden = false;

    endScreen.hidden = true;
}

// 专注结束后，恢复正常界面
function handleFocusFinish() {
    endScreen.hidden = false;
}

function exitFinishedFocus() {
    // 如果还没有提交，退出时提交
    submitFocusResult();

    // 恢复正常页面
    exitFocusMode();

    // 重置计时器
    StarMateFocus.reset();

    // 清理本次专注结果
    focusFinishResult = null;
    focusSubmitStarted = false;

    // 清理前后心情
    StarMateMood.reset();
}

exitFocusBtn.addEventListener("click", exitFinishedFocus);

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

    // 清空旧列表
    todoList.innerHTML = "";

    tasks.forEach(function (task) {

        const li = document.createElement("li");
        li.className = "todo-item";

        if (task.completed) {
            li.classList.add("completed");
        }

        // 圆形勾选框
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.checked = task.completed;

        // 任务文字
        const span = document.createElement("span");
        span.className = "todo-text";
        span.textContent = task.text;

        // 删除按钮
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "todo-delete";
        deleteBtn.textContent = "×";
        deleteBtn.title = "删除任务";

        // 修改完成状态
        checkbox.addEventListener("change", function () {
            task.completed = checkbox.checked;

            saveTasks();
            renderTasks();
        });

        // 删除任务
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

    // 创建任务数据
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

 // 专注结束时：显示结束界面 + 保存专注记录 + 结算经验
StarMateFocus.on('finish', function (result) {
    focusFinishResult = result;
    focusSubmitStarted = false;

    handleFocusFinish();
});

/* ==============================
   接入专注前后心情
============================== */

// 专注前心情
StarMateMood.bind('#moodBefore', {
    stage: 'before'
});

// 专注后心情
StarMateMood.bind('#moodAfter', {
    stage: 'after',
    onChange: function () {
        const text = document.getElementById('mood-change-text');

        text.textContent = StarMateMood.describeDiff();

        // 选择专注后心情，自动提交
        submitFocusResult();
    }
});


StarMateFocus.mount({
    time: '#timer',
    status: '#focusStatus',
    startBtn: '#startBtn',
    pauseBtn: '#pauseBtn',
    resumeBtn: '#resumeBtn',
    endBtn: '#endBtn',
    taskInput: '#taskInput'
});

// 重置按钮
resetBtn.addEventListener('click', function () {
    StarMateFocus.reset();
});

// 专注结束时显示结束提示
StarMateFocus.on('finish', function () {
    handleFocusFinish();
});

// 提交本次专注记录
function submitFocusResult() {
    if (!focusFinishResult || focusSubmitStarted) {
        return;
    }

    focusSubmitStarted = true;

    StarMateFocusFlow.saveSession(focusFinishResult);
}

// ==============================
// 聊天框与伙伴消息气泡
// ==============================

const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const focusPetBubble = document.getElementById("focusPetBubble");


async function sendChatMessage() {

    const message = chatInput.value.trim();

    if (message === "") {
        return;
    }

    // 显示等待状态
    focusPetBubble.textContent = "伙伴正在思考……";

    // 清空输入框
    chatInput.value = "";

    try {
        const result = await StarMateC.post("/api/chat", {
            message: message,
            mode: "focus",
            task: StarMateFocus.getState().task || null,
            mood: StarMateMood.get("before")
        });

        // 显示后端返回的 AI 回复
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