import { get } from "./api.js";

// 读取创建伙伴页面保存的数据
const savedData = JSON.parse(localStorage.getItem("starMateData"));

// 如果用户还没有创建伙伴，就不执行后续操作
if (savedData) {

    // 2. 定义不同背景对应的渐变效果
    const backgroundStyles = {
        background1: "linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)",
        background2: "linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)",
        background3: "linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)"
    };

    // 3. 获取首页中的角色和背景元素
    const mainContent = document.querySelector(".main-content");
    const characterName = document.querySelector("#home-character-name");

    // 4. 根据用户选择的背景修改首页背景
    if (backgroundStyles[savedData.background]) {
        mainContent.style.background = backgroundStyles[savedData.background];
    }

}

// ==============================
// 首页伙伴形象加载
// ==============================

async function loadHomeCompanion() {

    // 获取首页伙伴图片和名称元素
    const homeCharacterImage = document.getElementById("home-character-image");
    const homeCharacterName = document.getElementById("home-character-name");

    try {
        // 从后端获取伙伴资料
        const companion = await get("/api/companion");

        // 如果还没有创建伙伴
        if (!companion) {
            if (homeCharacterName) {
                homeCharacterName.textContent = "等待相遇的伙伴";
            }

            if (homeCharacterImage) {
                homeCharacterImage.style.display = "none";
            }

            return;
        }

        // 获取伙伴头像和名称
        const avatarId = companion.avatar_id || "character-01";

        if (homeCharacterImage) {
            homeCharacterImage.src = `assets/characters/${avatarId}.png`;
        }

        if (homeCharacterName) {
            homeCharacterName.textContent = companion.name || "我的伙伴";
        }

    } catch (error) {
        console.error("首页伙伴信息加载失败：", error);
    }
}

// 页面加载时获取伙伴信息
loadHomeCompanion();