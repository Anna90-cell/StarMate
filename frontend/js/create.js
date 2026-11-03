
// // 获取所有分类按钮
// const tabButtons = document.querySelectorAll(".tab-btn");

// // 获取所有内容面板
// const tabContents = document.querySelectorAll(".tab-content");


// // 一、切换人物、背景、设置
// tabButtons.forEach(button => {

//     button.addEventListener("click", function () {

//         // 获取当前按钮对应的分类
//         const target = this.dataset.tab;

//         // 清除所有按钮的选中状态
//         tabButtons.forEach(btn => {
//             btn.classList.remove("active");
//         });

//         // 清除所有内容面板的显示状态
//         tabContents.forEach(content => {
//             content.classList.remove("active");
//         });

//         // 激活当前按钮
//         this.classList.add("active");

//         // 显示对应内容
//         document.getElementById(target).classList.add("active");

//     });

// });


// // 二、人物选择
// const characterCards = document.querySelectorAll(
//     "[data-character]"
// );

// const previewName = document.getElementById("preview-name");

// const previewHair = document.querySelector(".preview-hair");
// const previewBody = document.querySelector(".preview-body");

// const characterColors = [
//     { hair: "#756482", body: "#c7b2d8" },
//     { hair: "#a66e79", body: "#e9c3d0" },
//     { hair: "#657e9c", body: "#b7d2e8" },
//     { hair: "#987d55", body: "#e8d5a8" }
// ];

// characterCards.forEach(card => {

//     card.addEventListener("click", function () {

//         // 获取人物编号
//         const number = Number(this.dataset.character);

//         // 更新选中状态
//         characterCards.forEach(item => {
//             item.classList.remove("selected");
//         });

//         this.classList.add("selected");

//         // 更新右侧人物颜色
//         const colors = characterColors[number - 1];

//         previewHair.style.background = colors.hair;
//         previewBody.style.background = colors.body;

//         // 更新人物名称
//         previewName.textContent = `人物${number}`;

//     });

// });


// // 三、背景选择
// const backgroundCards = document.querySelectorAll(
//     "[data-background]"
// );

// const createMain = document.querySelector(".create-main");

// const backgroundStyles = [
//     "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)",
//     "linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)",
//     "linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)"
// ];

// backgroundCards.forEach(card => {

//     card.addEventListener("click", function () {

//         const number = Number(this.dataset.background);

//         backgroundCards.forEach(item => {
//             item.classList.remove("selected");
//         });

//         this.classList.add("selected");

//         // 切换整个场景背景
//         createMain.style.background =
//             backgroundStyles[number - 1];

//     });

// });


// // 四、确认创建
// const confirmButton = document.getElementById("confirm-btn");

// confirmButton.addEventListener("click", function () {

//     const selectedCharacter = document.querySelector(
//         "[data-character].selected"
//     );

//     const selectedBackground = document.querySelector(
//         "[data-background].selected"
//     );

//     const characterName = document.getElementById(
//         "character-name"
//     ).value.trim();

//     const characterNumber = selectedCharacter.dataset.character;
//     const backgroundNumber = selectedBackground.dataset.background;

//     alert(
//         `创建选择已确认！\n` +
//         `人物：人物${characterNumber}\n` +
//         `背景：背景${backgroundNumber}\n` +
//         `名称：${characterName || "暂未命名"}`
//     );

// });


// =====================================
// StarMate 创建伙伴页面
// =====================================


// 一、获取页面元素


// =====================================
// StarMate 创建伙伴页面
// =====================================


// 一、获取页面元素

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const characterCards = document.querySelectorAll("[data-character]");
const backgroundCards = document.querySelectorAll("[data-background]");

const previewName = document.getElementById("preview-name");
const previewHair = document.querySelector(".preview-hair");
const previewBody = document.querySelector(".preview-body");

const createMain = document.querySelector(".create-main");
const nameInput = document.getElementById("character-name");
const confirmButton = document.getElementById("confirm-btn");


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


// 四、读取以前保存的数据

function loadUserData() {

    const savedData = localStorage.getItem("starMateData");

    if (savedData) {

        const userData = JSON.parse(savedData);

        selectedCharacter =
            characterColors[userData.character]
                ? userData.character
                : "character1";

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

    const colors = characterColors[selectedCharacter];

    previewHair.style.background = colors.hair;
    previewBody.style.background = colors.body;

    // 更新选中卡片
    characterCards.forEach(card => {

        card.classList.toggle(
            "selected",
            card.dataset.character === selectedCharacter
        );

    });

    // 更新人物名称
    const number = selectedCharacter.replace("character", "");

    previewName.textContent = `人物${number}`;

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

confirmButton.addEventListener("click", function () {

    const userData = {

        character: selectedCharacter,

        background: selectedBackground,

        name: nameInput.value.trim() || "我的伙伴"

    };

    // 保存到浏览器
    localStorage.setItem(
        "starMateData",
        JSON.stringify(userData)
    );

    alert("伙伴信息保存成功！");

    // 进入我的伙伴页面
    window.location.href = "companion.html";

});


// 九、页面加载时恢复数据

loadUserData();
