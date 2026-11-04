
/*!
 * 专注空间的场景初始化（scene.js）
 *
 * 伙伴形象、名字与房间背景统一以后端 GET /api/companion 为准，
 * 由 companion-store.js 负责请求与离线兜底。
 */
StarMateCompanion.load().then(function (companion) {
    const sceneImage = document.getElementById("scene-image");
    const nameElement = document.querySelector("#scene-name");

    /* 尚未创建伙伴：保持页面默认文案，不显示形象 */
    if (!companion) {
        if (sceneImage) {
            sceneImage.style.display = "none";
        }

        if (nameElement) {
            nameElement.textContent = "等待相遇的伙伴";
        }

        return;
    }

    /* 房间背景铺满页面 */
    StarMateCompanion.applyPageBackground(companion.room);

    /* 伙伴立绘 */
    if (sceneImage) {
        sceneImage.src = StarMateCompanion.avatarImage(companion.avatar_id);
        sceneImage.style.display = "";
    }

    /* 伙伴名字 */
    if (nameElement) {
        nameElement.textContent = companion.name;
    }
});
