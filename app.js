// 1. 核心功能：將資料渲染至摘要牆 (維持不變)
function renderSummaryWall(dataArray) {
    const container = document.getElementById("wall-container");
    if (!container) return;
    container.innerHTML = "";

    if (dataArray.length === 0) {
        container.innerHTML = `<div class="loading-text">目前沒有任何摘要資訊。</div>`;
        return;
    }

    dataArray.forEach(item => {
        const cardElement = document.createElement("article");
        cardElement.classList.add("card");
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

// 2. 新增：非同步抓取本地 JSON 資料的函式
async function loadSummaryData() {
    const container = document.getElementById("wall-container");
    
    try {
        // 讀取剛剛建立的 json 檔案
        const response = await fetch('./data/summaries.json');
        
        if (!response.ok) {
            throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        }
        
        // 解析成 JS 陣列物件
        const data = await response.json();
        
        // 呼叫渲染函式
        renderSummaryWall(data);
        
    } catch (error) {
        console.error("讀取資料失敗:", error);
        if (container) {
            container.innerHTML = `<div class="loading-text" style="color: #ea4335;">資料載入失敗，請確認 data/summaries.json 路徑與格式是否正確。</div>`;
        }
    }
}

// 3. 工具小函式 (維持不變)
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

// 4. 初始化
document.addEventListener("DOMContentLoaded", () => {
    loadSummaryData(); // 改呼叫這個會去 fetch 資料的函式
    updateRefreshTime();
});


// 2. 更新頂部導覽列的時間（模擬即時重新整理）
function updateRefreshTime() {
    const timeSpan = document.getElementById("update-time");
    if (timeSpan) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        timeSpan.textContent = `今天 ${timeString} 已更新`;
    }
}

// 3. 核心功能：將資料渲染至摘要牆
function renderSummaryWall(dataArray) {
    const container = document.getElementById("wall-container");
    
    // 如果找不到容器，直接中斷防呆
    if (!container) return;

    // 清空現有的內容（例如：正在初始化... 的文字）
    container.innerHTML = "";

    // 如果沒資料，顯示客製化提示
    if (dataArray.length === 0) {
        container.innerHTML = `<div class="loading-text">目前沒有任何摘要資訊。</div>`;
        return;
    }

    // 巡迴資料陣列，一張張卡片組裝起來
    dataArray.forEach(item => {
        // 建立 article 元素
        const cardElement = document.createElement("article");
        
        // 根據資料屬性動態加上 class
        cardElement.classList.add("card");
        if (item.isFeatured) {
            cardElement.classList.add("featured");
        }

        // 判斷標籤是否需要標紅（重要）
        const tagClass = item.isImportant ? "card-tag font-important" : "card-tag";

        // 組裝卡片內部的 HTML 結構（防禦型：確保變數安全帶入）
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

        // 綁定卡片的點擊事件（未來可以導向原文連結或彈出視窗）
        cardElement.addEventListener("click", () => {
            console.log(`點擊了摘要卡片 ID: ${item.id} - ${item.title}`);
            // alert(`你點擊了：${item.title}`);
        });

        // 將組裝好的卡片塞進牆面容器中
        container.appendChild(cardElement);
    });
}

// 4. 工具小函式：防止 XSS 安全漏洞（防範資料內含惡意 HTML 標籤）
function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, function (s) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[s];
    });
}

// 5. 當網頁 DOM 載入完成後，執行初始化
document.addEventListener("DOMContentLoaded", () => {
    // 渲染卡片
    renderSummaryWall(mockSummaries);
    // 更新時間
    updateRefreshTime();
});
