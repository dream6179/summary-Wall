// ==========================================================================
// 1. 全域狀態與初始化
// ==========================================================================
let allSummaries = [];
let currentFilteredData = [];

let testTemplates = [];         // 1. 測試檔案 (來自 summaries.json)
let promoTemplates = [];        // 2. 固定推廣的資訊 (來自 promo.json)
let adTemplates = [];           // 3. 手動修改的廣告 (來自 ads.json)

let currentTag = 'all';
let searchQuery = '';

let renderedCount = 0;          
const BATCH_SIZE = 12;          
let unseenNewItems = [];        
let observer = null;

let newsPointer = 0;            
let itemsSinceTest = 0;         
let itemsSinceAd = 24;          // 初始 24 讓第一批必出廣告
let itemsSincePromo = 6;        

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
            <button class="card-more-btn" title="更多選項">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
            </button>
            
            <div class="more-menu hidden">
                <button class="menu-item btn-save">儲存</button>
                <button class="menu-item btn-dislike">不喜歡</button>
                <button class="menu-item btn-hide">不要顯示</button>
            </div>

            ${item.image ? `
            <div class="card-image-container">
                <img src="${item.image}" class="card-image" alt="news thumbnail" loading="lazy">
            </div>
            ` : ''}

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

        // 點擊卡片彈出新聞視窗
        cardElement.addEventListener("click", () => {
            const modal = document.getElementById('article-modal');
            if (!modal) return;
            
            document.getElementById('modal-tag').textContent = item.tag;
            document.getElementById('modal-title').textContent = item.title;
            document.getElementById('modal-source').textContent = item.source;
            document.getElementById('modal-time').textContent = item.time;
            
            let modalBodyHtml = '';
            if (item.image) {
                modalBodyHtml += `
                <div class="modal-image-container">
                    <img src="${item.image}" class="modal-image" alt="modal features">
                </div>`;
            }
            modalBodyHtml += `<p>${escapeHtml(item.snippet)}</p>`;
            
            if (item.link) {
                modalBodyHtml += `
                    <div style="margin-top: 24px; text-align: center;">
                        <a href="${item.link}" target="_blank" style="display:inline-block; padding: 10px 20px; background-color: var(--accent-color); color: white; text-decoration: none; border-radius: 8px; font-size: 0.9rem;">閱讀原文</a>
                    </div>`;
            }
            
            document.getElementById('modal-snippet').innerHTML = modalBodyHtml;
            modal.classList.remove('hidden');
            history.pushState({ modalOpen: true }, '');
        });

        // 內部按鈕綁定
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
// 3. 無限滾動邏輯 (精密三路廣告插播機制)
// ==========================================================================
function loadMore() {
    if (currentFilteredData.length === 0 && testTemplates.length === 0 && promoTemplates.length === 0 && adTemplates.length === 0) return;

    const nextBatch = [];
    while (unseenNewItems.length > 0 && nextBatch.length < BATCH_SIZE) {
        nextBatch.push(unseenNewItems.shift());
    }

    while (nextBatch.length < BATCH_SIZE) {
        if (itemsSinceTest >= 6 && testTemplates.length > 0) {
            const randomIdx = Math.floor(Math.random() * testTemplates.length);
            nextBatch.push({ ...testTemplates[randomIdx], id: `test-${Math.random().toString(36).substring(2, 9)}` });
            itemsSinceTest = 0; renderedCount++; continue; 
        }
        if (itemsSinceAd >= 6 && adTemplates.length > 0) {
            const randomIdx = Math.floor(Math.random() * adTemplates.length);
            nextBatch.push({ ...adTemplates[randomIdx], id: `ad-${Math.random().toString(36).substring(2, 9)}` });
            itemsSinceAd = 0; renderedCount++; continue; 
        }
        if (itemsSincePromo >= 10 && promoTemplates.length > 0) {
            const randomIdx = Math.floor(Math.random() * promoTemplates.length);
            nextBatch.push({ ...promoTemplates[randomIdx], id: `promo-${Math.random().toString(36).substring(2, 9)}` });
            itemsSincePromo = 0; renderedCount++; continue; 
        }

        if (currentFilteredData.length > 0) {
            const newsIndex = newsPointer % currentFilteredData.length;
            nextBatch.push(currentFilteredData[newsIndex]);
            newsPointer++;
        } else {
            break; 
        }

        itemsSinceTest++; itemsSinceAd++; itemsSincePromo++; renderedCount++;
    }
    renderCards(nextBatch, true);
}

function setupInfiniteScroll() {
    const sentinel = document.getElementById('sentinel');
    if (!sentinel) return;

    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { setTimeout(loadMore, 300); }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
}

