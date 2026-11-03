// 读取创建伙伴页面保存的数据
const savedData = JSON.parse(localStorage.getItem("starMateData"));

// 如果用户还没有创建伙伴，就不执行后续操作
if (savedData) {

    // 1. 定义不同角色对应的颜色
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

    // 2. 定义不同背景对应的渐变效果
    const backgroundStyles = {
        background1: "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)",
        background2: "linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)",
        background3: "linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)"
    };

    // 3. 获取首页中的角色和背景元素
    const mainContent = document.querySelector(".main-content");
    const characterHair = document.querySelector(".character-hair");
    const characterBody = document.querySelector(".character-body");
    const characterName = document.querySelector("#home-character-name");

    // 4. 根据用户选择的背景修改首页背景
    if (backgroundStyles[savedData.background]) {
        mainContent.style.background = backgroundStyles[savedData.background];
    }

    // 5. 根据用户选择的角色修改人物颜色
    const colors = characterColors[savedData.character];

    if (colors) {
        characterHair.style.background = colors.hair;
        characterBody.style.background = colors.body;
    }

    // 6. 显示用户给伙伴起的名字
    if (characterName) {
        characterName.textContent = savedData.name;
    }
}