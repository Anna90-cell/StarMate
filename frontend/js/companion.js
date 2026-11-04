import { get } from "./api.js";

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

async function loadCompanion() {

    // 1. 读取本地保存的背景设置
    const savedData = JSON.parse(
        localStorage.getItem("starMateData") || "null"
    );

    const companionRoom = document.querySelector(".companion-room");
    const companionImage = document.getElementById("companion-image");
    const companionName = document.getElementById("companion-name");

    if (!companionRoom) return;

    // 2. 恢复伙伴背景
    companionRoom.style.background =
        backgroundStyles[savedData?.background] || backgroundStyles.background1;

    try {
        // 3. 从后端获取伙伴资料
        const companion = await get("/api/companion");

        // 4. 尚未创建伙伴
        if (!companion) {
            if (companionImage) companionImage.style.display = "none";
            if (companionName) companionName.textContent = "等待相遇的伙伴";
            return;
        }

        // 5. 获取后端保存的头像和名称
        const avatarId = companion.avatar_id || "character-01";

        if (companionImage) {
            companionImage.src = `assets/characters/${avatarId}.png`;
            companionImage.style.display = "";
        }

        if (companionName) {
            companionName.textContent = companion.name || "我的伙伴";
        }

    } catch (error) {
        console.error("伙伴资料加载失败：", error);
    }
}




// 四、页面加载时执行

loadCompanion();


/* 五、初始化伙伴成长面板 */

function loadGrowth() {
    // 检查成长模块是否已经加载
    if (!window.StarMateGrowth) {
        console.error("StarMateGrowth 未加载");
        return;
    }

    // 绑定 HTML 中的经验值显示元素
    StarMateGrowth.mount({
        level: "#pet-level",
        exp: "#pet-exp",
        next: "#pet-next",
        bar: "#pet-exp-bar"
    });

    // 获取后端保存的经验值，并更新界面
    StarMateGrowth.refresh()
        .then(function (data) {
            console.log("伙伴成长数据加载成功：", data);
        })
        .catch(function (error) {
            console.error("伙伴成长数据加载失败：", error);
        });
}

// 页面加载时初始化成长面板
loadGrowth();

