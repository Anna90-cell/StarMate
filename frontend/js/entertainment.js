
const stateButtons = document.querySelectorAll("[data-state]");
const petMessage = document.getElementById("petMessage");
const petEmoji = document.getElementById("petEmoji");

const desktopPet = document.getElementById("desktopPet");

desktopPet.addEventListener("click", function () {
    petMessage.textContent = "伙伴：嘿嘿，你来找我玩啦！";
});

const stateMessages = {
    idle: "伙伴：我在这里陪着你～",
    study: "伙伴：认真学习的你真棒！",
    happy: "伙伴：好开心呀！我们一起玩吧！",
    rest: "伙伴：休息一下，放松放松～",
    sleep: "伙伴：晚安，做个好梦！"
};

const stateEmojis = {
    idle: "🐱",
    study: "🐱‍💻",
    happy: "😸",
    rest: "🐱",
    sleep: "😴"
};

stateButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const state = button.dataset.state;

        StarMatePet.setState(state);

        petMessage.textContent = stateMessages[state];
        petEmoji.textContent = stateEmojis[state];

        // 更新按钮选中效果
        stateButtons.forEach(function (item) {
            item.classList.remove("is-selected");
        });

        button.classList.add("is-selected");
    });
});