// ==========================================================================
// 4. 資料過濾核心
// ==========================================================================
function filterAndRenderData() {
    let filtered = allSummaries;
    if (currentTag !== 'all') { filtered = filtered.filter(item => item.tag === currentTag); }
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            item.title.toLowerCase().includes(query) || item.snippet.toLowerCase().includes(query) || item.source.toLowerCase().includes(query)
        );
    }

    currentFilteredData = filtered;
    renderedCount = 0; unseenNewItems = []; newsPointer = 0;
    itemsSinceTest = 0; itemsSinceAd = 24; itemsSincePromo = 6;
    
    const sentinel = document.getElementById('sentinel');
    const container = document.getElementById("wall-container");
    
    if (currentFilteredData.length === 0) {
        renderCards([]); if (sentinel) sentinel.classList.add('hidden');
    } else {
        if (container) container.innerHTML = ""; if (sentinel) sentinel.classList.remove('hidden');
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
        const newItem = { ...baseItem, id: Date.now(), isNewData: true, time: "剛剛", title: `【即時】${baseItem.title}` };
        allSummaries.unshift(newItem);
        
        let matchFilter = true;
        if (currentTag !== 'all' && newItem.tag !== currentTag) matchFilter = false;
        if (searchQuery !== '') matchFilter = false; 
        
        if (matchFilter) {
            currentFilteredData.unshift(newItem); unseenNewItems.push(newItem);
            const badge = document.getElementById('new-data-badge');
            if (badge && window.scrollY > 200) { badge.classList.remove('hidden'); }
        }
    }, 12000); 
}

// ==========================================================================
// 6. 事件監聽設定 (✅ 完美融合版：確保所有點擊事件、齒輪與分享絕不遺漏)
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
            searchInput.value = ''; searchQuery = ''; clearSearchBtn.classList.add('hidden');
            filterAndRenderData(); searchInput.focus();
        });
    }

    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab'); if (!clickedTab) return;
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            clickedTab.classList.add('active');
            currentTag = clickedTab.dataset.tag; loadSummaryData(); 
        });
    }

    if (bttBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) { bttBtn.classList.remove('hidden'); } else { bttBtn.classList.add('hidden'); }
        });
        bttBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' }); if (badge) badge.classList.add('hidden'); 
        });
    }

    // 文章彈窗關閉攔截
    const modal = document.getElementById('article-modal');
    if (modal) {
        const modalClose = modal.querySelector('.modal-close');
        const modalOverlay = modal.querySelector('.modal-overlay');
        const triggerBack = () => { if (!modal.classList.contains('hidden')) { history.back(); } };
        if (modalClose) modalClose.addEventListener('click', triggerBack);
        if (modalOverlay) modalOverlay.addEventListener('click', triggerBack);
    }

    // ⚙️ 設定彈窗與智慧分享控制 (完美歸位)
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const shareBtn = document.getElementById('settings-share-btn');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            history.pushState({ modalOpen: true }, '');
        });
        const closeBtn = settingsModal.querySelector('.modal-close');
        const overlay = settingsModal.querySelector('.modal-overlay');
        const triggerSettingsBack = () => { if (!settingsModal.classList.contains('hidden')) { history.back(); } };
        if (closeBtn) closeBtn.addEventListener('click', triggerSettingsBack);
        if (overlay) overlay.addEventListener('click', triggerSettingsBack);
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({ title: '摘要牆', text: '來看即時摘要牆！', url: window.location.href })
                .then(() => console.log('分享成功')).catch((err) => console.log('取消分享', err));
            } else {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    const originalText = shareBtn.innerHTML; shareBtn.style.backgroundColor = '#34a853'; shareBtn.innerHTML = '✅ 網址已成功複製！';
                    setTimeout(() => { shareBtn.style.backgroundColor = ''; shareBtn.innerHTML = originalText; }, 2000);
                }).catch(() => { alert('複製失敗：' + window.location.href); });
            }
        });
    }
} // 閉合 setupEventListeners

// ==========================================================================
// 7. 工具函式與資料載入入口
// ==========================================================================
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
        
        try {
            const [testRes, promoRes, adRes] = await Promise.all([
                fetch('./data/summaries.json').then(r => r.json()).catch(() => []),
                fetch('./data/promo.json').then(r => r.json()).catch(() => []),
                fetch('./data/ads.json').then(r => r.json()).catch(() => [])
            ]);
            testTemplates = testRes; promoTemplates = promoRes; adTemplates = adRes;
        } catch (localError) { console.log("本地特殊卡片預載失敗"); }

        currentFilteredData = allSummaries;
        renderedCount = 0; unseenNewItems = []; newsPointer = 0;
        itemsSinceTest = 0; itemsSinceAd = 24; itemsSincePromo = 6;
        
        if (container) container.innerHTML = ""; 
        const sentinel = document.getElementById('sentinel');
        if (sentinel) sentinel.classList.remove('hidden');
        
        loadMore(); 
        if (!observer) setupInfiniteScroll();
        
    } catch (error) {
        console.error("真實新聞連線失敗，啟動本地快取備援", error);
        try {
            const fallback = await fetch('./data/summaries.json');
            allSummaries = await fallback.json();
            testTemplates = allSummaries; filterAndRenderData(); 
            if (!observer) setupInfiniteScroll();
        } catch (e) {
            if (container) container.innerHTML = `<div class="loading-text" style="color: #ea4335;">系統完全中斷，請檢查網路連線。</div>`;
        }
    }
}

// 📱 全局手機返回鍵 / 側滑返回完美雙攔截器
window.addEventListener('popstate', (event) => {
    const articleModal = document.getElementById('article-modal');
    const settingsModal = document.getElementById('settings-modal');
    if (articleModal && !articleModal.classList.contains('hidden')) { articleModal.classList.add('hidden'); }
    if (settingsModal && !settingsModal.classList.contains('hidden')) { settingsModal.classList.add('hidden'); }
});

document.addEventListener("DOMContentLoaded", () => {
    loadSummaryData();
    setupEventListeners();
});
