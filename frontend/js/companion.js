// 一、获取页面元素
// 伙伴数据统一通过 window.StarMateCompanion（companion-store.js）读取

const companionDisplay = document.getElementById("companion-display");
const emptyState = document.getElementById("empty-state");


// 二、读取伙伴数据（统一以后端为准）

async function loadCompanion() {

    const companionRoom = document.querySelector(".companion-room");
    const companionImage = document.getElementById("companion-image");
    const companionName = document.getElementById("companion-name");

    if (!companionRoom) return;

    // 1. 伙伴资料与房间背景都来自 GET /api/companion
    const companion = await StarMateCompanion.load();

    // 2. 尚未创建伙伴
    if (!companion) {
        StarMateCompanion.applyRoomBackground(companionRoom, null);

        if (companionImage) companionImage.style.display = "none";
        if (companionName) companionName.textContent = "等待相遇的伙伴";
        return;
    }

    // 3. 恢复房间背景
    StarMateCompanion.applyRoomBackground(companionRoom, companion.room);

    // 4. 应用后端保存的头像和名称
    if (companionImage) {
        companionImage.src = StarMateCompanion.avatarImage(companion.avatar_id);
        companionImage.style.display = "";
    }

    if (companionName) {
        companionName.textContent = companion.name;
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

