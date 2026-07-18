// 儲存全域資料狀態
let allSummaries = [];
let currentTag = 'all';
let searchQuery = '';

// 1. 核心功能：將資料渲染至摘要牆
function renderSummaryWall(dataArray) {
    const container = document.getElementById("wall-container");
    if (!container) return;
    container.innerHTML = "";

    if (dataArray.length === 0) {
        container.innerHTML = `<div class="loading-text">找不到符合的摘要內容。</div>`;
        return;
    }

    dataArray.forEach(item => {
        const cardElement = document.createElement("article");
        cardElement.classList.add("card");
        
        // 如果是在篩選狀態下，通常會拿掉 featured 效果讓版面整齊；這裡我們保留原始資料設定
        if (item.isFeatured) cardElement.classList.add("featured");

        const tagClass = item.isImportant ? "card-tag font-important" : "card-tag";

        cardElement.innerHTML = `
            <div class="${tagClass}">${escapeHtml(item.tag)}</div>
            <h2 class="card-title">${escapeHtml(item.title)}</h2>
            <p class="card-snippet">${escapeHtml(item.snippet)}</p>
            <div class="card-meta">
                <span class="source">${escapeHtml(item.source)}</span>
                <span class="divider">•</span>
                <span class="time">${escapeHtml(item.time)}</span>
            </div>
        `;

        cardElement.addEventListener("click", () => {
            console.log(`點擊了摘要卡片 ID: ${item.id}`);
        });

        container.appendChild(cardElement);
    });
}

// 2. 複合篩選邏輯 (分類標籤 + 關鍵字搜尋)
function filterAndRenderData() {
    let filtered = allSummaries;

    // A. 先依據分類標籤篩選
    if (currentTag !== 'all') {
        filtered = filtered.filter(item => item.tag === currentTag);
    }

    // B. 再依據搜尋關鍵字篩選 (不分大小寫)
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            item.title.toLowerCase().includes(query) || 
            item.snippet.toLowerCase().includes(query) ||
            item.source.toLowerCase().includes(query)
        );
    }

    // C. 送出渲染
    renderSummaryWall(filtered);
}

// 3. 非同步抓取本地 JSON 資料
async function loadSummaryData() {
    const container = document.getElementById("wall-container");
    try {
        const response = await fetch('./data/summaries.json');
        if (!response.ok) throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        
        // 存入全域變數
        allSummaries = await response.json();
        
        // 初次渲染
        filterAndRenderData();
    } catch (error) {
        console.error("讀取資料失敗:", error);
        if (container) {
            container.innerHTML = `<div class="loading-text" style="color: #ea4335;">資料載入失敗，請確認 data/summaries.json 路徑與格式。</div>`;
        }
    }
}

// 4. 設定事件監聽器 (搜尋與標籤切換)
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const tabsContainer = document.getElementById('filter-tabs-container');

    // A. 監聽搜尋輸入 (即時輸入即時篩選)
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        
        // 控制清除按鈕 (X) 的顯示與隱藏
        if (searchQuery.length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        
        filterAndRenderData();
    });

    // B. 監聽清除按鈕點擊
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        filterAndRenderData();
        searchInput.focus();
    });

    // C. 監聽標籤列點擊 (利用事件代理 Event Delegation)
    tabsContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab');
        if (!clickedTab) return;

        // 切換 active 樣式
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        clickedTab.classList.add('active');

        // 更新狀態並重新篩選
        currentTag = clickedTab.dataset.tag;
        filterAndRenderData();
    });
}

// 5. 工具功能
function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
}

function updateRefreshTime() {
    const timeSpan = document.getElementById("update-time");
    if (timeSpan) {
        const now = new Date();
        timeSpan.textContent = `今天 ${now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} 已更新`;
    }
}

// 6. 初始化
document.addEventListener("DOMContentLoaded", () => {
    loadSummaryData();
    setupEventListeners();
    updateRefreshTime();
});
