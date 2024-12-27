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
        if (minutes < 1) {
            return ['马上过期', 'expiry-soon'];
        }
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
        draftsListElement.innerHTML = `
            <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">没有草稿</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">当前没有任何保存的草稿内容</p>
            </div>
        `;
        return;
    }

    draftsListElement.innerHTML = validDrafts.map(draft => {
        const [timeLeftText, timeLeftClass] = formatTimeLeft(draft.expiryTime);
        const formattedTime = formatTime(draft.expiryTime);
        return `
            <div class="py-4 flex items-start space-x-4">
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                        ${draft.content}
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            过期时间：${formattedTime}
                        </div>
                        <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(timeLeftClass)}">
                            ${timeLeftText}
                        </span>
                    </div>
                </div>
                <div class="flex-shrink-0">
                    <button class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" title="复制内容">
                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" width="200" height="200" viewBox="0 0 448 512">
                            <path fill="currentColor" d="m433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48v-48h80c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM266 464H54a6 6 0 0 1-6-6V150a6 6 0 0 1 6-6h74v224c0 26.51 21.49 48 48 48h96v42a6 6 0 0 1-6 6zm128-96H182a6 6 0 0 1-6-6V54a6 6 0 0 1 6-6h106v88c0 13.255 10.745 24 24 24h88v202a6 6 0 0 1-6 6zm6-256h-64V48h9.632c1.591 0 3.117.632 4.243 1.757l48.368 48.368a6 6 0 0 1 1.757 4.243V112z"/>
                            </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // 添加显示 Toast 的函数
    function showToast() {
        const toast = document.getElementById('toast');
        // 显示 Toast（从上方滑入）
        toast.classList.remove('-translate-y-full', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');

        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('-translate-y-full', 'opacity-0');
        }, 3000);
    }

    // 更新复制按钮的点击事件处理
    const copyButtons = draftsListElement.querySelectorAll('button[title="复制内容"]');
    copyButtons.forEach((button, index) => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(validDrafts[index].content);
                showToast();
            } catch (err) {
                console.error('复制失败:', err);
            }
        });
    });
}

// 辅助函数：获取状态样式类
function getStatusClass(timeLeftClass) {
    switch (timeLeftClass) {
        case 'expiry-warning':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'expiry-soon':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'expiry-safe':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 检查 URL 参数，看是否需要打开特定标签
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');

    // 标签页切换逻辑
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('#settings, #drafts');

    // 切换标签的函数
    function switchTab(tabId) {
        // 切换按钮样式
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('bg-green-500', 'text-white');
                btn.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700/50');
            } else {
                btn.classList.remove('bg-green-500', 'text-white');
                btn.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700/50');
            }
        });

        // 切换内容显示
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.remove('hidden');
                content.classList.add('block');
            } else {
                content.classList.add('hidden');
                content.classList.remove('block');
            }
        });

        // 如果是草稿箱标签，加载草稿列表
        if (tabId === 'drafts') {
            loadDraftsList();
        }
    }

    // 为每个标签按钮添加点击事件
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // 如果 URL 指定了要打开的标签，切换到该标签
    if (activeTab) {
        switchTab(activeTab);
    }

    // 设置页面逻辑
    const defaultExpirySelect = document.getElementById('defaultExpiryTime');
    const autoClipboardCheckbox = document.getElementById('autoClipboard');

    // 加载当前设置
    chrome.storage.local.get(['defaultExpiryTime', 'autoClipboard'], function (result) {
        defaultExpirySelect.value = result.defaultExpiryTime || '30';
        autoClipboardCheckbox.checked = result.autoClipboard !== false; // 默认为true
    });

    // 暗黑模式切换逻辑
    const darkModeToggle = document.getElementById('darkMode');

    // 检查系统偏好
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
        darkModeToggle.checked = true;
    }

    // 加载保存的主题设置
    chrome.storage.local.get(['darkMode'], function (result) {
        if (result.darkMode !== undefined) {
            darkModeToggle.checked = result.darkMode;
            if (result.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    });

    // 监听选择事件
    defaultExpirySelect.addEventListener('change', function () {
        chrome.storage.local.set({
            defaultExpiryTime: this.value
        });
    });

    // 监听自动复制剪贴板事件
    autoClipboardCheckbox.addEventListener('change', function () {
        chrome.storage.local.set({
            autoClipboard: this.checked
        });
    });

    // 监听切换事件
    darkModeToggle.addEventListener('change', function () {
        // 在 html 元素上切换 dark 类
        document.documentElement.classList.toggle('dark');

        // 保存设置
        chrome.storage.local.set({
            darkMode: this.checked
        });
    });

    // 初始加载草稿列表
    loadDraftsList();
});