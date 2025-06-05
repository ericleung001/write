let cantoneseVoice = null;
let voicesLoaded = false;
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];

function loadAvailableVoices() { /* ... (與上一版本相同) ... */ }
if ('speechSynthesis' in window) { /* ... (與上一版本相同) ... */ } else { /* ... */ }
function debounce(func, wait) { /* ... (與上一版本相同) ... */ }

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Fully Loaded and Parsed - v4 (Char List & Button Diagnostics)"); 
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
    console.log("SCRIPT START: DOM: charButtonsWrapper element:", charButtonsWrapper);

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
        // console.log("loadUserChars: from localStorage raw:", charsJSON); // 可以取消註釋以查看原始數據
        try {
            const parsedChars = JSON.parse(charsJSON);
            const result = Array.isArray(parsedChars) ? parsedChars : [];
            // console.log("loadUserChars: parsed as:", JSON.stringify(result));
            return result;
        } catch (e) {
            console.error("loadUserChars: Error parsing JSON from localStorage", e);
            return [];
        }
    }

    function saveUserChars(charsArray) {
        console.log("saveUserChars: Saving to localStorage:", JSON.stringify(charsArray));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(charsArray));
    }
    
    function updateAllCharsForDisplay() {
        console.log("--- updateAllCharsForDisplay: Called ---");
        const userChars = loadUserChars();
        console.log("updateAllCharsForDisplay: Loaded userChars from localStorage:", JSON.stringify(userChars));
        const displayChars = [...PREDEFINED_CHARS];
        console.log("updateAllCharsForDisplay: Started with PREDEFINED_CHARS:", JSON.stringify(displayChars));
        userChars.forEach(uc => {
            if (!displayChars.includes(uc)) { 
                displayChars.push(uc);
            }
        });
        allCharsForDisplay = displayChars; // 更新全域變數
        console.log("updateAllCharsForDisplay: Final allCharsForDisplay SET TO:", JSON.stringify(allCharsForDisplay));
        console.log("--- updateAllCharsForDisplay: Finished ---");
    }

    function addUserChar(char) { /* ... (與上一版本相同，內含日誌) ... */ }
    function deleteUserChar(charToDelete) { /* ... (與上一版本相同，內含日誌) ... */ }
    function updatePaginationControls() { /* ... (與上一版本相同) ... */ }

    function renderCharButtons() {
        console.log("--- renderCharButtons: Called ---");
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
            // 如果 initializeWriter 之前不是因為列表為空而調用，這裡確保清空
            // if (currentChar) initializeWriter(''); // 避免在 initializeWriter('') 內部再次調用 renderCharButtons 導致循環
            updatePaginationControls();
            return;
        }
        
        if (charsOnThisPage.length === 0 && currentPage > 1) {
            console.log(`renderCharButtons: Current page ${currentPage} is empty (charsOnThisPage.length is 0), but not page 1. Moving to previous page.`);
            currentPage--;
            renderCharButtons(); 
            return; 
        }
        
        if (charsOnThisPage.length === 0 && allCharsForDisplay.length > 0) {
             console.warn("renderCharButtons: charsOnThisPage is empty, but allCharsForDisplay is not. This implies an issue if on page 1, or pagination logic might need adjustment.");
        }

        charsOnThisPage.forEach((char) => { 
            console.log(`renderCharButtons: Creating button for char: "${char}"`);
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
                deleteBtn.addEventListener('click', (event) => { /* ... (與上一版本相同，內含日誌) ... */ });
                button.appendChild(deleteBtn);
                button.classList.add('user-added-char'); 
            }
            charButtonsWrapper.appendChild(button);
        });
        updatePaginationControls();
        console.log("--- renderCharButtons: Finished ---");
    }

    // --- 其他函式 (speakCharacterInCantonese, redrawUserStrokeOverlay) ---
    function speakCharacterInCantonese(character) { /* ... (與上一版本相同，內含日誌) ... */ }
    function redrawUserStrokeOverlay() { /* ... (與上一版本相同，內含日誌) ... */ }

    // --- HanziWriter 初始化函式 ---
    function initializeWriter(char) {
        console.log(`--- initializeWriter: Called with char = "${char}" ---`);
        if (!char) { 
            console.log("initializeWriter: Character is empty. Clearing canvas and showing prompts.");
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
            // 當字元為空時，確保按鈕列表也反映此狀態（例如顯示 "暫無字元"）
            // 檢查 allCharsForDisplay 是否也為空，如果是，renderCharButtons 會處理提示
            if (allCharsForDisplay.length === 0) {
                 console.log("initializeWriter (empty char): No characters in allCharsForDisplay, calling renderCharButtons.");
                 renderCharButtons(); 
            }
            return;
        }

        currentChar = char; 
        currentCharText.textContent = char; 
        scoreFeedback.textContent = '---'; 
        scoreFeedback.style.color = '#D84315'; 

        targetDiv.innerHTML = ''; 
        if (userStrokeOverlay) { /* ... (與上一版本相同) ... */ } else { console.error("initializeWriter: userStrokeOverlay is null!"); }
        userDrawnPaths = [];

        const containerWidth = hanziCanvasContainer.offsetWidth;
        const containerHeight = hanziCanvasContainer.offsetHeight; 
        const finalCanvasWidth = containerWidth > 0 ? containerWidth : 250;
        const finalCanvasHeight = containerHeight > 0 ? containerHeight : 250;
        
        console.log(`HanziWriter: Creating instance for "${char}" with size ${finalCanvasWidth}x${finalCanvasHeight}`);
        writer = HanziWriter.create(targetDiv, char, {
            width: finalCanvasWidth,  
            height: finalCanvasHeight, 
            padding: 10, showOutline: true, showCharacter: true, strokeAnimationSpeed: 1, 
            delayBetweenStrokes: 250, strokeColor: '#4A4A4A', highlightColor: '#F06292', 
            outlineColor: '#FFD180', drawingColor: '#29B6F6', drawingWidth: 14, 
            onLoadCharDataSuccess: function(data) { 
                console.log(`HanziWriter: onLoadCharDataSuccess for "${char}"`);
                totalStrokes = data.strokes.length; 
                if(animateBtn) animateBtn.disabled = false; 
                if (quizBtn) { quizBtn.disabled = false; quizBtn.textContent = '開始練習'; }
            },
            onLoadCharDataError: function(reason) { 
                console.error(`HanziWriter: onLoadCharDataError for "${char}"`, reason);
                currentCharText.textContent = `無法載入 "${char}"`; 
                scoreFeedback.textContent = '載入錯誤，請確認字元或網路。'; 
                scoreFeedback.style.color = '#dc3545'; 
                if(animateBtn) animateBtn.disabled = true; 
                if (quizBtn) { quizBtn.disabled = true; }
            }
        });
        console.log("initializeWriter: Calling renderCharButtons at the end for char:", char);
        renderCharButtons(); 
        console.log("--- initializeWriter: Finished for char:", char, "---");
    }

    // --- 事件監聽器 ---
    if (submitManualCharBtn && manualCharInput) { /* ... (與上一版本相同，內含日誌) ... */ }
    
    if (animateBtn) { /* ... (與上一版本相同，內含日誌) ... */ } else { console.error("animateBtn element not found, listener not attached."); }
    if (quizBtn) {
        quizBtn.addEventListener('click', () => { 
            console.log('「開始練習」按鈕被點擊 (Event Listener Fired)'); 
            console.log("「開始練習」按鈕內部 - writer:", writer, "currentChar:", currentChar, "quizBtn.disabled:", quizBtn.disabled); // 新增日誌
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
                    onCorrectStroke: function(data) { /* ... (與上一版本相同) ... */ },
                    onMistake: function(data) { /* ... (與上一版本相同) ... */ },
                    onComplete: function(summary) { /* ... (與上一版本相同) ... */ }
                });
            } else if (!currentChar) {
                console.warn("Quiz button: No currentChar, cannot start quiz.");
                scoreFeedback.textContent = '請先選擇一個字元才能開始練習。';
                scoreFeedback.style.color = '#dc3545';
            } else if (!writer) { // 明確檢查 writer 是否為 null
                 console.error("Quiz button: writer is not initialized. Cannot start quiz.");
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
    console.log("INITIAL LOAD: Updating all chars for display.");
    updateAllCharsForDisplay(); 
    console.log("INITIAL LOAD: Rendering char buttons. Initial currentPage:", currentPage);
    renderCharButtons();      
    
    let charToLoadInitially = PREDEFINED_CHARS.includes(currentChar) ? currentChar : PREDEFINED_CHARS[0];
    if (!charToLoadInitially && allCharsForDisplay.length > 0) {
        charToLoadInitially = allCharsForDisplay[0];
    }
    console.log("INITIAL LOAD: Character to load initially:", charToLoadInitially || "none (will call initializeWriter with empty)");
    initializeWriter(charToLoadInitially || ''); 

    const debouncedResizeHandler = debounce(() => { /* ... (與上一版本相同，內含日誌) ... */ });
    window.addEventListener('resize', debouncedResizeHandler);

}); // DOMContentLoaded 結束
