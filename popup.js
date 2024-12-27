document.addEventListener('DOMContentLoaded', async () => {
    // 检查深色模式设置
    chrome.storage.local.get(['darkMode'], function (result) {
        // 如果有保存的设置，使用保存的设置
        if (result.darkMode !== undefined) {
            if (result.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        // 如果没有保存的设置，检查系统偏好
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }
    });

    const latestDraft = await getLatestDraft();
    const saveButton = document.getElementById('saveButton');
    const newButton = document.getElementById('newButton');

    // 如果有最新草稿，显示内容并显示保存按钮
    if (latestDraft) {
        document.getElementById('draftContent').value = latestDraft.content;
        saveButton.classList.remove('hidden');
    }

    // 新增按钮点击事件
    newButton.addEventListener('click', async () => {
        const content = document.getElementById('draftContent').value;
        if (!content.trim()) return;

        try {
            const result = await chrome.storage.local.get(['drafts', 'defaultExpiryTime', 'autoClipboard']);
            const drafts = result.drafts || [];
            const expiryMinutes = result.defaultExpiryTime || '30';
            const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
            const autoClipboard = result.autoClipboard || false;

            // 创建新草稿
            const newDraft = {
                id: drafts.length + 1,
                content: content,
                expiryTime: expiryTime
            };

            drafts.unshift(newDraft);
            await chrome.storage.local.set({ drafts });

            if (autoClipboard) {
                await navigator.clipboard.writeText(content);
            }

            window.close();
        } catch (error) {
            console.error('新增草稿失败:', error);
        }
    });

    // 保存按钮点击事件（更新现有草稿）
    saveButton.addEventListener('click', async () => {
        const content = document.getElementById('draftContent').value;
        if (!content.trim() || !latestDraft) return;

        try {
            const result = await chrome.storage.local.get(['drafts', 'defaultExpiryTime', 'autoClipboard']);
            const drafts = result.drafts || [];
            const expiryMinutes = result.defaultExpiryTime || '30';
            const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
            const autoClipboard = result.autoClipboard || false;

            // 更新现有草稿
            latestDraft.content = content;
            latestDraft.expiryTime = expiryTime;
            drafts[0] = latestDraft;

            await chrome.storage.local.set({ drafts });

            if (autoClipboard) {
                await navigator.clipboard.writeText(content);
            }

            window.close();
        } catch (error) {
            console.error('保存草稿失败:', error);
        }
    });
});

async function getLatestDraft() {
    try {
        const result = await chrome.storage.local.get('drafts');
        if (!result.drafts || result.drafts.length === 0) {
            return null;
        }

        const now = Date.now();
        const validDrafts = [];

        // 遍历草稿列表，直���找到第一个过期的草稿
        for (let i = 0; i < result.drafts.length; i++) {
            const draft = result.drafts[i];
            if (draft.expiryTime > now) {
                validDrafts.push(draft);
            } else {
                // 找到第一个过期草稿，后面的都不用检查了
                break;
            }
        }

        // 如果有效草稿数量与原草稿数量不同，更新存储
        if (validDrafts.length !== result.drafts.length) {
            await chrome.storage.local.set({ drafts: validDrafts });
        }

        // 返回最新的有效草稿（如果有的话）
        return validDrafts.length > 0 ? validDrafts[0] : null;

    } catch (error) {
        console.error('获取最新草稿失败:', error);
        return null;
    }
}