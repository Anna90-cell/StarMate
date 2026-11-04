
const stateButtons = document.querySelectorAll("[data-state]");
const petBubble = document.getElementById("petBubble");
const petImage = document.getElementById("petImage");

const desktopPet = document.getElementById("desktopPet");
// 当前桌宠状态，默认待机
let currentState = "idle";

// 点击桌宠，根据当前状态显示互动反馈
desktopPet.addEventListener("click", function () {
    const interactionMessages = {
        idle: "伙伴：嘿嘿，你来找我玩啦！",
        study: "伙伴：嘘～我正在认真学习呢！",
        happy: "伙伴：抱抱！今天真的超级开心！",
        rest: "伙伴：陪我一起休息一会儿吧～",
        sleep: "伙伴：Zzz……不要吵醒我哦～"
    };

    petBubble.textContent =
        interactionMessages[currentState] || "伙伴：嘿嘿，你来找我玩啦！";
});

const stateMessages = {
    idle: "伙伴：我在这里陪着你～",
    study: "伙伴：认真学习的你真棒！",
    happy: "伙伴：好开心呀！我们一起玩吧！",
    rest: "伙伴：休息一下，放松放松～",
    sleep: "伙伴：晚安，做个好梦！"
};

// 读取创建伙伴时保存的数据
const savedData = JSON.parse(
    localStorage.getItem("starMateData") || "null"
);

// 获取当前伙伴的 avatar_id
const avatarId = savedData
    ? (savedData.avatar_id || "character-01")
    : "character-01";
    
// 状态对应的图片文件夹
const stateFolders = {
    idle: "idle",
    study: "learning",
    happy: "happy",
    rest: "resting",
    sleep: "sleeping"
};

// 切换桌宠图片
function updatePetImage(state) {
    const folder = stateFolders[state];

    petImage.src =
    `assets/characters/states/${folder}/${avatarId}.png`;
}

// 切换桌宠动画
function updatePetAnimation(state) {
    // 清除所有旧动画
    petImage.classList.remove(
        "pet-idle",
        "pet-study",
        "pet-happy",
        "pet-rest",
        "pet-sleep"
    );

    // 添加当前状态对应的动画
    petImage.classList.add(`pet-${state}`);
}

stateButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const state = button.dataset.state;
        currentState = state;
        // StarMatePet.setState(state);

        petBubble.textContent = stateMessages[state];
        updatePetImage(state);
        updatePetAnimation(state);

        // 更新按钮选中效果
        stateButtons.forEach(function (item) {
            item.classList.remove("is-selected");
        });

        button.classList.add("is-selected");
    });
});

// 默认进入待机状态
updatePetImage("idle");
updatePetAnimation("idle");

stateButtons.forEach(function (button) {
    if (button.dataset.state === "idle") {
        button.classList.add("is-selected");
    }
});

// 获取聊天框元素
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// 发送消息
async function sendMessage() {
    const text = chatInput.value.trim();

    // 如果输入为空，就不发送
    if (text === "") {
        return;
    }

    // 显示正在回复
    petBubble.textContent = "伙伴正在思考……";

    // 清空输入框
    chatInput.value = "";

    try {
        // 向后端发送聊天请求
        const result = await StarMateC.post("/api/chat", {
            message: text,
            mode: "entertainment",
            task: null,
            mood: null
        });

        // 显示后端返回的伙伴回复
        petBubble.textContent = result.reply;

    } catch (error) {
        console.error("聊天请求失败：", error);
        petBubble.textContent = "伙伴暂时无法回应，请稍后再试～";
    }
}

// 点击发送按钮发送
sendBtn.addEventListener("click", sendMessage);

// 按回车键发送
chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});