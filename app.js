// 全域狀態
let allSummaries = [];
let currentFilteredData = [];
let currentTag = 'all';
let searchQuery = '';

// 銜尾蛇無限滾動狀態
let renderedCount = 0;          // 已經渲染了幾張卡片
const BATCH_SIZE = 12;          // 每次觸發載入的數量
let unseenNewItems = [];        // 存放「剛進來但還沒塞進畫面」的新資料
let observer = null;

// 1. 核心渲染卡片 (支援 append 附加模式)
function renderCards(dataArray, append = false) {
    const container = document.getElementById("wall-container");
    if (!container) return;

    if (!append) container.innerHTML = "";

    if (dataArray.length === 0 && !append) {
        container.innerHTML = `<div class="loading-text">找不到符合的摘要內容。</div>`;
        return;
    }

    dataArray.forEach(item => {
        const cardElement = document.createElement("article");
        cardElement.classList.add("card");
        if (item.isFeatured) cardElement.classList.add("featured");

        // 如果是新穿插進來的，我們給它一個亮色標籤來區分
        const isNew = item.isNewData ? "font-important" : "";
        const tagClass = item.isImportant ? "card-tag font-important" : `card-tag ${isNew}`;

        cardElement.innerHTML = `
            <div class="${tagClass}">${item.isNewData ? '✨ 新推播 | ' : ''}${escapeHtml(item.tag)}</div>
            <h2 class="card-title">${escapeHtml(item.title)}</h2>
            <p class="card-snippet">${escapeHtml(item.snippet)}</p>
            <div class="card-meta">
                <span class="source">${escapeHtml(item.source)}</span>
                <span class="divider">•</span>
                <span class="time">${escapeHtml(item.time)}</span>
            </div>
        `;
        container.appendChild(cardElement);
    });
}

// 2. 載入下一批次 (銜尾蛇 + 穿插新資料邏輯)
function loadMore() {
    if (currentFilteredData.length === 0) return;

    const nextBatch = [];
    
    // 💡 步驟 A：優先把「剛進來的新資料」穿插進這次的載入中
    while (unseenNewItems.length > 0 && nextBatch.length < BATCH_SIZE) {
        nextBatch.push(unseenNewItems.shift()); // 從佇列最前面拿出來
    }

    // 💡 步驟 B：補足剩下的數量，利用 % (餘數) 達成無限輪迴
    while (nextBatch.length < BATCH_SIZE) {
        const dataIndex = renderedCount % currentFilteredData.length;
        nextBatch.push(currentFilteredData[dataIndex]);
        renderedCount++;
    }

    // 附加到 DOM 的尾端
    renderCards(nextBatch, true);
}

// 3. 設定底部偵測 (Intersection Observer)
function setupInfiniteScroll() {
    const sentinel = document.getElementById('sentinel');
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            // 當哨兵進入畫面時，延遲 300 毫秒製造載入感，然後觸發 loadMore
            setTimeout(loadMore, 300);
        }
    }, { rootMargin: '200px' }); // 提早 200px 觸發，讓使用者感覺不到卡頓
    
    observer.observe(sentinel);
}

// 4. 複合篩選與重置
function filterAndRenderData() {
    let filtered = allSummaries;
    
    if (currentTag !== 'all') {
        filtered = filtered.filter(item => item.tag === currentTag);
    }
    
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            item.title.toLowerCase().includes(query) || 
            item.snippet.toLowerCase().includes(query) ||
            item.source.toLowerCase().includes(query)
        );
    }

    currentFilteredData = filtered;
    renderedCount = 0;      // 切換標籤或搜尋時，重置渲染計數
    unseenNewItems = [];    // 清空未讀佇列
    
    const sentinel = document.getElementById('sentinel');
    const container = document.getElementById("wall-container"); // 💡 確保抓到容器
    
    if (currentFilteredData.length === 0) {
        renderCards([]); // 真的沒資料時，才去顯示提示文字
        sentinel.classList.add('hidden');
    } else {
        // 💡 修正這裡：只做單純的 HTML 清空，不要呼叫 renderCards([]) 觸發錯誤提示文字
        if (container) container.innerHTML = ""; 
        
        sentinel.classList.remove('hidden');
        loadMore();      // 塞入第一批
    }
}

