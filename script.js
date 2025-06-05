let cantoneseVoice = null;
let voicesLoaded = false;
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];

function loadAvailableVoices() {
    // console.log("loadAvailableVoices called"); 
    if (!('speechSynthesis' in window)) {
        console.warn('語音合成(API): 此瀏覽器不支援。');
        return;
    }
    const voices = speechSynthesis.getVoices();
    // console.log('loadAvailableVoices: 嘗試獲取語音，獲取到 ' + voices.length + ' 個。');
    if (voices.length > 0) {
        voicesLoaded = true;
        cantoneseVoice = voices.find(voice => voice.lang === 'zh-HK');
        if (cantoneseVoice) {
            // console.log('語音合成(API): 已找到廣東話語音:', cantoneseVoice.name, cantoneseVoice.lang);
        } else {
            // console.warn('語音合成(API): 未找到廣東話 (zh-HK) 語音。');
        }
    } else if (!voicesLoaded) { 
        // console.log('語音合成(API): 語音列表初始為空，等待 onvoiceschanged 事件。');
    }
}

if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        // console.log('語音合成(API): onvoiceschanged 事件觸發。');
        voicesLoaded = true; 
        loadAvailableVoices();
    };
    setTimeout(loadAvailableVoices, 100); 
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
    console.log("DOM Fully Loaded and Parsed - v6 (Robust userChars handling)"); 
    const PREDEFINED_CHARS = ["我", "你", "們"]; 
    console.log("SCRIPT START: PREDEFINED_CHARS:", JSON.stringify(PREDEFINED_CHARS));
    let currentChar = PREDEFINED_CHARS[0] || ''; 
    console.log("SCRIPT START: Initial currentChar:", currentChar);
    let writer = null;
    let totalStrokes = 0;

    const CHARS_PER_PAGE = 20;
    let currentPage = 1;
    let allCharsForDisplay = []; 

    const charButtonsWrapper = document.querySelector('.char-buttons-wrapper'); 
    console.log("SCRIPT START: DOM: charButtonsWrapper element:", charButtonsWrapper); // 保留此日誌

    const currentCharText = document.getElementById('current-char-text');
    const targetDiv = document.getElementById('character-target-div');
    const hanziCanvasContainer = document.getElementById('hanzi-canvas-container');
    const userStrokeOverlay = document.getElementById('user-stroke-overlay');
    let userDrawnPaths = [];

    const animateBtn = document.getElementById('animate-btn');
    console.log("SCRIPT START: DOM: animateBtn element:", animateBtn); 
    const quizBtn = document.getElementById('quiz-btn');
    console.log("SCRIPT START: DOM: quizBtn element:", quizBtn); 
    const resetBtn = document.getElementById('reset-btn');
    console.log("SCRIPT START: DOM: resetBtn element:", resetBtn); 
    const scoreFeedback = document.getElementById('score-feedback');

    const manualCharInput = document.getElementById('manual-char-input');
    const submitManualCharBtn = document.getElementById('submit-manual-char-btn');

    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoSpan = document.getElementById('page-info');
    const clearAllUserCharsBtn = document.getElementById('clear-all-user-chars-btn');
    console.log("SCRIPT START: DOM: clearAllUserCharsBtn element:", clearAllUserCharsBtn); 

    const STORAGE_KEY = 'userAddedHanziChars';

    function loadUserChars() {
        const charsJSON = localStorage.getItem(STORAGE_KEY);
        console.log("loadUserChars: from localStorage raw:", charsJSON); 
        if (charsJSON === null || charsJSON === undefined) { 
            console.log("loadUserChars: No data in localStorage for key, returning empty array.");
            return [];
        }
        try {
            const parsedChars = JSON.parse(charsJSON);
            if (Array.isArray(parsedChars)) {
                console.log("loadUserChars: parsed as array:", JSON.stringify(parsedChars));
                return parsedChars;
            } else {
                console.warn("loadUserChars: Parsed data is not an array. Returning empty array. Parsed data:", parsedChars);
                return []; 
            }
        } catch (e) {
            console.error("loadUserChars: Error parsing JSON from localStorage, returning empty array.", e);
            return []; 
        }
    }

    function saveUserChars(charsArray) {
        console.log("saveUserChars: Saving to localStorage:", JSON.stringify(charsArray));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(charsArray));
    }
    
    function updateAllCharsForDisplay() {
        console.log("--- updateAllCharsForDisplay: Called ---");
        let userChars = loadUserChars(); 
        console.log("updateAllCharsForDisplay: Loaded userChars from localStorage:", JSON.stringify(userChars));

        if (!Array.isArray(userChars)) { // 這個檢查可能多餘，因為 loadUserChars 應該總是返回陣列
            console.warn("updateAllCharsForDisplay: userChars was NOT an array after loadUserChars. Defaulting to empty. Original value:", userChars);
            userChars = []; 
        }

        const displayChars = [...PREDEFINED_CHARS];
        console.log("updateAllCharsForDisplay: Started with PREDEFINED_CHARS:", JSON.stringify(displayChars));
        
        userChars.forEach(uc => { 
            if (!displayChars.includes(uc)) { 
                displayChars.push(uc);
            }
        });
        allCharsForDisplay = displayChars; 
        console.log("updateAllCharsForDisplay: Final allCharsForDisplay SET TO:", JSON.stringify(allCharsForDisplay));
        console.log("--- updateAllCharsForDisplay: Finished ---");
    }

    function addUserChar(char) { /* ... (與上一版本相同，內含日誌) ... */ }
    function deleteUserChar(charToDelete) { /* ... (與上一版本相同，內含日誌) ... */ }
    function updatePaginationControls() { /* ... (與上一版本相同) ... */ }
    function renderCharButtons() { 
        console.log("--- renderCharButtons: Called ---"); // 關鍵日誌
        console.log("renderCharButtons: Current `currentChar`:", currentChar, " `currentPage`:", currentPage);
        console.log("renderCharButtons: Using `allCharsForDisplay`:", JSON.stringify(allCharsForDisplay), "Length:", allCharsForDisplay.length);
        
        if (!charButtonsWrapper) { console.error("renderCharButtons: charButtonsWrapper not found! Cannot render buttons."); return; }
        charButtonsWrapper.innerHTML = ''; 

        const startIndex = (currentPage - 1) * CHARS_PER_PAGE;
        const endIndex = startIndex + CHARS_PER_PAGE;
        const charsOnThisPage = allCharsForDisplay.slice(startIndex, endIndex);
        console.log(`renderCharButtons: Page ${currentPage} - Start: ${startIndex}, End: ${endIndex}. Chars on this page:`, JSON.stringify(charsOnThisPage), "(Length:", charsOnThisPage.length, ")");

        if (allCharsForDisplay.length === 0) {
            console.log("renderCharButtons: allCharsForDisplay is empty. Displaying 'no characters' message.");
            charButtonsWrapper.innerHTML = '<p style="font-size: 0.9em; color: #666;">暫無字元，請手動輸入添加。</p>';
            if (!currentChar){ 
                 initializeWriter(''); 
            }
            updatePaginationControls();
            return;
        }
        
        if (charsOnThisPage.length === 0 && currentPage > 1) {
            console.log(`renderCharButtons: Current page ${currentPage} is empty, but not page 1. Moving to previous page.`);
            currentPage--;
            renderCharButtons(); 
            return; 
        }
        
        if (charsOnThisPage.length === 0 && allCharsForDisplay.length > 0 && currentPage === 1) { 
             console.warn("renderCharButtons: charsOnThisPage is empty on page 1, but allCharsForDisplay is not. This indicates an issue. allCharsForDisplay:", JSON.stringify(allCharsForDisplay) );
        }

        charsOnThisPage.forEach((char) => { 
            console.log(`renderCharButtons: Creating button for char: "${char}"`); // 確認按鈕有被創建
            const button = document.createElement('button');
            button.classList.add('char-btn'); 
            if (char === currentChar) {
                button.classList.add('active');
                console.log(`renderCharButtons: Button for "${char}" marked ACTIVE.`);
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
                console.log(`Char button "${char}" clicked.`);
                if (charButtonsWrapper) { 
                    charButtonsWrapper.querySelectorAll('.char-btn.active').forEach(b => b.classList.remove('active'));
                }
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
                deleteBtn.addEventListener('click', (event) => { /* ... (與上一版本相同) ... */ });
                button.appendChild(deleteBtn);
                button.classList.add('user-added-char'); 
            }
            if (charButtonsWrapper) { 
                charButtonsWrapper.appendChild(button);
            }
        });
        updatePaginationControls();
        console.log("<<<< renderCharButtons: SUCCESSFULLY FINISHED >>>>"); // 確認函式完整執行
    }
    function speakCharacterInCantonese(character) { /* ... (與上一版本相同，內含日誌) ... */ }
    function redrawUserStrokeOverlay() { /* ... (與上一版本相同，內含日誌) ... */ }

    function initializeWriter(char) {
        console.log(`>>>> initializeWriter: ATTEMPTING TO INITIALIZE FOR char = "${char}" <<<<`);
        if (!char) { 
            console.log("initializeWriter: Character is empty. Clearing canvas and showing prompts.");
            if(currentCharText) currentCharText.textContent = '-';
            if(targetDiv) targetDiv.innerHTML = '';
            if (userStrokeOverlay) userStrokeOverlay.innerHTML = '';
            userDrawnPaths = [];
            if(scoreFeedback) scoreFeedback.textContent = '請選擇或添加一個字開始練習。';
            if(animateBtn) animateBtn.disabled = true;
            if(quizBtn) { quizBtn.disabled = true; quizBtn.textContent = '開始練習'; }
            currentChar = ''; 
            if (charButtonsWrapper && allCharsForDisplay.length === 0) {
                 console.log("initializeWriter (empty char): No characters in allCharsForDisplay, calling renderCharButtons.");
                 renderCharButtons(); 
            }
            return;
        }

        currentChar = char; 
        if(currentCharText) currentCharText.textContent = char; 
        if(scoreFeedback) { scoreFeedback.textContent = '---'; scoreFeedback.style.color = '#D84315'; }

        if(targetDiv) targetDiv.innerHTML = ''; 
        if (userStrokeOverlay) { userStrokeOverlay.innerHTML = ''; userStrokeOverlay.setAttribute('viewBox', '0 0 1024 1024'); } 
        else { console.error("initializeWriter: userStrokeOverlay is null!"); }
        userDrawnPaths = [];

        const containerWidth = hanziCanvasContainer ? hanziCanvasContainer.offsetWidth : 250;
        const containerHeight = hanziCanvasContainer ? hanziCanvasContainer.offsetHeight : 250;
        const finalCanvasWidth = containerWidth > 0 ? containerWidth : 250;
        const finalCanvasHeight = containerHeight > 0 ? containerHeight : 250;
        
        console.log(`HanziWriter: Creating instance for "${char}" with size ${finalCanvasWidth}x${finalCanvasHeight}`);
        if (!targetDiv) { console.error("initializeWriter: targetDiv is null! Cannot create HanziWriter."); writer = null; return; } // 如果 targetDiv 為 null，則無法創建 writer
        
        writer = null; // 先將 writer 設為 null，以防 create 失敗時殘留舊實例
        try {
            writer = HanziWriter.create(targetDiv, char, {
                width: finalCanvasWidth, height: finalCanvasHeight, padding: 10, 
                showOutline: true, showCharacter: true, strokeAnimationSpeed: 1, 
                delayBetweenStrokes: 250, strokeColor: '#4A4A4A', highlightColor: '#F06292', 
                outlineColor: '#FFD180', drawingColor: '#29B6F6', drawingWidth: 14, 
                onLoadCharDataSuccess: function(data) { 
                    console.log(`HanziWriter: onLoadCharDataSuccess for "${char}"`); 
                    totalStrokes = data.strokes.length; 
                    if(animateBtn) animateBtn.disabled = false; else console.warn("animateBtn is null in onLoadCharDataSuccess");
                    if (quizBtn) { quizBtn.disabled = false; quizBtn.textContent = '開始練習'; } else console.warn("quizBtn is null in onLoadCharDataSuccess");
                },
                onLoadCharDataError: function(reason) { 
                    console.error(`HanziWriter: onLoadCharDataError for "${char}"`, reason); 
                    if(currentCharText) currentCharText.textContent = `無法載入 "${char}"`; 
                    if(scoreFeedback) { scoreFeedback.textContent = '載入錯誤，請確認字元或網路。'; scoreFeedback.style.color = '#dc3545'; }
                    if(animateBtn) animateBtn.disabled = true; else console.warn("animateBtn is null in onLoadCharDataError");
                    if (quizBtn) { quizBtn.disabled = true; } else console.warn("quizBtn is null in onLoadCharDataError");
                    writer = null; // 載入失敗，明確將 writer 設為 null
                }
            });
        } catch (e) {
            console.error(`HanziWriter: HanziWriter.create FAILED for char "${char}" with error:`, e);
            writer = null; // 創建失敗，明確將 writer 設為 null
            if(animateBtn) animateBtn.disabled = true;
            if (quizBtn) { quizBtn.disabled = true; quizBtn.textContent = '開始練習'; }
            if(scoreFeedback) { scoreFeedback.textContent = '初始化寫字板失敗。'; scoreFeedback.style.color = '#dc3545';}
        }
        
        console.log("initializeWriter: Calling renderCharButtons at the end for char:", char);
        renderCharButtons(); 
        console.log(`<<<< initializeWriter: SUCCESSFULLY FINISHED FOR char = "${char}" >>>>`);
    }

    // --- 事件監聽器 ---
    if (submitManualCharBtn && manualCharInput) { /* ... (與上一版本相同) ... */ }
    
    if (animateBtn) { /* ... (與上一版本相同，內含日誌) ... */ } else { console.error("animateBtn element not found, listener not attached."); }
    
    if (quizBtn) {
        quizBtn.addEventListener('click', () => { 
            console.log('「開始練習」按鈕被點擊 (Event Listener Fired)'); 
            console.log("  quizBtn - writer:", writer); 
            console.log("  quizBtn - currentChar:", currentChar);
            console.log("  quizBtn - disabled state:", quizBtn.disabled);
            
            if (writer && currentChar) { 
                if (quizBtn.textContent === '開始練習' || quizBtn.textContent === '重新練習') { 
                    if (userStrokeOverlay) userStrokeOverlay.innerHTML = '';
                    userDrawnPaths = [];
                    console.log("  quizBtn - Quiz started: User stroke overlay and paths cleared.");
                }
                scoreFeedback.textContent = '請依照筆順書寫。'; 
                scoreFeedback.style.color = '#17a2b8'; 
                quizBtn.textContent = '練習中...'; 
                quizBtn.disabled = true; 
                console.log("  quizBtn - Calling writer.quiz()");
                try {
                    writer.quiz({ 
                        onCorrectStroke: function(data) { 
                            console.log("  quizBtn - onCorrectStroke triggered. Data:", data); 
                            scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`; 
                            scoreFeedback.style.color = '#28a745'; 
                            if (data.drawnPath && data.drawnPath.pathString) {
                                userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#28a745' }); 
                                redrawUserStrokeOverlay();
                            }
                        },
                        onMistake: function(data) { 
                            console.log("  quizBtn - onMistake triggered. Data:", data); 
                            scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`; 
                            scoreFeedback.style.color = '#dc3545'; 
                            if (data.drawnPath && data.drawnPath.pathString) {
                                userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#dc3545' }); 
                                redrawUserStrokeOverlay();
                            }
                        },
                        onComplete: function(summary) { 
                            console.log("  quizBtn - onComplete triggered. Summary:", summary); 
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
                            console.log("  quizBtn - onComplete: Preparing to speak char:", currentChar); 
                            if (currentChar) { 
                                speakCharacterInCantonese(currentChar);
                            } else {
                                console.warn("  quizBtn - onComplete: currentChar is empty, cannot speak.");
                            }
                        }
                    });
                } catch (e) {
                    console.error("  quizBtn - Error calling writer.quiz():", e);
                    scoreFeedback.textContent = '開始測驗失敗，請重試。';
                    scoreFeedback.style.color = '#dc3545';
                    quizBtn.textContent = '開始練習'; // 重設按鈕文字
                    quizBtn.disabled = false; // 重新啟用按鈕
                }
            } else if (!currentChar) {
                console.warn("  quizBtn - No currentChar, cannot start quiz.");
                scoreFeedback.textContent = '請先選擇一個字元才能開始練習。';
                scoreFeedback.style.color = '#dc3545';
            } else if (!writer) { 
                 console.error("  quizBtn - writer is not initialized. Cannot start quiz.");
                 scoreFeedback.textContent = '練習功能錯誤：Writer 未初始化。';
                 scoreFeedback.style.color = '#dc3545';
            }
        }); 
    } else { console.error("quizBtn element not found, listener not attached."); }
    
    if (resetBtn) { /* ... (與上一版本相同，內含日誌) ... */ } else { console.error("resetBtn element not found, listener not attached."); }
    if (clearAllUserCharsBtn) { /* ... (與上一版本相同，內含日誌) ... */ } else { console.error("clearAllUserCharsBtn element not found, listener not attached."); }

    if (prevPageBtn) { /* ... (與上一版本相同) ... */ } else { console.error("prevPageBtn not found"); }
    if (nextPageBtn) { /* ... (與上一版本相同) ... */ } else { console.error("nextPageBtn not found"); }
    
    // --- 初始載入 ---
    console.log("INITIAL LOAD (v6 - Final Diagnostic): Updating all chars for display.");
    updateAllCharsForDisplay(); 
    console.log("INITIAL LOAD (v6 - Final Diagnostic): Rendering char buttons. Initial currentPage:", currentPage);
    renderCharButtons();      
    
    let charToLoadInitially = PREDEFINED_CHARS.includes(currentChar) ? currentChar : PREDEFINED_CHARS[0];
    if (!charToLoadInitially && allCharsForDisplay.length > 0) {
        charToLoadInitially = allCharsForDisplay[0];
    }
    console.log("INITIAL LOAD (v6 - Final Diagnostic): Character to load initially:", charToLoadInitially || "none");
    initializeWriter(charToLoadInitially || ''); 

    const debouncedResizeHandler = debounce(() => { /* ... (與上一版本相同，內含日誌) ... */ });
    window.addEventListener('resize', debouncedResizeHandler);

}); // DOMContentLoaded 結束
