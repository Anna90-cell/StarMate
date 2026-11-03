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

    // 读取创建页面保存的数据
    const savedData = JSON.parse(
        localStorage.getItem("starMateData") || "null"
    );

    // 获取伙伴房间
    const companionRoom = document.body;

    if (!companionRoom) return;

    // 没有创建伙伴时，使用默认背景
    if (!savedData) {
        companionRoom.style.background =
            "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)";
        return;
    }

    // 有伙伴数据时，使用创建时选择的背景
    companionRoom.style.background =
        backgroundStyles[savedData.background] ||
        backgroundStyles.background1;

    console.log("伙伴房间元素：", companionRoom);
    console.log("实际背景：", getComputedStyle(companionRoom).background);
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

