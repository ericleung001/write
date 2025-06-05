let cantoneseVoice = null;
let voicesLoaded = false;
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];
// let lastColorIndex = -1; // 移除，因為按鈕顏色分配邏輯已更改

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
    const clearAllUserCharsBtn = document.getElementById('clear-all-user-chars-btn'); // 新按鈕

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

        if (currentPage < 1 && totalPages > 0) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

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

            // 確保 PREDEFINED_CHARS 中的字有優先且固定的顏色 (如果調色盤足夠)
            if (PREDEFINED_CHARS.includes(char)) {
                const predefinedIndex = PREDEFINED_CHARS.indexOf(char);
                 // 使用模運算確保索引在調色盤範圍內
                colorIndex = predefinedIndex % BUTTON_COLOR_PALETTE.length;
            } else {
                // 使用者添加的字，嘗試從預設字之後的顏色開始，也使用模運算
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
    
    if (clearAllUserCharsBtn) {
        clearAllUserCharsBtn.addEventListener('click', () => {
            const currentUserChars = loadUserChars();
            if (currentUserChars.length === 0) {
                scoreFeedback.textContent = '目前沒有自訂字元可清除。';
                scoreFeedback.style.color = '#17a2b8';
                setTimeout(() => { 
                    if (scoreFeedback.textContent === '目前沒有自訂字元可清除。') {
                        scoreFeedback.textContent = '---';
                        scoreFeedback.style.color = '#D84315';
                    }
                }, 3000);
                return;
            }

            if (confirm("您確定要清除所有手動加入的練習字嗎？\n此操作無法復原。")) {
                saveUserChars([]); 
                updateAllCharsForDisplay(); 
                currentPage = 1; 
                
                let charToLoadAfterClear = PREDEFINED_CHARS.length > 0 ? PREDEFINED_CHARS[0] : '';
                initializeWriter(charToLoadAfterClear); // 會更新 currentChar 並在內部調用 renderCharButtons
                
                console.log('所有手動輸入的字元已被清除。');
                scoreFeedback.textContent = '所有自訂字元已清除。';
                scoreFeedback.style.color = '#17a2b8'; 
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
            if (charButtonsWrapper && allCharsForDisplay.length === 0) { // 只有在確實沒有任何字元時才顯示提示
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
        renderCharButtons(); 
    }

    if (submitManualCharBtn && manualCharInput) {
        submitManualCharBtn.addEventListener('click', () => {
            const charToLoad = manualCharInput.value.trim();
            if (charToLoad && charToLoad.length === 1) {
                const isNewCharAdded = addUserChar(charToLoad); 
                if (isNewCharAdded) {
                    currentPage = Math.max(1, Math.ceil(allCharsForDisplay.length / CHARS_PER_PAGE));
                }
                initializeWriter(charToLoad); 
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
        if (writer && currentChar) { 
            if (quizBtn.textContent === '開始練習' || quizBtn.textContent === '重新練習') { 
                if (userStrokeOverlay) userStrokeOverlay.innerHTML = '';
                userDrawnPaths = [];
            }
            scoreFeedback.textContent = '請依照筆順書寫。'; 
            scoreFeedback.style.color = '#17a2b8'; 
            quizBtn.textContent = '練習中...'; 
            quizBtn.disabled = true; 

            writer.quiz({ 
                onCorrectStroke: function(data) { 
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`; 
                    scoreFeedback.style.color = '#28a745'; 
                    if (data.drawnPath) {
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#28a745' }); 
                        redrawUserStrokeOverlay();
                    }
                },
                onMistake: function(data) { 
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`; 
                    scoreFeedback.style.color = '#dc3545'; 
                     if (data.drawnPath) {
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#dc3545' }); 
                        redrawUserStrokeOverlay();
                    }
                },
                onComplete: function(summary) { 
                    let mistakes = summary.totalMistakes; 
                    let score = 0; 
                    if (totalStrokes > 0) { 
                        if (mistakes === 0) score = 100; 
                        else if (mistakes <= Math.ceil(totalStrokes * 0.25)) score = 80 - (mistakes - 1) * 5; 
                        else if (mistakes <= Math.ceil(totalStrokes * 0.5)) score = 60 - (mistakes - Math.ceil(totalStrokes * 0.25) - 1) * 5; 
                        else score = Math.max(0, 40 - (mistakes - Math.ceil(totalStrokes * 0.5)) * 5); 
                        score = Math.max(0, Math.round(score)); 
                    }
                    if (score >= 80) { 
                        scoreFeedback.textContent = `太棒了！得分：${score} 分 (總錯誤 ${mistakes} 次)`; 
                        scoreFeedback.style.color = '#28a745'; 
                    } else if (score >= 60) { 
                        scoreFeedback.textContent = `做得不錯！得分：${score} 分 (總錯誤 ${mistakes} 次)`; 
                        scoreFeedback.style.color = '#ffc107'; 
                    } else {
                        scoreFeedback.textContent = `再接再厲！得分：${score} 分 (總錯誤 ${mistakes} 次)`; 
                        scoreFeedback.style.color = '#dc3545'; 
                    }
                    quizBtn.textContent = '重新練習'; 
                    quizBtn.disabled = false; 

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
        if (!charToReset && allCharsForDisplay.length > 0) { // 如果 currentChar 為空，但列表不為空
            charToReset = allCharsForDisplay[0];
        } else if (!charToReset && allCharsForDisplay.length === 0) { // 如果 currentChar 和列表都為空
            charToReset = '';
        }
        // 如果 charToReset 仍然是 PREDEFINED_CHARS[0] 且 PREDEFINED_CHARS 為空，也會變成 ''
        
        initializeWriter(charToReset); // initializeWriter 會處理空字串的情況
        if (charToReset) {
            scoreFeedback.textContent = '已重設，請重新開始。'; 
            scoreFeedback.style.color = '#17a2b8'; 
        }
    });
    
    updateAllCharsForDisplay(); 
    renderCharButtons();      
    
    let charToLoadInitially = PREDEFINED_CHARS.includes(currentChar) ? currentChar : PREDEFINED_CHARS[0];
    if (!charToLoadInitially && allCharsForDisplay.length > 0) {
        charToLoadInitially = allCharsForDisplay[0];
    }
    initializeWriter(charToLoadInitially || ''); 


    const debouncedResizeHandler = debounce(() => {
        const isQuizActive = quizBtn && quizBtn.disabled === true && quizBtn.textContent === '練習中...';
        if (isQuizActive) {
            console.log('視窗大小改變，但測驗進行中。HanziWriter 不重新初始化。');
            return; 
        }
        // 確保即使 currentChar 為空，但列表中有字時，也能正確重新初始化
        let charForResize = currentChar;
        if (!charForResize && allCharsForDisplay.length > 0) {
            charForResize = allCharsForDisplay[0];
        }

        if (writer && charForResize) { // 只有在 writer 實例存在且有有效字元時才重新初始化
            console.log('視窗大小/方向改變，重新初始化 HanziWriter (字元:', charForResize, ')');
            initializeWriter(charForResize);
        } else if (!writer && charForResize) { // 如果 writer 不存在但有字元可以載入 (例如初始載入失敗後 resize)
             console.log('視窗大小/方向改變，Writer 不存在，嘗試初始化 HanziWriter (字元:', charForResize, ')');
             initializeWriter(charForResize);
        } else if (!charForResize) { // 如果沒有字元可以載入
             initializeWriter('');
        }
    }, 250);
    window.addEventListener('resize', debouncedResizeHandler);

});
