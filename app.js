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

const API_BASE_URL = "https://news-api.zhtttttt.workers.dev";

// ==========================================================================
// 🚀 賽博聊天室前端連線引擎
// ==========================================================================
let socket = null;
const chatUrl = "wss://news-wall-chat.zhtttttt.workers.dev/ws";
// 暫時隨機生成一個暱稱，之後你可以改成抓取使用者輸入
const myUsername = "情報員_" + Math.floor(Math.random() * 9000 + 1000); 

function initChatEngine() {
  console.log("⚡ 正在開通與太空艙的即時連線...");
  socket = new WebSocket(chatUrl);

  // 1. 連線成功建立
  socket.onopen = () => {
    console.log("🟩 已成功潛入即時聊天室！");
  };

  // 2. 接收太空艙廣播的訊息
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.system) {
        // 📢 處理系統點名：例如「新情報員加入。🔥 目前在線：3 人」
        updateSystemStatus(data.message);
      } else {
        // 💬 處理一般人的對話訊息
        appendMessageBubble(data.user, data.text, data.user === myUsername);
      }
    } catch (err) {
      console.error("❌ 解析廣播封包失敗:", err);
    }
  };

  // 3. 自動重連機制（萬一伺服器抽筋或網路斷開，10秒後自動復活）
  socket.onclose = () => {
    console.log("🟥 與太空艙斷開連線，10秒後嘗試自動重連...");
    setTimeout(() => {
      initChatEngine();
    }, 10000);
  };
}

// ✍️ 送出訊息的觸發函式（例如綁定在點擊「送出」按鈕或按下 Enter 時）
function sendMessage(textInput) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !textInput.trim()) return;

  const payload = {
    user: myUsername,
    text: textInput.trim(),
    timestamp: Date.now()
  };

  // 啪一聲，毫秒級送上雲端記憶體
  socket.send(JSON.stringify(payload));
}

// ==========================================================================
// 🎨 UI 渲染介面介接（真正負責把資料噴上畫面！）
// ==========================================================================
function updateSystemStatus(msg) {
  const statusEl = document.getElementById("chat-status");
  if (statusEl) {
    statusEl.innerText = msg; // 動態更新在線人數（例如：🔥 目前在線：3 人）
  } else {
    console.log("📢 系統提示：", msg);
  }
}

