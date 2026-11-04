
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

// 伙伴形象以后端为准（StarMateCompanion 内部已做请求失败兜底）
let avatarId = StarMateCompanion.DEFAULT_AVATAR;

// 切换桌宠图片
function updatePetImage(state) {
    petImage.src = StarMateCompanion.stateImage(avatarId, state);
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

// 更新按钮选中效果
function updateStateButtons(state) {
    stateButtons.forEach(function (item) {
        item.classList.toggle("is-selected", item.dataset.state === state);
    });
}

// 切换到某个状态：更新界面，并把状态保存到后端
function applyState(state, options) {
    const persist = !options || options.persist !== false;

    currentState = state;

    petBubble.textContent = stateMessages[state];
    updatePetImage(state);
    updatePetAnimation(state);
    updateStateButtons(state);

    if (!persist) {
        return;
    }

    // 状态写入后端，换设备或刷新后仍能恢复；失败只提示，不回滚界面
    StarMateCompanion.savePetState(state).catch(function (error) {
        console.error("桌宠状态保存失败：", error);
    });
}

stateButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        applyState(button.dataset.state);
    });
});

// 页面加载：以后端保存的伙伴形象与状态初始化
StarMateCompanion.load().then(function (companion) {
    if (companion) {
        avatarId = companion.avatar_id;
    }

    applyState(companion ? companion.pet_state : "idle", { persist: false });
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