// 5. 模擬後端即時推播新資料 (測試用) - 已移除 update-time 避免手機端/電腦端報錯
function simulateLiveUpdates() {
    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const newItem = {
            id: Date.now(),
            tag: "焦點新聞",
            isFeatured: false,
            isImportant: true,
            isNewData: true,
            title: `【即時更新】來自邊緣伺服器的新動態 (${timeString})`,
            snippet: "這是一筆剛剛由系統自動推播進來的新資料。我們透過佇列設計，成功將它穿插進你正在往下滾動的瀑布流之中！",
            source: "系統推播中心",
            time: "剛剛"
        };
        
        allSummaries.unshift(newItem);
        
        let matchFilter = true;
        if (currentTag !== 'all' && newItem.tag !== currentTag) matchFilter = false;
        if (searchQuery !== '') matchFilter = false;
        
        if (matchFilter) {
            currentFilteredData.unshift(newItem);
            unseenNewItems.push(newItem);
            
            // 💡 主控台紀錄紀錄即可，不再頻繁操作已刪除的 HTML 節點
            console.log(`即時推播資料流於 ${timeString} 完成同步。`);

            // 當有新資料進來時，如果使用者正在往下滾，亮起紅點提示
            const badge = document.getElementById('new-data-badge');
            if (badge && window.scrollY > 200) {
                badge.classList.remove('hidden');
            }
        }
        
    }, 12000); 
}

// 事件監聽與其他工具函式
// 修改後的監聽器函式
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const tabsContainer = document.getElementById('filter-tabs-container');
    
    // 💡 取得新增的按鈕與紅點元素
    const bttBtn = document.getElementById('back-to-top');
    const badge = document.getElementById('new-data-badge');

    // A. 監聽搜尋與分類 (維持原本邏輯)
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        searchQuery.length > 0 ? clearSearchBtn.classList.remove('hidden') : clearSearchBtn.classList.add('hidden');
        filterAndRenderData();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        filterAndRenderData();
        searchInput.focus();
    });

    tabsContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab');
        if (!clickedTab) return;
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        clickedTab.classList.add('active');
        currentTag = clickedTab.dataset.tag;
        filterAndRenderData();
    });

    // 💡 B. 監聽視窗滾動：超過一定高度才顯示回到頂部按鈕
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            bttBtn.classList.remove('hidden');
        } else {
            bttBtn.classList.add('hidden');
        }
    });

    // 💡 C. 點擊按鈕：平滑滾動回頂端，並清除新資料紅點
    bttBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // 原生平滑滾動
        });
        badge.classList.add('hidden'); // 清除紅點
    });
}

// 修改後的模擬推播函式（讓它與紅點連動）
function simulateLiveUpdates() {
    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const newItem = {
            id: Date.now(),
            tag: "焦點新聞",
            isFeatured: false,
            isImportant: true,
            isNewData: true,
            title: `【即時更新】來自邊緣伺服器的新動態 (${timeString})`,
            snippet: "這是一筆剛剛由系統自動推播進來的新資料。我們透過佇列設計，成功將它穿插進你正在往下滾動的瀑布流之中！",
            source: "系統推播中心",
            time: "剛剛"
        };
        
        allSummaries.unshift(newItem);
        
        let matchFilter = true;
        if (currentTag !== 'all' && newItem.tag !== currentTag) matchFilter = false;
        if (searchQuery !== '') matchFilter = false;
        
        if (matchFilter) {
            currentFilteredData.unshift(newItem);
            unseenNewItems.push(newItem);
            
            document.getElementById("update-time").textContent = `今天 ${timeString} 已更新`;

            // 💡 新增：當有新資料進來時，如果使用者正點在往下滾，亮起紅點提示
            const badge = document.getElementById('new-data-badge');
            if (badge && window.scrollY > 200) {
                badge.classList.remove('hidden');
            }
        }
        
    }, 12000); 
}


function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

async function loadSummaryData() {
    const container = document.getElementById("wall-container");
    try {
        const response = await fetch('./data/summaries.json');
        if (!response.ok) throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        allSummaries = await response.json();
        filterAndRenderData();
        setupInfiniteScroll();
        simulateLiveUpdates(); // 啟動即時推播模擬
    } catch (error) {
        console.error("讀取資料失敗:", error);
        if (container) container.innerHTML = `<div class="loading-text" style="color: #ea4335;">資料載入失敗，請確認路徑。</div>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadSummaryData();
    setupEventListeners();
});
