// 一、获取页面元素

const companionDisplay = document.getElementById("companion-display");
const emptyState = document.getElementById("empty-state");

const companionName = document.getElementById("companion-name");

const companionHair = document.querySelector(".companion-hair");
const companionBody = document.querySelector(".companion-body");


// 二、准备人物颜色数据

const characterColors = {
    character1: {
        hair: "#756482",
        body: "#c7b2d8"
    },

    character2: {
        hair: "#a66e79",
        body: "#e9c3d0"
    },

    character3: {
        hair: "#657e9c",
        body: "#b7d2e8"
    },

    character4: {
        hair: "#987d55",
        body: "#e8d5a8"
    }
};

// 不同背景对应的样式
const backgroundStyles = {
    background1: "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)",
    background2: "linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)",
    background3: "linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)"
};


// 三、读取创建页面保存的数据

function loadCompanion() {

    const savedData = JSON.parse(localStorage.getItem("starMateData"));

    // 获取伙伴房间
    const companionRoom = document.querySelector(".companion-room");

    if (companionRoom) {
        companionRoom.style.background =
    backgroundStyles[savedData.background];

        console.log("伙伴房间元素：", companionRoom);
        console.log("实际背景：", getComputedStyle(companionRoom).background);
    }
    // // 根据用户选择设置伙伴房间背景
    // if (savedData && backgroundStyles[savedData.background]) {
    //     companionRoom.style.background =
    //         backgroundStyles[savedData.background];
    // }

    // console.log(savedData.background);

    // // 如果没有保存过伙伴信息
    // if (!savedData) {
    //     companionDisplay.style.display = "none";
    //     emptyState.style.display = "flex";
    //     return;
    // }

    // // 获取人物对应的颜色
    // const colors = characterColors[userData.character];

    // // 如果人物数据无效，也显示未创建状态
    // if (!colors) {
    //     companionDisplay.style.display = "none";
    //     emptyState.style.display = "flex";
    //     return;
    // }

    // // 显示伙伴
    // emptyState.style.display = "none";
    // companionDisplay.style.display = "flex";

    // // 更新伙伴名称
    // companionName.textContent = userData.name || "我的伙伴";

    // // 更新人物颜色
    // companionHair.style.background = colors.hair;
    // companionBody.style.background = colors.body;

}


// 四、页面加载时执行

loadCompanion();
