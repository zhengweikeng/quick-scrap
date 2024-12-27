function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatTimeLeft(expiryTime) {
    const now = Date.now();
    const timeLeft = expiryTime - now;

    if (timeLeft <= 0) return ['已过期', 'expiry-warning'];

    const minutes = Math.floor(timeLeft / (1000 * 60));
    if (minutes < 60) {
        return [`${minutes} 分钟后过期`, minutes < 15 ? 'expiry-warning' : 'expiry-soon'];
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return [`${hours} 小时后过期`, hours < 2 ? 'expiry-soon' : 'expiry-safe'];
    }

    const days = Math.floor(hours / 24);
    return [`${days} 天后过期`, 'expiry-safe'];
}

async function cleanExpiredDrafts() {
    try {
        const result = await chrome.storage.local.get(['drafts']);
        if (!result.drafts || result.drafts.length === 0) {
            return [];
        }

        const currentTime = Date.now();
        const validDrafts = [];

        // 遍历草稿列表，直到找到第一个过期的草稿
        for (let i = 0; i < result.drafts.length; i++) {
            const draft = result.drafts[i];
            if (draft.expiryTime > currentTime) {
                validDrafts.push(draft);
            } else {
                // 找到第一个过期草稿，后面的都不用检查了
                break;
            }
        }

        // 只有在有过期草稿时才更新存储
        if (validDrafts.length !== result.drafts.length) {
            await chrome.storage.local.set({ drafts: validDrafts });
        }

        return validDrafts;

    } catch (error) {
        console.error('清理过期草稿失败:', error);
        return [];
    }
}

async function loadDraftsList() {
    const draftsListElement = document.getElementById('draftsList');

    const validDrafts = await cleanExpiredDrafts();

    if (validDrafts.length === 0) {
        draftsListElement.innerHTML = '<div class="no-drafts">没有保存的草稿</div>';
        return;
    }

    draftsListElement.innerHTML = validDrafts.map(draft => {
        const [timeLeftText, timeLeftClass] = formatTimeLeft(draft.expiryTime);
        return `
        <div class="draft-item">
          <div class="draft-content">${draft.content}</div>
          <div class="draft-time">
            <span class="${timeLeftClass}">${timeLeftText}</span>
          </div>
        </div>
      `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', function () {
    // 检查 URL 参数，看是否需要打开特定标签
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');

    // 标签页切换逻辑
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // 如果 URL 指定了要打开的标签，切换到该标签
    if (activeTab) {
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === activeTab) {
                // 切换按钮状态
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 切换内容
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === activeTab) {
                        content.classList.add('active');
                    }
                });

                // 如果是草稿箱标签，立即加载草稿列表
                if (activeTab === 'drafts') {
                    loadDraftsList();
                }
            }
        });
    }

    // 设置页面逻辑
    const defaultExpirySelect = document.getElementById('defaultExpiryTime');
    const saveButton = document.getElementById('save');
    const saveMessage = document.getElementById('saveMessage');

    // 加载当前设置
    chrome.storage.local.get(['defaultExpiryTime'], function (result) {
        defaultExpirySelect.value = result.defaultExpiryTime || '30';
    });

    // 保存设置
    saveButton.addEventListener('click', function () {
        chrome.storage.local.set({
            defaultExpiryTime: defaultExpirySelect.value
        }, function () {
            saveMessage.style.display = 'inline';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 2000);
        });
    });

    // 初始加载草稿列表
    loadDraftsList();
});