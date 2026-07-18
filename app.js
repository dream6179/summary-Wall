// 1. 模擬資料 (Mock Data) - 未來可以直接換成 fetch(API) 的結果
const mockSummaries = [
    {
        id: 1,
        tag: "焦點新聞",
        isFeatured: true, // 控制是否為大圖焦點排版
        isImportant: true,
        title: "探討未來科技趨勢：AI 代理與邊緣運算的全新整合方案",
        snippet: "隨著硬體效能的突破，新一代 AI 代理服務正逐步轉移至終端設備運行，這不僅大大幅降低了雲端傳輸的延遲，更為個人隱私提供了層防護，未來這項技術將深入穿戴式裝置與智慧家居中。",
        source: "科技新報",
        time: "15 分鐘前"
    },
    {
        id: 2,
        tag: "社群動態",
        isFeatured: false,
        isImportant: false,
        title: "開源社群舉辦黑客松，吸引超過五百位開發者線上共襄盛舉",
        snippet: "本次黑客松以「自動化與生活生產力」為主題，參賽團隊利用各式 Serverless 工具在短短 48 小時內打造出多款極具創新的自動化流程腳本。",
        source: "技術週刊",
        time: "2 小時前"
    },
    {
        id: 3,
        tag: "遊戲資訊",
        isFeatured: false,
        isImportant: false,
        title: "知名開放世界遊戲迎來重大版本更新，全新地圖細節與生態系公開",
        snippet: "開發團隊在今天的直播中展示了新地區的實機畫面。除了新增獨特的解謎機制外，也對既有的戰隊搭配與元素傷害計算公式進行了最佳化調整，大幅提升流暢度。",
        source: "電玩情報站",
        time: "5 小時前"
    },
    {
        id: 4,
        tag: "日常筆記",
        isFeatured: false,
        isImportant: false,
        title: "高效能前端專案託管指南：為什麼你該試試 Cloudflare Pages？",
        snippet: "對於純 HTML/CSS/JS 的專案來說，利用邊緣網路託管不僅部署速度極快，還能原生整合 Worker 提供輕量級 API 後端，是現代開發者的首選方案。",
        source: "個人網誌",
        time: "昨天"
    },
    {
        id: 5,
        tag: "開發進度",
        isFeatured: false,
        isImportant: true,
        title: "專案里程碑更新：摘要牆基礎框架與 JS 動態渲染邏輯建置完成",
        snippet: "成功將前端畫面與資料層解耦（Decoupling）。目前已達成透過資料陣列驅動 UI 的目標，下一步將規劃與後端資料庫或自動化排程腳本進行對接測試。",
        source: "本地日誌",
        time: "剛剛"
    }
];

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
