// ==============================
// 1. 获取页面元素
// ==============================

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


// ==============================
// 2. 初始化计时器
// ==============================

// 默认专注时间：25分钟
const TOTAL_TIME = 10;

// 当前剩余时间
let remainingTime = TOTAL_TIME;

// 保存计时器
let timerInterval = null;


// ==============================
// 3. 更新时间显示
// ==============================

function updateTimerDisplay() {

    const minutes = Math.floor(remainingTime / 60);

    const seconds = remainingTime % 60;

    timerDisplay.textContent =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");
}


// ==============================
// 4. 进入专注模式
// ==============================

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


// ==============================
// 6. 开始专注
// ==============================

function startTimer() {

    // 如果计时器已经运行，就不重复启动
    if (timerInterval !== null) {
        return;
    }

    // 进入专注模式
    enterFocusMode();

    // 开始倒计时
    timerInterval = setInterval(function () {

        remainingTime--;

        updateTimerDisplay();

        // 时间结束
        if (remainingTime <= 0) {

            clearInterval(timerInterval);

            timerInterval = null;

            remainingTime = 0;

            updateTimerDisplay();

            // 显示结束提示
            endScreen.hidden = false;
        }

    }, 1000);
}


// ==============================
// 7. 暂停专注
// ==============================

function pauseTimer() {

    if (timerInterval !== null) {

        clearInterval(timerInterval);

        timerInterval = null;
    }
}


// ==============================
// 8. 重置计时器
// ==============================

function resetTimer() {

    // 停止计时
    if (timerInterval !== null) {

        clearInterval(timerInterval);

        timerInterval = null;
    }

    // 恢复25分钟
    remainingTime = TOTAL_TIME;

    updateTimerDisplay();

    // 恢复正常界面
    exitFocusMode();
}


// ==============================
// 9. 退出专注结束界面
// ==============================

function exitFinishedFocus() {

    // 停止计时
    if (timerInterval !== null) {

        clearInterval(timerInterval);

        timerInterval = null;
    }

    // 恢复25分钟
    remainingTime = TOTAL_TIME;

    updateTimerDisplay();

    // 恢复正常界面
    exitFocusMode();
}


// ==============================
// 10. 绑定按钮事件
// ==============================

startBtn.addEventListener("click", startTimer);

pauseBtn.addEventListener("click", pauseTimer);

resetBtn.addEventListener("click", resetTimer);

exitFocusBtn.addEventListener("click", exitFinishedFocus);


// ==============================
// 11. 页面初始化
// ==============================

updateTimerDisplay();

// ==============================
// Todo List：持久化与任务删除
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