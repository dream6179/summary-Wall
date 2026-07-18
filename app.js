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
let itemsSinceAd = 24;          
let itemsSincePromo = 6;        

// ==========================================================================
// 2. 核心功能：動態渲染卡片 (💡 瀑布流全方位 AI 滿圖進化)
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

        // 💡 🌟【瀑布流滿圖核心改裝】：如果新聞沒附圖，直接讓外部卡片也去戳後端的生圖路由！
        const cardImgUrl = item.image ? item.image : `https://news-api.zhtttttt.workers.dev/?aiImageTitle=${encodeURIComponent(item.title)}`;
        const imgLoadAttr = !item.image ? `onload="this.parentElement.style.animation='none'"` : '';
        const imgContainerStyle = !item.image ? `style="background-color:#f1f3f4; position:relative; animation: badgePulse 2s infinite;"` : '';

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

            <!-- 💡 這裡改成不論有沒有原圖都強制渲染相框，沒原圖就原地秀出 AI 畫布 -->
            <div class="card-image-container" ${imgContainerStyle}>
                <img src="${cardImgUrl}" class="card-image" alt="news thumbnail" loading="lazy" ${imgLoadAttr}>
                ${!item.image ? `<div style="position:absolute; bottom:6px; right:6px; background-color:rgba(0,0,0,0.6); color:white; font-size:0.55rem; padding:2px 6px; border-radius:4px; pointer-events:none;">🍌 AI 畫布</div>` : ''}
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

        // 點擊詳細視窗 (保持原汁原味的秒開摘要 + 點擊後不重複生圖)
        // 💡 🌟【微距緊湊優化版】：點擊秒開原始摘要，強制重設瀏覽器預設邊距
        // 💡 🌟【微距緊湊優化版】：點擊秒開原始摘要，強制重設瀏覽器預設邊距
        cardElement.addEventListener("click", async () => {
            const modal = document.getElementById('article-modal');
            if (!modal) return;
            
            // 🚀【終極救磚：置頂魔術】：每次一打開，不管三七二十一，強制所有滾動容器全部滾回最頂端！
            modal.scrollTop = 0; 
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.scrollTop = 0;
            const modalSnippetContainer = document.getElementById('modal-snippet');
            if (modalSnippetContainer) modalSnippetContainer.scrollTop = 0;
            
            document.getElementById('modal-tag').textContent = item.tag;
            document.getElementById('modal-title').textContent = item.title;
            document.getElementById('modal-source').textContent = item.source;
            document.getElementById('modal-time').textContent = item.time;
            
            // 🍌 圖片相框：將底部的間距縮小到 12px，並加上 border-radius 防止破版
            let modalImageHtml = '';
            if (item.image) {
                modalImageHtml = `<div class="modal-image-container" style="margin: 0 0 12px 0; border-radius: 8px; overflow: hidden; display: block;"><img src="${item.image}" class="modal-image" alt="modal img" style="width:100%; display:block; object-fit:cover;"></div>`;
            } else {
                const bananaGenUrl = `https://news-api.zhtttttt.workers.dev/?aiImageTitle=${encodeURIComponent(item.title)}`;
                modalImageHtml = `
                    <div class="modal-image-container" style="background-color:#f1f3f4; position:relative; animation: badgePulse 2s infinite; margin: 0 0 12px 0; border-radius:8px; overflow:hidden; aspect-ratio: 16/9;">
                        <img src="${bananaGenUrl}" class="modal-image" alt="Banana Gen Art" style="width:100%; height:100%; object-fit:cover; display:block;" onload="this.parentElement.style.animation='none'">
                        <div style="position:absolute; bottom:6px; right:6px; background-color:rgba(0,0,0,0.6); color:white; font-size:0.55rem; padding:2px 6px; border-radius:4px; pointer-events:none;">🍌 奈米香蕉 AI 畫布</div>
                    </div>
                `;
            }

            // 閱讀原文按鈕：微調頂部間距為 14px 即可
            let modalLinkHtml = item.link ? `<div style="margin: 14px 0 0 0; text-align: center; padding: 0;"><a href="${item.link}" target="_blank" style="display:inline-block; padding: 8px 20px; background-color: var(--accent-color); color: white; text-decoration: none; border-radius: 6px; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px;">閱讀原文</a></div>` : '';

            if (item.id.includes('ad-') || item.id.includes('promo-') || item.id.includes('test-')) {
                document.getElementById('modal-snippet').innerHTML = `${modalImageHtml}<p style="font-size:1rem; line-height:1.6; color:var(--text-main); margin: 0 0 12px 0; padding: 0;">${escapeHtml(item.snippet)}</p>${modalLinkHtml}`;
                modal.classList.remove('hidden');
                history.pushState({ modalOpen: true }, '');
            } else {
                // 📰 正常新聞版面：徹底拔除所有預設 margin (設為 0)，完全由我們精準配給間距
                document.getElementById('modal-snippet').innerHTML = `
                    ${modalImageHtml}
                    
                    <!-- 💡 新聞摘要區：強制 margin: 0 0 14px 0，拒絕瀏覽器預設拉開 -->
                    <p style="font-size: 1rem; line-height: 1.6; color: var(--text-main); margin: 0 0 14px 0; padding: 0; white-space: pre-wrap;">
                        ${escapeHtml(item.snippet)}
                    </p>
                    
                    <!-- 💡 AI 面板區：margin: 0 0 12px 0 緊咬上方的摘要 -->
                    <div id="modal-ai-panel" style="background-color: #f4f8ff; border: 1px solid #e1eefd; border-left: 4px solid var(--accent-color); padding: 12px 14px; border-radius: 10px; margin: 0 0 12px 0; white-space: normal;">
                        
                        <!-- 標題部分強制 margin 歸零 -->
                        <h4 style="color: var(--accent-color); margin: 0 0 6px 0; padding: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; font-weight: 600;">
                            <span style="font-size:1.1rem;">🧠</span> Gemini 核心即時趨勢剖析
                        </h4>
                        
                        <!-- 回傳文字區強制 margin 歸零 -->
                        <div id="ai-response-box" style="font-size: 0.92rem; color: #3c4043; line-height: 1.55; margin: 0; padding: 0;">
                            <span style="display:inline-block; animation: badgePulse 1.6s infinite; margin-right: 6px;">⚡</span> AI正在線上進行數據剖析與衍生解讀...
                        </div>
                        
                        <!-- 免責聲明：稍微調緊頂部間距 -->
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px; border-top: 1px dashed #dadce0; padding-top: 8px; line-height: 1.4;">
                            ⚠️ <strong>模組提示：</strong>本區塊由 AI 自動產出，注意潛在幻覺風險，請以官方公告為準。
                        </div>
                    </div>
                    
                    ${modalLinkHtml}
                `;
                
                modal.classList.remove('hidden');
                history.pushState({ modalOpen: true }, '');

                // 🚀 ✅ 換上這段：自動幫 AI 斷句、包裝段落與粗體標題
                try {
                    const fetchUrl = `https://news-api.zhtttttt.workers.dev/?aiTitle=${encodeURIComponent(item.title)}&aiSnippet=${encodeURIComponent(item.snippet)}`;
                    const response = await fetch(fetchUrl);
                    const aiCommentary = await response.text();
                    
                    const aiBox = document.getElementById('ai-response-box');
                    if (aiBox) {
                        // 🧙‍♂️ 賽博排版大師：依據 AI 的雙換行符號，切成真正的 HTML 段落陣列
                        const paragraphs = aiCommentary.split('\n\n');
                        
                        const finalHtml = paragraphs.map(p => {
                            if (!p.trim()) return '';
                            // 先進行安全轉義（防破版），再把 AI 產生的 **標題** 抽換成實體 <strong> 標籤
                            let cleanText = escapeHtml(p.trim()).replace(/\*\*(.*?)\*\//g, '<strong>$1</strong>');
                            
                            // 有時候 AI 結尾會帶有多餘的粗體未閉合，加做一層萬能雙星號安全交叉防護
                            cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            
                            return `<p>${cleanText}</p>`;
                        }).join('');
                        
                        // 完美的把排版好的乾淨 HTML 灌入面板
                        aiBox.innerHTML = finalHtml;
                    }
                } catch (error) {
                    const aiBox = document.getElementById('ai-response-box');
                    if (aiBox) {
                        aiBox.innerHTML = `<p>AI 智囊團目前連線逾時，請點擊下方閱讀原文按鈕查看完整內容。</p>`;
                    }
                }
        });

        // 按鈕監聽防冒泡
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

        saveBtn.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.add('hidden'); alert(`已將「${item.title}」加入儲存清單！`); });
        dislikeBtn.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.add('hidden'); alert(`優化成功，系統將減少推薦「${item.tag}」分類的內容。`); });
        hideBtn.addEventListener("click", (e) => {
            e.stopPropagation(); menu.classList.add('hidden');
            cardElement.style.transition = 'opacity 0.3s, transform 0.3s'; cardElement.style.opacity = '0'; cardElement.style.transform = 'scale(0.9)';
            setTimeout(() => cardElement.remove(), 300);
        });

        likeBtn.addEventListener("click", (e) => { e.stopPropagation(); likeBtn.classList.toggle('liked'); });
        shareBtn.addEventListener("click", (e) => { e.stopPropagation(); alert(`準備分享文章：${item.title}`); });
        container.appendChild(cardElement);
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll('.more-menu').forEach(m => m.classList.add('hidden'));
});

// ==========================================================================
// 3. 無限滾動邏輯
// ==========================================================================
function loadMore() {
    if (currentFilteredData.length === 0 && testTemplates.length === 0 && promoTemplates.length === 0 && adTemplates.length === 0) return;

    const nextBatch = [];
    while (unseenNewItems.length > 0 && nextBatch.length < BATCH_SIZE) { nextBatch.push(unseenNewItems.shift()); }

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
        } else { break; }

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

    const modal = document.getElementById('article-modal');
    if (modal) {
        const modalClose = modal.querySelector('.modal-close');
        const modalOverlay = modal.querySelector('.modal-overlay');
        const triggerBack = () => { if (!modal.classList.contains('hidden')) { history.back(); } };
        if (modalClose) modalClose.addEventListener('click', triggerBack);
        if (modalOverlay) modalOverlay.addEventListener('click', triggerBack);
    }

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
} 

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
