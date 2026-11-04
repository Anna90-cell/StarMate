/*!
 * 首页伙伴展示（index.js）
 *
 * 伙伴形象、名字与房间背景统一以后端 GET /api/companion 为准，
 * 由 companion-store.js 负责请求与离线兜底。
 */

async function loadHomeCompanion() {

    // 获取首页伙伴图片、名称与主区域元素
    const homeCharacterImage = document.getElementById("home-character-image");
    const homeCharacterName = document.getElementById("home-character-name");
    const mainContent = document.querySelector(".main-content");

    const companion = await StarMateCompanion.load();

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

    // 恢复房间背景
    StarMateCompanion.applyRoomBackground(mainContent, companion.room);

    // 应用伙伴头像和名称
    if (homeCharacterImage) {
        homeCharacterImage.src =
            StarMateCompanion.avatarImage(companion.avatar_id);
        homeCharacterImage.style.display = "";
    }

    if (homeCharacterName) {
        homeCharacterName.textContent = companion.name;
    }
}

// 页面加载时获取伙伴信息
loadHomeCompanion();
