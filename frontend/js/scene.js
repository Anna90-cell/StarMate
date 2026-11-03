// 读取创建伙伴时保存的数据
const savedData = JSON.parse(
    localStorage.getItem("starMateData")
);

// 不同角色的颜色
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

// 不同背景的样式
const backgroundStyles = {
    background1: "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)",
    background2: "linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)",
    background3: "linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)"
};

// 如果用户已经创建了伙伴
if (savedData) {

    // 设置页面背景
    const selectedBackground = backgroundStyles[savedData.background];

    if (selectedBackground) {
        document.body.style.backgroundImage = selectedBackground;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.minHeight = "100vh";
    }

    // 设置伙伴颜色
    const colors = characterColors[savedData.character];

    if (colors) {
        document.querySelector(".scene-hair").style.background =
            colors.hair;

        document.querySelector(".scene-body").style.background =
            colors.body;
    }

    // 显示伙伴名字
    const nameElement = document.querySelector("#scene-name");

    if (nameElement) {
        nameElement.textContent = savedData.name;
    }
}