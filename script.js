let cantoneseVoice = null;
let voicesLoaded = false;
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];
let lastColorIndex = -1; 

function loadAvailableVoices() {
    if (!('speechSynthesis' in window)) {
        console.warn('此瀏覽器不支援語音合成 (Speech Synthesis)。');
        return;
    }
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
        voicesLoaded = true;
        cantoneseVoice = voices.find(voice => voice.lang === 'zh-HK');
        if (cantoneseVoice) {
            console.log('已找到廣東話語音:', cantoneseVoice.name, cantoneseVoice.lang);
        } else {
            console.warn('未找到廣東話 (zh-HK) 語音。將嘗試備選方案。');
        }
    } else if (!voicesLoaded) { 
        console.log('語音列表初始為空，等待 onvoiceschanged 事件。');
    }
}

if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        console.log('onvoiceschanged 事件觸發。');
        voicesLoaded = true; 
        loadAvailableVoices();
    };
    loadAvailableVoices();
} else {
    console.warn('此瀏覽器不支援語音合成 (Speech Synthesis)。');
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

    const STORAGE_KEY = 'userAddedHanziChars';

    function loadUserChars() {
        const chars = localStorage.getItem(STORAGE_KEY);
        try {
            const parsedChars = JSON.parse(chars);
            return Array.isArray(parsedChars) ? parsedChars : [];
        } catch (e) {
            return [];
        }
    }

    function saveUserChars(charsArray) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(charsArray));
    }
    
    function updateAllCharsForDisplay() {
        const userChars = loadUserChars();
        const displayChars = [...PREDEFINED_CHARS];
        userChars.forEach(uc => {
            if (!displayChars.includes(uc)) { 
                displayChars.push(uc);
            }
        });
        allCharsForDisplay = displayChars;
    }

    function addUserChar(char) {
        if (!char || char.length !== 1) return false;
        const userChars = loadUserChars();
        if (PREDEFINED_CHARS.includes(char) || userChars.includes(char)) {
            return false; 
        }
        userChars.push(char);
        saveUserChars(userChars);
        updateAllCharsForDisplay(); 
        return true;
    }

    function deleteUserChar(charToDelete) {
        let userChars = loadUserChars();
        userChars = userChars.filter(char => char !== charToDelete);
        saveUserChars(userChars);
        updateAllCharsForDisplay(); 
        console.log(`已從列表中刪除字元 "${charToDelete}"`);
    }
    
    function updatePaginationControls() {
        if (!prevPageBtn || !nextPageBtn || !pageInfoSpan) return;

        const totalChars = allCharsForDisplay.length;
        const totalPages = Math.max(1, Math.ceil(totalChars / CHARS_PER_PAGE)); 

        if (currentPage < 1 && totalPages > 0) currentPage = 1; // 如果頁碼無效但有頁數，設為1
        if (currentPage > totalPages) currentPage = totalPages; // 確保不超過總頁數

        pageInfoSpan.textContent = `第 ${totalPages === 0 ? 0 : currentPage}/${totalPages} 頁`;

        prevPageBtn.disabled = (currentPage === 1);
        nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
    }


    function renderCharButtons() {
        if (!charButtonsWrapper) return;
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
                // 使用全局索引來分配顏色，保證使用者添加的字元顏色分佈更廣
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
                            const nextCharToLoad = allCharsForDisplay[0] || ''; 
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

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCharButtons();
            }
        });
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allCharsForDisplay.length / CHARS_PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                renderCharButtons();
            }
        });
    }

    function speakCharacterInCantonese(character) { /* ... (與上一版本相同) ... */ }
    function redrawUserStrokeOverlay() { /* ... (與上一版本相同) ... */ }

    function initializeWriter(char) {
        if (!char) { 
            currentCharText.textContent = '-';
            if(targetDiv) targetDiv.innerHTML = '';
            if (userStrokeOverlay) userStrokeOverlay.innerHTML = '';
            userDrawnPaths = [];
            scoreFeedback.textContent = '請選擇或添加一個字開始練習。';
            if(animateBtn) animateBtn.disabled = true;
            if(quizBtn) {
                quizBtn.disabled = true;
                quizBtn.textContent = '開始練習';
            }
            currentChar = ''; 
            // 確保在沒有字元時，按鈕區域也正確反映狀態 (renderCharButtons 已處理)
            // 如果 allCharsForDisplay 為空，renderCharButtons 會顯示提示
            if (allCharsForDisplay.length === 0) {
                 renderCharButtons(); 
            }
            return;
        }

        console.log('initializeWriter called with char:', char);
        currentChar = char; 
        currentCharText.textContent = char; 
        scoreFeedback.textContent = '---'; 
        scoreFeedback.style.color = '#D84315'; 

        targetDiv.innerHTML = ''; 
        
        if (userStrokeOverlay) {
            userStrokeOverlay.innerHTML = ''; 
            userStrokeOverlay.setAttribute('viewBox', '0 0 1024 1024'); 
        }
        userDrawnPaths = [];

        const containerWidth = hanziCanvasContainer.offsetWidth;
        const containerHeight = hanziCanvasContainer.offsetHeight; 

        const finalCanvasWidth = containerWidth > 0 ? containerWidth : 250;
        const finalCanvasHeight = containerHeight > 0 ? containerHeight : 250;
        
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
                totalStrokes = data.strokes.length; 
                animateBtn.disabled = false; 
                if (quizBtn) { 
                    quizBtn.disabled = false; 
                    quizBtn.textContent = '開始練習'; 
                }
            },
            onLoadCharDataError: function(reason) { 
                currentCharText.textContent = `無法載入 "${char}"`; 
                scoreFeedback.textContent = '載入錯誤，請確認字元或網路。'; 
                scoreFeedback.style.color = '#dc3545'; 
                animateBtn.disabled = true; 
                if (quizBtn) { 
                    quizBtn.disabled = true; 
                }
            }
        });
        renderCharButtons(); // 確保按鈕高亮狀態在初始化字元後也正確
    }

    if (submitManualCharBtn && manualCharInput) {
        submitManualCharBtn.addEventListener('click', () => {
            const charToLoad = manualCharInput.value.trim();
            if (charToLoad && charToLoad.length === 1) {
                const isNewCharAdded = addUserChar(charToLoad); 
                if (isNewCharAdded) {
                    // 新增字後，跳到包含該新字的最後一頁
                    currentPage = Math.max(1, Math.ceil(allCharsForDisplay.length / CHARS_PER_PAGE));
                }
                // 無論是否新增到 storage (可能已存在)，都將其設為當前字並初始化/高亮
                initializeWriter(charToLoad); // 會更新 currentChar 並觸發 renderCharButtons
                manualCharInput.value = '';
            } else if (charToLoad.length > 1) {
                scoreFeedback.textContent = '請只輸入一個字進行練習。'; 
                scoreFeedback.style.color = '#dc3545'; 
            } else {
                scoreFeedback.textContent = '請輸入一個繁體中文字。'; 
                scoreFeedback.style.color = '#dc3545'; 
            }
        });
        manualCharInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitManualCharBtn.click();
            }
        });
    }
    
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
        if (writer && currentChar) { // 確保 currentChar 有效才開始測驗
            if (quizBtn.textContent === '開始練習' || quizBtn.textContent === '重新練習') { 
                if (userStrokeOverlay) userStrokeOverlay.innerHTML = '';
                userDrawnPaths = [];
            }
            scoreFeedback.textContent = '請依照筆順書寫。'; 
            scoreFeedback.style.color = '#17a2b8'; 
            quizBtn.textContent = '練習中...'; 
            quizBtn.disabled = true; 

            writer.quiz({ 
                onCorrectStroke: function(data) { /* ... (與上一版本相同) ... */ },
                onMistake: function(data) { /* ... (與上一版本相同) ... */ },
                onComplete: function(summary) { 
                    /* ... (與上一版本相同，包含計分和發音) ... */ 
                    if (currentChar) { 
                        speakCharacterInCantonese(currentChar);
                    }
                }
            });
        } else if (!currentChar) {
            scoreFeedback.textContent = '請先選擇一個字元才能開始練習。';
            scoreFeedback.style.color = '#dc3545';
        }
    }); 
    
    resetBtn.addEventListener('click', () => { 
        let charToReset = currentChar;
        if (!charToReset) { 
            charToReset = allCharsForDisplay[0] || ''; // 從更新後的 allCharsForDisplay 取第一個
        }
        
        if (charToReset) { 
            initializeWriter(charToReset); 
            scoreFeedback.textContent = '已重設，請重新開始。'; 
            scoreFeedback.style.color = '#17a2b8'; 
        } else {
            initializeWriter(''); 
        }
    });
    
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