function appendMessageBubble(user, text, isMe) {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) {
    console.log(`💬 [${user}] 說: ${text}`);
    return;
  }
  
  // 建立賽博風對話氣泡
  const bubbleWrapper = document.createElement("div");
  bubbleWrapper.style.margin = "8px 0";
  bubbleWrapper.style.display = "flex";
  bubbleWrapper.style.flexDirection = "column";
  bubbleWrapper.style.alignItems = isMe ? "flex-end" : "flex-start";

  bubbleWrapper.innerHTML = `
    <span style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">${escapeHtml(user)}</span>
    <div style="
      padding: 8px 12px; 
      border-radius: 12px; 
      font-size: 0.9rem; 
      max-width: 75%; 
      word-break: break-all;
      background-color: ${isMe ? "var(--accent-color)" : "#e8eaed"}; 
      color: ${isMe ? "white" : "var(--text-main)"};
      border-bottom-${isMe ? "right" : "left"}-radius: 2px;
    ">
      ${escapeHtml(text)}
    </div>
  `;

  chatBox.appendChild(bubbleWrapper);
  
  // 🧙‍♂️ 貼心細節：有人發話時，對話框自動滾動到最底部
  chatBox.scrollTop = chatBox.scrollHeight;
}

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

        const cardImgUrl = item.image ? item.image : `${API_BASE_URL}/?aiImageTitle=${encodeURIComponent(item.title)}`;
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

        cardElement.addEventListener("click", async () => {
            const modal = document.getElementById('article-modal');
            if (!modal) return;
            
            modal.scrollTop = 0; 
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.scrollTop = 0;
            const modalSnippetContainer = document.getElementById('modal-snippet');
            if (modalSnippetContainer) modalSnippetContainer.scrollTop = 0;
            
            document.getElementById('modal-tag').textContent = item.tag;
            document.getElementById('modal-title').textContent = item.title;
            document.getElementById('modal-source').textContent = item.source;
            document.getElementById('modal-time').textContent = item.time;
            
            let modalImageHtml = '';
            if (item.image) {
                modalImageHtml = `<div class="modal-image-container" style="margin: 0 0 12px 0; border-radius: 8px; overflow: hidden; display: block;"><img src="${item.image}" class="modal-image" alt="modal img" style="width:100%; display:block; object-fit:cover;"></div>`;
            } else {
                modalImageHtml = `
                    <div class="modal-image-container" style="background-color:#f1f3f4; position:relative; animation: badgePulse 2s infinite; margin: 0 0 12px 0; border-radius:8px; overflow:hidden; aspect-ratio: 16/9;">
                        <img src="${cardImgUrl}" class="modal-image" alt="Banana Gen Art" style="width:100%; height:100%; object-fit:cover; display:block;" onload="this.parentElement.style.animation='none'">
                        <div style="position:absolute; bottom:6px; right:6px; background-color:rgba(0,0,0,0.6); color:white; font-size:0.55rem; padding:2px 6px; border-radius:4px; pointer-events:none;">🍌 奈米香蕉 AI 畫布</div>
                    </div>
                `;
            }

            let modalLinkHtml = item.link ? `<div style="margin: 14px 0 0 0; text-align: center; padding: 0;"><a href="${item.link}" target="_blank" style="display:inline-block; padding: 8px 20px; background-color: var(--accent-color); color: white; text-decoration: none; border-radius: 6px; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px;">閱讀原文</a></div>` : '';

            if (item.id.includes('ad-') || item.id.includes('promo-') || item.id.includes('test-')) {
                document.getElementById('modal-snippet').innerHTML = `${modalImageHtml}<p style="font-size:1rem; line-height:1.6; color:var(--text-main); margin: 0 0 12px 0; padding: 0;">${escapeHtml(item.snippet)}</p>${modalLinkHtml}`;
                modal.classList.remove('hidden');
                history.pushState({ modalOpen: true }, '');
            } else {
                document.getElementById('modal-snippet').innerHTML = `
                    ${modalImageHtml}
                    <p style="font-size: 1rem; line-height: 1.6; color: var(--text-main); margin: 0 0 14px 0; padding: 0; white-space: pre-wrap;">
                        ${escapeHtml(item.snippet)}
                    </p>
                    <div id="modal-ai-panel" style="background-color: #f4f8ff; border: 1px solid #e1eefd; border-left: 4px solid var(--accent-color); padding: 12px 14px; border-radius: 10px; margin: 0 0 12px 0; white-space: normal;">
                        <h4 style="color: var(--accent-color); margin: 0 0 6px 0; padding: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; font-weight: 600;">
                            <span style="font-size:1.1rem;">🧠</span> Gemini 核心即時趨勢剖析
                        </h4>
                        <div id="ai-response-box" style="font-size: 0.92rem; color: #3c4043; line-height: 1.55; margin: 0; padding: 0;">
                            <span style="display:inline-block; animation: badgePulse 1.6s infinite; margin-right: 6px;">⚡</span> AI正在線上進行數據剖析與衍生解讀...
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px; border-top: 1px dashed #dadce0; padding-top: 8px; line-height: 1.4;">
                            ⚠️ <strong>模組提示：</strong>本區塊由 AI 自動產出，注意潛在幻覺風險，請以官方公告為準。
                        </div>
                    </div>
                    ${modalLinkHtml}
                `;
                
                modal.classList.remove('hidden');
                history.pushState({ modalOpen: true }, '');

                try {
                    const fetchUrl = `${API_BASE_URL}/?aiTitle=${encodeURIComponent(item.title)}&aiSnippet=${encodeURIComponent(item.snippet)}`;
                    const response = await fetch(fetchUrl);
                    const aiBox = document.getElementById('ai-response-box');
                    
                    const renderAiOutput = (text) => {
                        if (!aiBox || !text) return;
                        let normalizedText = text;

                        if (/[A-Za-z\s]+:/.test(normalizedText) && /[\u4e00-\u9fa5]/.test(normalizedText)) {
                            const firstChineseChar = normalizedText.search(/[\u4e00-\u9fa5]/);
                            if (firstChineseChar !== -1) {
                                const prefixText = normalizedText.substring(0, firstChineseChar);
                                const titleStart = prefixText.lastIndexOf('**');
                                normalizedText = titleStart !== -1 ? normalizedText.substring(titleStart) : normalizedText.substring(firstChineseChar);
                            }
                        }
                        
                        normalizedText = normalizedText.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');
                        const paragraphs = normalizedText.split('\n\n');
                        const finalHtml = paragraphs.map(p => {
                            if (!p.trim()) return '';
                            let cleanText = escapeHtml(p.trim()).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            return `<p>${cleanText}</p>`;
                        }).join('');
                        aiBox.innerHTML = finalHtml;
                    };

                    let accumulatedText = ""; 
                    let rawBuffer = "";        
                    
                    if (!response.body || typeof response.body.getReader !== 'function') {
                        const fullText = await response.text();
                        rawBuffer = fullText;
                        const fallbackRegex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
                        let fallbackMatch;
                        while ((fallbackMatch = fallbackRegex.exec(fullText)) !== null) {
                            let extracted = fallbackMatch[1];
                            try { accumulatedText += JSON.parse(`"${extracted}"`); } 
                            catch (e) { accumulatedText += extracted.replace(/\\n/g, '\n').replace(/\\"/g, '"'); }
                        }
                        if (accumulatedText) renderAiOutput(accumulatedText);
                    } else {
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        if (aiBox) aiBox.innerHTML = ""; 
                        
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break; 
                            rawBuffer += decoder.decode(value, { stream: true });
                            
                            const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
                            let match;
                            let lastIndex = 0;
                            while ((match = regex.exec(rawBuffer)) !== null) {
                                let extractedTarget = match[1];
                                try { accumulatedText += JSON.parse(`"${extractedTarget}"`); } 
                                catch (e) { accumulatedText += extractedTarget.replace(/\\n/g, '\n').replace(/\\"/g, '"'); }
                                lastIndex = regex.lastIndex;
                            }
                            if (lastIndex > 0) rawBuffer = rawBuffer.slice(lastIndex);
                            if (accumulatedText) renderAiOutput(accumulatedText); 
                        }
                    }

                    if (!accumulatedText && aiBox) {
                        const cleanBuffer = rawBuffer.trim();
                        if (cleanBuffer && !cleanBuffer.startsWith('{') && !cleanBuffer.startsWith('[')) {
                            aiBox.innerHTML = `<div style="color:#ea4335; font-weight:600; padding:4px 0; line-height:1.5;">⚠️ 遠端 Worker 拒絕連線：<br><span style="color:#3c4043; font-weight:400;">${escapeHtml(cleanBuffer)}</span></div>`;
                        } else if (cleanBuffer && cleanBuffer.includes('"message"')) {
                            const msgMatch = cleanBuffer.match(/"message"\s*:\s*"([^"]+)"/);
                            const errMsg = msgMatch ? msgMatch[1] : "Google 核心拒絕回應";
                            aiBox.innerHTML = `<div style="color:#ea4335; font-weight:600; padding:4px 0;">⚠️ Google API 報報錯：<br><span style="color:#3c4043; font-weight:400;">${escapeHtml(errMsg)}</span></div>`;
                        } else {
                            aiBox.innerHTML = `<div style="color:#ea4335; font-weight:600; padding:4px 0;">⚠️ AI 戰術報告未預期中斷。</div>`;
                        }
                    }
                } catch (error) {
                    const aiBox = document.getElementById('ai-response-box');
                    if (aiBox) aiBox.innerHTML = `<p>AI 智囊團目前連線外洩或逾時，請點擊下方閱讀原文按鈕查看完整內容。</p>`;
                }
            }
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

// ==========================================================================
// 3. 智慧本地快取與自訂選單記憶初始化
// ==========================================================================
function initCustomStorage() {
    const selectEl = document.getElementById("custom-source-select");
    if (!selectEl) return;
    
    let savedCustomTag = localStorage.getItem("user_custom_tag");
    if (!savedCustomTag) {
        savedCustomTag = "steam";
        localStorage.setItem("user_custom_tag", savedCustomTag);
    }
    selectEl.value = savedCustomTag;
}

// ==========================================================================
// 4. 無限滾動邏輯
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
// 5. 資料過濾與中央調度
// ==========================================================================
function filterAndRenderData() {
    let filtered = allSummaries;
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

// 📡 中央調度入口：負責向後端完全體 Worker 發送請求並初始化指針
async function loadSummaryData() {
    const container = document.getElementById("wall-container");
    
    // 🚀【秒讀取骨骼盾牌】：如果這是第一次打開網頁（allSummaries 長度為 0），立刻先同步灌入本地快取資料！
    // 這樣網路不好的使用者一進網頁瞬間就能看到豐富的推廣文章，完全不需要面對空蕩蕩的畫面等轉圈圈！
    if (container && allSummaries.length === 0) {
        try {
            // 先把本地靜態資源（流速接近 0 毫秒）同步全量拉下來
            const [testRes, promoRes, adRes] = await Promise.all([
                fetch('./data/summaries.json').then(r => r.json()).catch(() => []),
                fetch('./data/promo.json').then(r => r.json()).catch(() => []),
                fetch('./data/ads.json').then(r => r.json()).catch(() => [])
            ]);
            testTemplates = testRes; 
            promoTemplates = promoRes; 
            adTemplates = adRes;

            // 🎯 拿 promo.json 的內容當作「極速預載卡片」直接鋪滿瀑布流牆面！
            if (promoTemplates.length > 0 && allSummaries.length === 0) {
                const preloadItems = promoTemplates.map(item => ({
                    ...item,
                    id: `promo-pre-${Math.random().toString(36).substring(2, 9)}`,
                    time: "精選推薦" // 標記為推薦，增加質感
                }));
                renderCards(preloadItems); 
            } else {
                container.innerHTML = `<div class="loading-text">📡 正在連線核心情報庫...</div>`;
            }
        } catch (e) {
            container.innerHTML = `<div class="loading-text">📡 正在連線核心情報庫...</div>`;
        }
    } else if (container) {
        // 💡 當使用者在後續點選不同分頁標籤切換時，才顯示優雅的轉頁提示
        container.innerHTML = `<div class="loading-text">📡 正在同步最新情報...</div>`;
    }

    const fetchUrl = `${API_BASE_URL}/?tag=${encodeURIComponent(currentTag)}`;

    try {
        // 📡 當使用者滑動看著預載文章時，背景早已向遠端的 Worker 全力發送真新聞請求
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        allSummaries = await response.json();
        
        // 🎯 只要真新聞一到部，瞬間無縫覆蓋，並完全啟動混流指針與無限滾動！
        filterAndRenderData();
        if (!observer) setupInfiniteScroll();
        
    } catch (error) {
        console.error("真實新聞連線失敗，啟動本地快取備援", error);
        try {
            // 如果連線真的不幸全面斷線，直接沿用剛才加載好的本地模板作為降級備援
            if (testTemplates.length === 0) {
                const fallback = await fetch('./data/summaries.json');
                allSummaries = await fallback.json();
                testTemplates = allSummaries; 
            } else {
                allSummaries = testTemplates;
            }
            filterAndRenderData(); 
            if (!observer) setupInfiniteScroll();
        } catch (e) {
            if (container) container.innerHTML = `<div class="loading-text" style="color: #ea4335;">系統完全中斷，請檢查網路連線。</div>`;
        }
    }
}

// ==========================================================================
// 6. 每小時在背景連線一次 Worker 抓取真新聞
// ==========================================================================
function simulateLiveUpdates() {
    setInterval(async () => {
        if (allSummaries.length === 0) return;
        
        const fetchUrl = `${API_BASE_URL}/?tag=${encodeURIComponent(currentTag)}`;
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) return;
            const freshNews = await response.json();
            
            let brandNewItems = [];
            freshNews.forEach(newItem => {
                const exists = allSummaries.some(oldItem => oldItem.title === newItem.title);
                if (!exists) {
                    newItem.isNewData = true;
                    newItem.time = "剛剛"; 
                    brandNewItems.push(newItem);
                }
            });

            if (brandNewItems.length > 0) {
                allSummaries = [...brandNewItems, ...allSummaries];
                
                brandNewItems.forEach(item => {
                    currentFilteredData.unshift(item);
                    unseenNewItems.push(item);
                });

                const badge = document.getElementById('new-data-badge');
                if (badge) { badge.classList.remove('hidden'); }
            }
        } catch (e) {
            console.error("背景每小時常規即時更新連線失敗", e);
        }
    }, 3600000); 
}

// ==========================================================================
// 7. 事件監聽設定（整合自訂頁籤與記憶體聯動）
// ==========================================================================
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const tabsContainer = document.getElementById('filter-tabs-container');
    const selectEl = document.getElementById("custom-source-select");
    const customTabBtn = document.getElementById("custom-tab-btn");
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

    // 🎯 1. 導覽頁籤中央處理：完美融合固定頁籤與自訂頁籤
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab, .tab-btn'); 
            if (!clickedTab) return;
            
            let tag = clickedTab.dataset.tag;
            
            // 如果點到的是自訂按鈕本體，則即時讀取下拉選單目前的數值
            if (tag === "custom" && selectEl) {
                tag = selectEl.value;
            }

            document.querySelectorAll('.tab, .tab-btn').forEach(tab => tab.classList.remove('active'));
            clickedTab.classList.add('active');
            
            currentTag = tag; 
            loadSummaryData(); 
        });
    }

    // 🎯 2. 下拉選單即時變更：強制高亮自訂標籤、記憶硬碟、立即換牌
    if (selectEl) {
        selectEl.addEventListener('change', (e) => {
            const newSelectedTag = e.target.value;
            localStorage.setItem("user_custom_tag", newSelectedTag);
            
            document.querySelectorAll('.tab, .tab-btn').forEach(btn => btn.classList.remove('active'));
            if (customTabBtn) customTabBtn.classList.add('active');

            currentTag = newSelectedTag;
            loadSummaryData();
        });
    }

    const refreshToTopWithNewData = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (badge) badge.classList.add('hidden');
        if (bttBtn) bttBtn.classList.add('hidden');

        const container = document.getElementById("wall-container");
        if (container) container.innerHTML = "";

        unseenNewItems = []; 
        newsPointer = 0;     
        renderedCount = 0;   
        itemsSinceTest = 0; 
        itemsSinceAd = 24; 
        itemsSincePromo = 6;

        loadMore();
    };

    if (bttBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) { bttBtn.classList.remove('hidden'); } else { bttBtn.classList.add('hidden'); }
        });
        
        bttBtn.addEventListener('click', () => {
            if (badge && !badge.classList.contains('hidden')) {
                refreshToTopWithNewData();
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if (badge) {
        badge.addEventListener('click', () => { refreshToTopWithNewData(); });
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
// 8. 工具函式與統一開機入口
// ==========================================================================
function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

window.addEventListener('popstate', (event) => {
    const articleModal = document.getElementById('article-modal');
    const settingsModal = document.getElementById('settings-modal');
    if (articleModal && !articleModal.classList.contains('hidden')) { articleModal.classList.add('hidden'); }
    if (settingsModal && !settingsModal.classList.contains('hidden')) { settingsModal.classList.add('hidden'); }
});

// ⚡ 唯一、純淨的中央開機引擎
document.addEventListener("DOMContentLoaded", () => {
    initCustomStorage();     // 1. 優先從本機硬碟同步自訂選單位置
    loadSummaryData();       // 2. 啟動對接後端 Worker (內含極速預載盾牌)
    setupEventListeners();   // 3. 綁定全網頁事件監聽
    simulateLiveUpdates();   // 4. 開啟背景即時重新整理
    initChatEngine();        // 5. 🎯 確保網頁元件都蓋好後，正式潛入即時聊天室！
});
