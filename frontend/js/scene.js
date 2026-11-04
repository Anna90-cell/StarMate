
/* 一、读取创建伙伴时保存的数据 */
const savedData = JSON.parse(
    localStorage.getItem("starMateData") || "null"
);

/* 二、准备背景样式 */
const backgroundStyles = {
    background1: "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)",
    background2: "linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)",
    background3: "linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)"
};

/* 三、如果用户已经创建了伙伴 */
if (savedData) {

    /* 设置页面背景 */
    const selectedBackground =
        backgroundStyles[savedData.background];

    if (selectedBackground) {
        document.body.style.backgroundImage = selectedBackground;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.minHeight = "100vh";
    }

    /* 设置桌宠图片 */
    const sceneImage = document.getElementById("scene-image");

    if (sceneImage) {
        const number = (savedData.character || "character1")
            .replace("character", "");

        sceneImage.src =
            `assets/characters/character-${number.padStart(2, "0")}.png`;
    }

    /* 显示伙伴名字 */
    const nameElement = document.querySelector("#scene-name");

    if (nameElement) {
        nameElement.textContent = savedData.name || "我的伙伴";
    }
}
