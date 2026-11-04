import { post, put } from "./api.js";

// 一、获取页面元素

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const characterCards = document.querySelectorAll("[data-character]");
const backgroundCards = document.querySelectorAll("[data-background]");

const previewName = document.getElementById("preview-name");
const previewImage = document.getElementById("preview-image");

const createMain = document.querySelector(".create-main");
const nameInput = document.getElementById("character-name");
const confirmButton = document.getElementById("confirm-btn");

const descriptionInput = document.getElementById("character-description");
// 二、准备人物和背景数据

const characterColors = {
    character1: { hair: "#756482", body: "#c7b2d8" },
    character2: { hair: "#a66e79", body: "#e9c3d0" },
    character3: { hair: "#657e9c", body: "#b7d2e8" },
    character4: { hair: "#987d55", body: "#e8d5a8" }
};

const backgroundStyles = {
    background1: "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)",
    background2: "linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)",
    background3: "linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)"
};


// 三、记录当前用户选择

let selectedCharacter = "character1";
let selectedBackground = "background1";

const avatarIdMap = {
    character1: "character-01",
    character2: "character-02",
    character3: "character-03",
    character4: "character-04",
    character5: "character-05"
};


// 四、读取以前保存的数据

function loadUserData() {

    const savedData = localStorage.getItem("starMateData");

    if (savedData) {

        const userData = JSON.parse(savedData);

        const savedCharacter = Object.keys(avatarIdMap).find(
            key => avatarIdMap[key] === userData.avatar_id
        );

        selectedCharacter = savedCharacter || "character1";
        console.log("恢复的角色：", selectedCharacter);

        selectedBackground =
            backgroundStyles[userData.background]
                ? userData.background
                : "background1";

        nameInput.value = userData.name || "";

    }

    // 恢复人物
    updateCharacter();

    // 恢复背景
    updateBackground();

}


// 五、切换人物、背景、设置标签

tabButtons.forEach(button => {

    button.addEventListener("click", function () {

        const target = this.dataset.tab;

        tabButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        tabContents.forEach(content => {
            content.classList.remove("active");
        });

        this.classList.add("active");

        document.getElementById(target).classList.add("active");

    });

});


// 六、更新人物预览
function updateCharacter() {

    // 获取当前角色编号
    const number = selectedCharacter.replace("character", "");

    // 更新右侧桌宠图片
    previewImage.src =
        `assets/characters/character-${number.padStart(2, "0")}.png`;

    // 更新选中卡片
    characterCards.forEach(card => {

        card.classList.toggle(
            "selected",
            card.dataset.character === number
        );

    });

    // 更新人物名称
    previewName.textContent = `角色${number}`;

}



// 点击人物卡片

characterCards.forEach(card => {
    card.addEventListener("click", () => {
        selectedCharacter = "character" + card.dataset.character;

        updateCharacter();
    });
});

// 七、更新背景预览

function updateBackground() {

    createMain.style.background =
        backgroundStyles[selectedBackground];

    backgroundCards.forEach(card => {

        card.classList.toggle(
            "selected",
            "background" + card.dataset.background === selectedBackground
        );

    });

}


// 点击背景卡片

backgroundCards.forEach(card => {

    card.addEventListener("click", function () {

        selectedBackground = "background" + this.dataset.background;

        updateBackground();

    });

});


// 八、确认创建并保存数据

confirmButton.addEventListener("click", async function() {
    // 0. 获取并检查伙伴姓名
    const name = nameInput.value.trim();

    if (!name) {
        alert("请输入伙伴姓名！");
        return;
    }

    if (name.length > 20) {
        alert("伙伴姓名不能超过20个字符！");
        return;
    }
    
    // 1. 获取用户输入的人设描述
    const description = descriptionInput.value.trim();

    // 2. 获取当前选择的 avatar_id
    const avatarId = avatarIdMap[selectedCharacter];

    // 3. 检查描述是否为空
    if (!description) {
        alert("请先描述一下你想要的伙伴！");
        return;
    }

    // 4. 检查形象是否有效
    if (!avatarId) {
        alert("请选择伙伴形象！");
        return;
    }

    try {
        const result = await post("/api/companion/generate", {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            avatar_id: avatarId
        });

        await put("/api/companion", {
            avatar_id: avatarId
        });

        // 8. 保存前端需要的信息
        const userData = {
            avatar_id: avatarId,
            background: selectedBackground,
            name: nameInput.value.trim()
        };

        localStorage.setItem("starMateData", JSON.stringify(userData));

        // 9. 提示创建成功并跳转
        alert("伙伴创建成功！");
        window.location.href = "companion.html";

    } catch (error) {
        console.error("伙伴创建请求失败：", error);
        alert(error.message);
    }
});


// 九、页面加载时恢复数据

loadUserData();
