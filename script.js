let cantoneseVoice = null;
let voicesLoaded = false;
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];

function loadAvailableVoices() { /* ... (與上一版本相同，為簡潔省略，請保留你版本中的實現) ... */ }
if ('speechSynthesis' in window) { /* ... (與上一版本相同) ... */ } else { /* ... */ }
function debounce(func, wait) { /* ... (與上一版本相同) ... */ }

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Fully Loaded and Parsed - v2"); // 加個標記，方便識別版本
    const PREDEFINED_CHARS = ["我", "你", "們"]; 
    console.log("PREDEFINED_CHARS:", JSON.stringify(PREDEFINED_CHARS));
    let currentChar = PREDEFINED_CHARS[0] || ''; 
    console.log("Initial currentChar:", currentChar);
    let writer = null;
    let totalStrokes = 0;

    const CHARS_PER_PAGE = 20;
    let currentPage = 1;
    let allCharsForDisplay = []; 

    const charButtonsWrapper = document.querySelector('.char-buttons-wrapper'); 
    console.log("DOM: charButtonsWrapper element:", charButtonsWrapper);

    const currentCharText = document.getElementById('current-char-text');
    const targetDiv = document.getElementById('character-target-div');
    const hanziCanvasContainer = document.getElementById('hanzi-canvas-container');
    const userStrokeOverlay = document.getElementById('user-stroke-overlay');
    let userDrawnPaths = [];

    const animateBtn = document.getElementById('animate-btn');
    console.log("DOM: animateBtn element:", animateBtn); // *** 新增日誌 ***
    const quizBtn = document.getElementById('quiz-btn');
    console.log("DOM: quizBtn element:", quizBtn); // *** 新增日誌 ***
    const resetBtn = document.getElementById('reset-btn');
    console.log("DOM: resetBtn element:", resetBtn); // *** 新增日誌 ***
    const scoreFeedback = document.getElementById('score-feedback');

    const manualCharInput = document.getElementById('manual-char-input');
    const submitManualCharBtn = document.getElementById('submit-manual-char-btn');

    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoSpan = document.getElementById('page-info');
    const clearAllUserCharsBtn = document.getElementById('clear-all-user-chars-btn');
    console.log("DOM: clearAllUserCharsBtn element:", clearAllUserCharsBtn); // *** 新增日誌 ***

    const STORAGE_KEY = 'userAddedHanziChars';

    // --- LocalStorage 及字元列表管理函式 ---
    function loadUserChars() { /* ... (與上一版本相同) ... */ }
    function saveUserChars(charsArray) { /* ... (與上一版本相同) ... */ }
    function updateAllCharsForDisplay() { /* ... (與上一版本相同，內含日誌) ... */ }
    function addUserChar(char) { /* ... (與上一版本相同，內含日誌) ... */ }
    function deleteUserChar(charToDelete) { /* ... (與上一版本相同，內含日誌) ... */ }
    
    // --- 分頁及按鈕渲染函式 ---
    function updatePaginationControls() { /* ... (與上一版本相同) ... */ }
    function renderCharButtons() { /* ... (與上一版本相同，內含日誌) ... */ }

    // --- 語音及筆劃疊加函式 ---
    function speakCharacterInCantonese(character) { /* ... (與上一版本相同，內含日誌) ... */ }
    function redrawUserStrokeOverlay() { /* ... (與上一版本相同，內含日誌) ... */ }

    // --- HanziWriter 初始化函式 ---
    function initializeWriter(char) { /* ... (與上一版本相同，內含日誌) ... */ }

    // --- 事件監聽器 ---
    if (charButtonsWrapper) { // 確保 wrapper 存在 (雖然 renderCharButtons 內部有檢查)
      // 按鈕的事件監聽器在 renderCharButtons 內部動態添加
    }

    if (submitManualCharBtn && manualCharInput) { /* ... (與上一版本相同，內含日誌) ... */ }
    
    // 為「看動畫」、「開始練習」、「重設」、「清除所有自訂字」按鈕添加事件監聽器
    if (animateBtn) {
        animateBtn.addEventListener('click', () => {
            console.log('「看動畫」按鈕被點擊 (Event Listener Fired)'); // *** 新增日誌 ***
            // ... (原有的 animateBtn 邏輯，包含更多日誌)
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
    } else {
        console.error("animateBtn element not found, listener not attached.");
    }
    
    if (quizBtn) {
        quizBtn.addEventListener('click', () => { 
            console.log('「開始練習」按鈕被點擊 (Event Listener Fired)'); // *** 新增日誌 ***
            // ... (原有的 quizBtn 邏輯，包含更多日誌和發音呼叫) ...
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
                    onCorrectStroke: function(data) { /* ... */ },
                    onMistake: function(data) { /* ... */ },
                    onComplete: function(summary) { 
                        /* ... */ 
                        if (currentChar) { 
                            speakCharacterInCantonese(currentChar);
                        } else { /* ... */ }
                    }
                });
            } else if (!currentChar) { /* ... */ } else { /* ... */ }
        }); 
    } else {
        console.error("quizBtn element not found, listener not attached.");
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => { 
            console.log('「重設」按鈕被點擊 (Event Listener Fired)'); // *** 新增日誌 ***
            // ... (原有的 resetBtn 邏輯) ...
            let charToReset = currentChar;
            if (!charToReset && allCharsForDisplay.length > 0) { 
                charToReset = allCharsForDisplay[0];
            } else if (!charToReset && allCharsForDisplay.length === 0) { 
                charToReset = '';
            }
            initializeWriter(charToReset); 
            if (charToReset) {
                scoreFeedback.textContent = '已重設，請重新開始。'; 
                scoreFeedback.style.color = '#17a2b8'; 
            }
        });
    } else {
        console.error("resetBtn element not found, listener not attached.");
    }
    
    if (clearAllUserCharsBtn) {
        clearAllUserCharsBtn.addEventListener('click', () => {
            console.log('「清除所有自訂字」按鈕被點擊 (Event Listener Fired)'); // *** 新增日誌 ***
            // ... (原有的 clearAllUserCharsBtn 邏輯) ...
            const currentUserChars = loadUserChars();
            if (currentUserChars.length === 0) { /* ... */ return; }
            if (confirm("您確定要清除所有手動加入的練習字嗎？\n此操作無法復原。")) {
                saveUserChars([]); 
                updateAllCharsForDisplay(); 
                currentPage = 1; 
                let charToLoadAfterClear = PREDEFINED_CHARS.length > 0 ? PREDEFINED_CHARS[0] : '';
                initializeWriter(charToLoadAfterClear); 
                scoreFeedback.textContent = '所有自訂字元已清除。';
                scoreFeedback.style.color = '#17a2b8'; 
            }
        });
    } else {
        console.error("clearAllUserCharsBtn element not found, listener not attached.");
    }

    // --- 分頁按鈕事件監聽 ---
    if (prevPageBtn) { prevPageBtn.addEventListener('click', () => { /* ... */ });} else { console.error("prevPageBtn not found"); }
    if (nextPageBtn) { nextPageBtn.addEventListener('click', () => { /* ... */ });} else { console.error("nextPageBtn not found"); }
    
    // --- 初始載入 ---
    console.log("Initial page setup: Updating all chars for display.");
    updateAllCharsForDisplay(); 
    console.log("Initial page setup: Rendering char buttons.");
    renderCharButtons();      
    
    let charToLoadInitially = PREDEFINED_CHARS.includes(currentChar) ? currentChar : PREDEFINED_CHARS[0];
    if (!charToLoadInitially && allCharsForDisplay.length > 0) {
        charToLoadInitially = allCharsForDisplay[0];
    }
    console.log("Initial page setup: Character to load initially:", charToLoadInitially || "none");
    initializeWriter(charToLoadInitially || ''); 

    // --- Resize 事件處理 ---
    const debouncedResizeHandler = debounce(() => { /* ... (與上一版本相同，內含日誌) ... */ });
    window.addEventListener('resize', debouncedResizeHandler);

}); // DOMContentLoaded 結束
