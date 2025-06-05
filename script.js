let cantoneseVoice = null;
let voicesLoaded = false;
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];

function loadAvailableVoices() {
    if (!('speechSynthesis' in window)) {
        console.warn('語音合成(API): 此瀏覽器不支援。');
        return;
    }
    const voices = speechSynthesis.getVoices();
    console.log('loadAvailableVoices: 嘗試獲取語音，獲取到 ' + voices.length + ' 個。');
    if (voices.length > 0) {
        voicesLoaded = true;
        cantoneseVoice = voices.find(voice => voice.lang === 'zh-HK');
        if (cantoneseVoice) {
            console.log('語音合成(API): 已找到廣東話語音:', cantoneseVoice.name, cantoneseVoice.lang);
        } else {
            console.warn('語音合成(API): 未找到廣東話 (zh-HK) 語音。');
            // console.log('可用語音列表:', voices.map(v => ({ name: v.name, lang: v.lang })));
        }
    } else if (!voicesLoaded) { 
        console.log('語音合成(API): 語音列表初始為空，等待 onvoiceschanged 事件。');
    }
}

if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        console.log('語音合成(API): onvoiceschanged 事件觸發。');
        voicesLoaded = true; 
        loadAvailableVoices();
    };
    // 某些瀏覽器 (如 Chrome) 可能需要使用者互動後才會完整載入語音列表，
    // 或者在頁面載入一段時間後才觸發 onvoiceschanged。
    // 第一次調用 loadAvailableVoices 仍然有必要。
    setTimeout(loadAvailableVoices, 100); // 稍微延遲一點點首次調用，給瀏覽器一點時間
} else {
    console.warn('語音合成(API): 此瀏覽器不支援。');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const PREDEFINED_CHARS = ["我", "你", "們"]; 
    let currentChar = PREDEFINED_CHARS[0] || ''; 
    let writer = null;
    let totalStrokes = 0;

    const CHARS_PER_PAGE = 20;
    let currentPage = 1;
    let allCharsForDisplay = []; 

    const charButtonsWrapper = document.querySelector('.char-buttons-wrapper'); 
    const currentCharText = document.getElementById('current-char-text');
    const targetDiv = document.getElementById('character-target-div');
    const hanziCanvasContainer = document.getElementById('hanzi-canvas-container');
    const userStrokeOverlay = document.getElementById('user-stroke-overlay');
    let userDrawnPaths = [];

    const animateBtn = document.getElementById('animate-btn');
    const quizBtn = document.getElementById('quiz-btn');
    const resetBtn = document.getElementById('reset-btn');
    const scoreFeedback = document.getElementById('score-feedback');

    const manualCharInput = document.getElementById('manual-char-input');
    const submitManualCharBtn = document.getElementById('submit-manual-char-btn');

    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoSpan = document.getElementById('page-info');
    const clearAllUserCharsBtn = document.getElementById('clear-all-user-chars-btn');

    const STORAGE_KEY = 'userAddedHanziChars';

    function loadUserChars() { /* ... (與上一版本相同) ... */ }
    function saveUserChars(charsArray) { /* ... (與上一版本相同) ... */ }
    function updateAllCharsForDisplay() { /* ... (與上一版本相同) ... */ }
    function addUserChar(char) { /* ... (與上一版本相同) ... */ }
    function deleteUserChar(charToDelete) { /* ... (與上一版本相同) ... */ }
    function updatePaginationControls() { /* ... (與上一版本相同) ... */ }

    function renderCharButtons() {
        if (!charButtonsWrapper) { console.error("charButtonsWrapper not found!"); return; }
        charButtonsWrapper.innerHTML = ''; 

        const startIndex = (currentPage - 1) * CHARS_PER_PAGE;
        const endIndex = startIndex + CHARS_PER_PAGE;
        const charsOnThisPage = allCharsForDisplay.slice(startIndex, endIndex);

        if (allCharsForDisplay.length === 0) {
            charButtonsWrapper.innerHTML = '<p style="font-size: 0.9em; color: #666;">暫無字元，請手動輸入添加。</p>';
            if (!currentChar){ 
                 initializeWriter('');
            }
            updatePaginationControls();
            return;
        }
        
        if (charsOnThisPage.length === 0 && currentPage > 1) {
            currentPage--;
            renderCharButtons(); 
            return; 
        }
        
        charsOnThisPage.forEach((char) => { 
            const button = document.createElement('button');
            button.classList.add('char-btn'); 
            if (char === currentChar) {
                button.classList.add('active');
            }
            button.dataset.char = char;
            button.textContent = char;

            let colorIndex;
            const globalIndexOfChar = allCharsForDisplay.indexOf(char);

            if (PREDEFINED_CHARS.includes(char)) {
                const predefinedIndex = PREDEFINED_CHARS.indexOf(char);
                colorIndex = predefinedIndex % BUTTON_COLOR_PALETTE.length; 
            } else {
                colorIndex = (globalIndexOfChar) % BUTTON_COLOR_PALETTE.length;
            }
            button.style.backgroundColor = BUTTON_COLOR_PALETTE[colorIndex];

            button.addEventListener('click', () => {
                charButtonsWrapper.querySelectorAll('.char-btn.active').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                initializeWriter(char);
            });

            if (!PREDEFINED_CHARS.includes(char)) { 
                const deleteBtn = document.createElement('span');
                deleteBtn.classList.add('delete-char-icon');
                deleteBtn.innerHTML = '&times;'; 
                deleteBtn.title = `刪除字 "${char}"`;
                deleteBtn.setAttribute('role', 'button'); 
                deleteBtn.setAttribute('aria-label', `刪除字 ${char}`);

                deleteBtn.addEventListener('click', (event) => {
                    event.stopPropagation(); 
                    if (confirm(`您確定要從您的練習列表中刪除「${char}」嗎？`)) {
                        const charWasCurrent = currentChar === char;
                        deleteUserChar(char); 
                        
                        if (charWasCurrent) {
                            const nextCharToLoad = allCharsForDisplay.length > 0 ? allCharsForDisplay[0] : ''; 
                            initializeWriter(nextCharToLoad); 
                        }
                        
                        const totalPages = Math.max(1, Math.ceil(allCharsForDisplay.length / CHARS_PER_PAGE));
                        if (currentPage > totalPages) {
                            currentPage = totalPages;
                        }
                        renderCharButtons(); 
                    }
                });
                button.appendChild(deleteBtn);
                button.classList.add('user-added-char'); 
            }
            charButtonsWrapper.appendChild(button);
        });
        updatePaginationControls();
    }

    if (prevPageBtn) { /* ... (與上一版本相同) ... */ }
    if (nextPageBtn) { /* ... (與上一版本相同) ... */ }
    
    if (clearAllUserCharsBtn) { /* ... (與上一版本相同) ... */ }

    function speakCharacterInCantonese(character) {
        console.log("嘗試發音: ", character);
        if (!character) {
            console.warn("發音失敗：字元為空。");
            return;
        }
        if (!('speechSynthesis' in window)) { 
            console.warn('發音失敗：瀏覽器不支援 Speech Synthesis API。');
            return; 
        }
        
        // 確保語音列表已嘗試載入
        if (!voicesLoaded) {
            console.log("發音前再次嘗試載入語音列表...");
            loadAvailableVoices(); // 同步調用一次
            if (!voicesLoaded && speechSynthesis.getVoices().length > 0) { // 如果同步調用成功獲取了
                voicesLoaded = true; // 更新標誌
                console.log("同步載入語音成功。");
            }
        }
        
        let voiceToUse = cantoneseVoice; // cantoneseVoice 是全局的，由 loadAvailableVoices 更新
        
        // 如果全局的 cantoneseVoice 仍未找到，再次嘗試從最新的列表中尋找
        if (!voiceToUse) {
            const currentVoices = speechSynthesis.getVoices();
            console.log("再次檢查可用語音數量: ", currentVoices.length);
            if (currentVoices.length > 0) {
                voiceToUse = currentVoices.find(voice => voice.lang === 'zh-HK');
                if (voiceToUse) {
                    cantoneseVoice = voiceToUse; // 更新全局變數
                    console.log('在朗讀時找到廣東話語音:', voiceToUse.name);
                }
            }
        }

        const utterance = new SpeechSynthesisUtterance(character);
        utterance.lang = 'zh-HK'; 
        utterance.rate = 0.85;   
        utterance.pitch = 1;    

        if (voiceToUse) {
            utterance.voice = voiceToUse;
            console.log(`使用廣東話語音 "${voiceToUse.name}" (${voiceToUse.lang}) 朗讀: ${character}`);
        } else {
            const allVoices = speechSynthesis.getVoices();
            const fallbackChineseVoice = allVoices.find(voice => voice.lang.startsWith('zh-CN')) || allVoices.find(voice => voice.lang.startsWith('zh-TW')) || allVoices.find(voice => voice.lang.startsWith('zh-'));
            if (fallbackChineseVoice) {
                utterance.voice = fallbackChineseVoice;
                utterance.lang = fallbackChineseVoice.lang; 
                console.warn(`未找到廣東話，使用備選中文語音 "${fallbackChineseVoice.name}" (${fallbackChineseVoice.lang}) 朗讀: ${character}`);
            } else { 
                console.warn(`未找到廣東話或任何中文備選語音，使用瀏覽器預設語音朗讀: ${character}`);
                if (allVoices.length > 0) { // 如果有任何語音，至少用一個
                    utterance.voice = allVoices[0]; // 使用第一個可用的語音
                    utterance.lang = allVoices[0].lang;
                     console.warn(`備選中的備選，使用第一個可用語音: "${allVoices[0].name}" (${allVoices[0].lang})`);
                } else {
                    console.error("錯誤：系統中沒有任何可用語音。");
                    return; // 沒有任何語音，無法朗讀
                }
            }
        }
        
        speechSynthesis.cancel(); 
        speechSynthesis.speak(utterance);

        utterance.onstart = () => console.log("朗讀開始:", character);
        utterance.onend = () => console.log("朗讀結束:", character);
        utterance.onerror = (e) => console.error('語音合成錯誤:', e.error, "朗讀的字:", character, "使用的語音:", utterance.voice ? utterance.voice.name : "未指定");
    }

    function redrawUserStrokeOverlay() { 
        if (!userStrokeOverlay) { console.error("redrawUserStrokeOverlay: userStrokeOverlay is null"); return; }
        console.log("redrawUserStrokeOverlay: Clearing and redrawing " + userDrawnPaths.length + " paths.");
        userStrokeOverlay.innerHTML = ''; 

        userDrawnPaths.forEach((pathData, index) => {
            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.setAttribute('d', pathData.path);
            pathElement.setAttribute('fill', 'none');
            pathElement.setAttribute('stroke', pathData.color); 
            pathElement.setAttribute('stroke-width', '4'); // 稍微加粗一點，方便查看
            pathElement.setAttribute('stroke-linecap', 'round');
            pathElement.setAttribute('stroke-linejoin', 'round');
            pathElement.setAttribute('opacity', '0.75'); // 稍微提高不透明度
            userStrokeOverlay.appendChild(pathElement);
            console.log(`Path ${index + 1} drawn: color=${pathData.color}`);
        });
        if (userDrawnPaths.length > 0) {
             console.log("redrawUserStrokeOverlay: Overlay updated with paths.");
        } else {
             console.log("redrawUserStrokeOverlay: No paths to draw.");
        }
    }

    function initializeWriter(char) {
        if (!char) { /* ... (與上一版本相同) ... */ }

        console.log('initializeWriter called with char:', char);
        currentChar = char; 
        currentCharText.textContent = char; 
        scoreFeedback.textContent = '---'; 
        scoreFeedback.style.color = '#D84315'; 

        targetDiv.innerHTML = ''; 
        
        if (userStrokeOverlay) {
            userStrokeOverlay.innerHTML = ''; 
            userStrokeOverlay.setAttribute('viewBox', '0 0 1024 1024'); 
            console.log("User stroke overlay cleared and viewBox set.");
        } else {
            console.error("initializeWriter: userStrokeOverlay is null!");
        }
        userDrawnPaths = [];
        console.log("User drawn paths reset.");


        const containerWidth = hanziCanvasContainer.offsetWidth;
        const containerHeight = hanziCanvasContainer.offsetHeight; 

        const finalCanvasWidth = containerWidth > 0 ? containerWidth : 250;
        const finalCanvasHeight = containerHeight > 0 ? containerHeight : 250;
        
        console.log(`HanziWriter: Creating instance for "${char}" with size ${finalCanvasWidth}x${finalCanvasHeight}`);
        writer = HanziWriter.create(targetDiv, char, {
            width: finalCanvasWidth,  
            height: finalCanvasHeight, 
            padding: 10, 
            showOutline: true, 
            showCharacter: true, 
            strokeAnimationSpeed: 1, 
            delayBetweenStrokes: 250, 
            strokeColor: '#4A4A4A', 
            highlightColor: '#F06292', 
            outlineColor: '#FFD180', 
            drawingColor: '#29B6F6', 
            drawingWidth: 14, 
            onLoadCharDataSuccess: function(data) { 
                console.log(`HanziWriter: onLoadCharDataSuccess for "${char}"`);
                totalStrokes = data.strokes.length; 
                animateBtn.disabled = false; 
                if (quizBtn) { 
                    quizBtn.disabled = false; 
                    quizBtn.textContent = '開始練習'; 
                }
            },
            onLoadCharDataError: function(reason) { 
                console.error(`HanziWriter: onLoadCharDataError for "${char}"`, reason);
                currentCharText.textContent = `無法載入 "${char}"`; 
                scoreFeedback.textContent = '載入錯誤，請確認字元或網路。'; 
                scoreFeedback.style.color = '#dc3545'; 
                animateBtn.disabled = true; 
                if (quizBtn) { 
                    quizBtn.disabled = true; 
                }
            }
        });
        renderCharButtons(); 
    }

    if (submitManualCharBtn && manualCharInput) { /* ... (與上一版本相同) ... */ }
    
    animateBtn.addEventListener('click', () => {
        console.log('「看動畫」按鈕被點擊');
        console.log('目前的 writer 物件:', writer);
        console.log('「看動畫」按鈕是否被禁用 (animateBtn.disabled):', animateBtn.disabled);
        console.log('當前字元 (currentChar):', currentChar);

        if (animateBtn.disabled) {
            console.warn('「看動畫」按鈕目前是禁用狀態。');
            scoreFeedback.textContent = '動畫功能目前不可用 (按鈕已禁用)。';
            scoreFeedback.style.color = '#dc3545';
            return;
        }

        if (writer && typeof writer.animateCharacter === 'function') {
            console.log('正在呼叫 writer.animateCharacter()');
            writer.animateCharacter();
            scoreFeedback.textContent = '請觀察筆順。';
            scoreFeedback.style.color = '#17a2b8';
        } else {
            console.error('HanziWriter 實例 (writer) 不存在或 animateCharacter 方法無效。');
            scoreFeedback.textContent = '動畫功能錯誤：Writer 未正確初始化或方法不存在。';
            scoreFeedback.style.color = '#dc3545';
        }
    });
    
    quizBtn.addEventListener('click', () => { 
        if (writer && currentChar) { 
            if (quizBtn.textContent === '開始練習' || quizBtn.textContent === '重新練習') { 
                if (userStrokeOverlay) userStrokeOverlay.innerHTML = '';
                userDrawnPaths = [];
                console.log("Quiz started: User stroke overlay and paths cleared.");
            }
            scoreFeedback.textContent = '請依照筆順書寫。'; 
            scoreFeedback.style.color = '#17a2b8'; 
            quizBtn.textContent = '練習中...'; 
            quizBtn.disabled = true; 

            writer.quiz({ 
                onCorrectStroke: function(data) { 
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`; 
                    scoreFeedback.style.color = '#28a745'; 
                    if (data.drawnPath && data.drawnPath.pathString) {
                        console.log("onCorrectStroke: drawnPath received", data.drawnPath.pathString);
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#28a745' }); 
                        redrawUserStrokeOverlay();
                    } else {
                        console.warn("onCorrectStroke: drawnPath or pathString is missing", data);
                    }
                },
                onMistake: function(data) { 
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`; 
                    scoreFeedback.style.color = '#dc3545'; 
                     if (data.drawnPath && data.drawnPath.pathString) {
                        console.log("onMistake: drawnPath received", data.drawnPath.pathString);
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#dc3545' }); 
                        redrawUserStrokeOverlay();
                    } else {
                        console.warn("onMistake: drawnPath or pathString is missing", data);
                    }
                },
                onComplete: function(summary) { 
                    console.log('測驗完成! Summary:', summary, "準備朗讀字元:", currentChar);
                    let mistakes = summary.totalMistakes; 
                    let score = 0; 
                    if (totalStrokes > 0) { /* ... (計分邏輯不變) ... */ }
                    /* ... (更新 scoreFeedback 文字不變) ... */
                    quizBtn.textContent = '重新練習'; 
                    quizBtn.disabled = false; 

                    if (currentChar) { 
                        speakCharacterInCantonese(currentChar);
                    } else {
                        console.warn("測驗完成，但 currentChar 為空，無法朗讀。")
                    }
                }
            });
        } else if (!currentChar) {
            scoreFeedback.textContent = '請先選擇一個字元才能開始練習。';
            scoreFeedback.style.color = '#dc3545';
        } else {
             console.error("Quiz button clicked, but writer is not initialized.");
        }
    }); 
    
    resetBtn.addEventListener('click', () => { /* ... (與上一版本相同) ... */ });
    
    updateAllCharsForDisplay(); 
    renderCharButtons();      
    
    let charToLoadInitially = PREDEFINED_CHARS.includes(currentChar) ? currentChar : PREDEFINED_CHARS[0];
    if (!charToLoadInitially && allCharsForDisplay.length > 0) {
        charToLoadInitially = allCharsForDisplay[0];
    }
    initializeWriter(charToLoadInitially || ''); 


    const debouncedResizeHandler = debounce(() => { /* ... (與上一版本相同) ... */ });
    window.addEventListener('resize', debouncedResizeHandler);

});
