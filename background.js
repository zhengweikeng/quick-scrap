chrome.runtime.onInstalled.addListener(function () {
    // 设置默认的过期时间（30分钟）
    chrome.storage.local.get(['defaultExpiryTime'], function (result) {
        if (!result.defaultExpiryTime) {
            chrome.storage.local.set({ defaultExpiryTime: '30' });
        }
    });

    // 创建所有右键菜单
    chrome.contextMenus.create({
        id: "viewDrafts",
        title: "查看草稿",
        contexts: ["action"]
    });

    chrome.contextMenus.create({
        id: "getLatestDraft",
        title: "获取最新草稿",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "removeAllDrafts",
        title: "删除所有草稿",
        contexts: ["all"]
    });
});

// 统一处理所有菜单点击事件
chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === "viewDrafts") {
        viewDrafts();
    } else if (info.menuItemId === "getLatestDraft") {
        // getLatestDraft();
    } else if (info.menuItemId === "removeAllDrafts") {
        removeAllDrafts();
    }
});

function viewDrafts() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('options.html?tab=drafts')
    });
}

async function removeAllDrafts() {
    await chrome.storage.local.set({ drafts: [] });
}