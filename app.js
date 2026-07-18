// ==========================================================================
// 1. 全域狀態與初始化
// ==========================================================================
let allSummaries = [];
let currentFilteredData = [];
let adTemplates = [];           // 專門用來存放抓下來的個人廣告
let currentTag = 'all';
let searchQuery = '';

// 銜尾蛇無限滾動狀態
let renderedCount = 0;          // 已經渲染了幾張卡片
const BATCH_SIZE = 12;          // 每次觸發載入的數量
let unseenNewItems = [];        // 存放「剛進來但還沒塞進畫面」的新資料
let observer = null;

// ==========================================================================
// 2. 核心功能：動態渲染卡片
// ==========================================================================
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

        const isNew = item.isNewData ? "font-important" : "";
        const tagClass = item.isImportant ? "card-tag font-important" : `card-tag ${isNew}`;

        cardElement.innerHTML = `
            <!-- 右上角點點按鈕 -->
            <button class="card-more-btn" title="更多選項">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
            </button>
            
            <!-- 右上角懸浮選單 -->
            <div class="more-menu hidden">
                <button class="menu-item btn-save">儲存</button>
                <button class="menu-item btn-dislike">不喜歡</button>
                <button class="menu-item btn-hide">不要顯示</button>
            </div>

            <div class="${tagClass}">${item.isNewData ? '✨ 新推播 | ' : ''}${escapeHtml(item.tag)}</div>
            <h2 class="card-title">${escapeHtml(item.title)}</h2>
            <p class="card-snippet">${escapeHtml(item.snippet)}</p>
            
            <div class="card-meta">
                <div class="meta-left">
                    <span class="source">${escapeHtml(item.source)}</span>
                    <span class="divider">•</span>
                    <span class="time">${escapeHtml(item.time)}</span>
                </div>
                
                <div class="meta-actions">
                    <button class="action-btn like-btn" title="喜歡">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.5 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </button>
                    <button class="action-btn share-btn" title="分享">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        cardElement.addEventListener("click", () => {
            const modal = document.getElementById('article-modal');
            if (!modal) return;
            
            document.getElementById('modal-tag').textContent = item.tag;
            document.getElementById('modal-title').textContent = item.title;
            document.getElementById('modal-source').textContent = item.source;
            document.getElementById('modal-time').textContent = item.time;
            document.getElementById('modal-snippet').innerHTML = `<p>${escapeHtml(item.snippet)}</p>`;
            
            if (item.link) {
                document.getElementById('modal-snippet').innerHTML += `
                    <div style="margin-top: 24px; text-align: center;">
                        <a href="${item.link}" target="_blank" style="display:inline-block; padding: 10px 20px; background-color: var(--accent-color); color: white; text-decoration: none; border-radius: 8px; font-size: 0.9rem;">閱讀原文</a>
                    </div>`;
            }
            modal.classList.remove('hidden');
        });

        const moreBtn = cardElement.querySelector('.card-more-btn');
        const menu = cardElement.querySelector('.more-menu');
        const dislikeBtn = cardElement.querySelector('.btn-dislike');
        const hideBtn = cardElement.querySelector('.btn-hide');
        const saveBtn = cardElement.querySelector('.btn-save');
        const likeBtn = cardElement.querySelector('.like-btn');
        const shareBtn = cardElement.querySelector('.share-btn');

        moreBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelectorAll('.more-menu').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
            menu.classList.toggle('hidden');
        });

        saveBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.add('hidden');
            alert(`已將「${item.title}」加入儲存清單！`);
        });

        dislikeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.add('hidden');
            alert(`優化成功，系統將減少推薦「${item.tag}」分類的內容。`);
        });

        hideBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.add('hidden');
            cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.9)';
            setTimeout(() => cardElement.remove(), 300);
        });

        likeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            likeBtn.classList.toggle('liked');
        });

        shareBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            alert(`準備分享文章：${item.title}`);
        });

        container.appendChild(cardElement);
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll('.more-menu').forEach(m => m.classList.add('hidden'));
});

// ==========================================================================
// 3. 無限滾動邏輯 (銜尾蛇機制 - 智慧廣告混流版)
// ==========================================================================
function loadMore() {
    if (currentFilteredData.length === 0) return;

    const nextBatch = [];
    
    while (unseenNewItems.length > 0 && nextBatch.length < BATCH_SIZE) {
        nextBatch.push(unseenNewItems.shift());
    }

    while (nextBatch.length < BATCH_SIZE) {
        if (renderedCount < currentFilteredData.length) {
            nextBatch.push(currentFilteredData[renderedCount]);
        } else {
            const loopIndex = renderedCount - currentFilteredData.length;
            
            // 💡 修正微調：每 4 張舊卡片（餘數為0時）混入 1 張廣告
            if (adTemplates.length > 0 && loopIndex % 4 === 0) {
                const adIndex = Math.floor(loopIndex / 4) % adTemplates.length;
                nextBatch.push(adTemplates[adIndex]);
            } else {
                const newsIndex = renderedCount % currentFilteredData.length;
                nextBatch.push(currentFilteredData[newsIndex]);
            }
        }
        renderedCount++;
    }

    renderCards(nextBatch, true);
}

function setupInfiniteScroll() {
    const sentinel = document.getElementById('sentinel');
    if (!sentinel) return;

    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            setTimeout(loadMore, 300);
        }
    }, { rootMargin: '200px' });
    
    observer.observe(sentinel);
}

// ==========================================================================
// 4. 資料過濾核心
// ==========================================================================
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
    renderedCount = 0;      
    unseenNewItems = [];    
    
    const sentinel = document.getElementById('sentinel');
    const container = document.getElementById("wall-container");
    
    if (currentFilteredData.length === 0) {
        renderCards([]); 
        if (sentinel) sentinel.classList.add('hidden');
    } else {
        if (container) container.innerHTML = ""; 
        if (sentinel) sentinel.classList.remove('hidden');
        loadMore();      
    }
}

// ==========================================================================
// 5. 模擬後端即時推播新資料
// ==========================================================================
function simulateLiveUpdates() {
    setInterval(() => {
        if (allSummaries.length === 0) return;

        const randomIndex = Math.floor(Math.random() * allSummaries.length);
        const baseItem = allSummaries[randomIndex];

        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const newItem = {
            ...baseItem,
            id: Date.now(),       
            isNewData: true,      
            time: "剛剛",         
            title: `【即時】${baseItem.title}` 
        };
        
        allSummaries.unshift(newItem);
        
        let matchFilter = true;
        if (currentTag !== 'all' && newItem.tag !== currentTag) matchFilter = false;
        if (searchQuery !== '') matchFilter = false; 
        
        if (matchFilter) {
            currentFilteredData.unshift(newItem);
            unseenNewItems.push(newItem);
            
            console.log(`[${timeString} 推播成功] 分類：${newItem.tag} | 標題：${newItem.title}`);

            const badge = document.getElementById('new-data-badge');
            if (badge && window.scrollY > 200) {
                badge.classList.remove('hidden');
            }
        }
        
    }, 12000); 
}

// ==========================================================================
// 6. 事件監聽設定
// ==========================================================================
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const tabsContainer = document.getElementById('filter-tabs-container');
    const bttBtn = document.getElementById('back-to-top');
    const badge = document.getElementById('new-data-badge');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            searchQuery.length > 0 ? clearSearchBtn.classList.remove('hidden') : clearSearchBtn.classList.add('hidden');
            filterAndRenderData();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.classList.add('hidden');
            filterAndRenderData();
            searchInput.focus();
        });
    }

    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab');
            if (!clickedTab) return;
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            clickedTab.classList.add('active');
            
            currentTag = clickedTab.dataset.tag;
            loadSummaryData(); 
        });
    }

    if (bttBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                bttBtn.classList.remove('hidden');
            } else {
                bttBtn.classList.add('hidden');
            }
        });

        bttBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (badge) badge.classList.add('hidden'); 
        });
    }

    const modal = document.getElementById('article-modal');
    if (modal) {
        const modalClose = modal.querySelector('.modal-close');
        const modalOverlay = modal.querySelector('.modal-overlay');
        const closeModal = () => modal.classList.add('hidden');
        
        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    }
}

// ==========================================================================
// 7. 工具函式與資料載入入口
// ==========================================================================

// 💡 完美補回：防禦 XSS 攻擊的字串轉譯工具函式
function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

async function loadSummaryData() {
    const container = document.getElementById("wall-container");
    const fetchUrl = `https://news-api.zhtttttt.workers.dev/?tag=${encodeURIComponent(currentTag)}`;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        
        allSummaries = await response.json();
        
        // 💡 修正正名：改去悄悄預載專屬的廣告檔案 ads.json，不與新聞備援檔案搶車位
        try {
            const adResponse = await fetch('./data/ads.json');
            adTemplates = await adResponse.json();
        } catch (adError) {
            console.log("廣告庫載入失敗，將使用預設新聞輪迴");
        }

        currentFilteredData = allSummaries;
        renderedCount = 0;
        unseenNewItems = [];
        
        if (container) container.innerHTML = ""; 
        const sentinel = document.getElementById('sentinel');
        if (sentinel) sentinel.classList.remove('hidden');
        
        loadMore(); 
        if (!observer) setupInfiniteScroll();
        
    } catch (error) {
        console.error("真實新聞連線失敗，啟動本地快取備援", error);
        try {
            // ✅ 安全降落：連線失敗時，這台老鐵車依然去讀取真正的舊新聞備份 summaries.json
            const fallback = await fetch('./data/summaries.json');
            allSummaries = await fallback.json();
            filterAndRenderData(); 
            if (!observer) setupInfiniteScroll();
        } catch (e) {
            if (container) container.innerHTML = `<div class="loading-text" style="color: #ea4335;">系統完全中斷，請檢查網路連線。</div>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadSummaryData();
    setupEventListeners();
});
