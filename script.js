let cantoneseVoice = null;
let voicesLoaded = false;
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];

function loadAvailableVoices() {
    // console.log("loadAvailableVoices called"); // 增加日誌
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
    loadAvailableVoices();
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
    console.log("DOM Fully Loaded and Parsed");
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

    function loadUserChars() {
        const charsJSON = localStorage.getItem(STORAGE_KEY);
        console.log("loadUserChars: from localStorage raw:", charsJSON);
        try {
            const parsedChars = JSON.parse(charsJSON);
            const result = Array.isArray(parsedChars) ? parsedChars : [];
            console.log("loadUserChars: parsed as:", JSON.stringify(result));
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
        console.log("updateAllCharsForDisplay: Called");
        const userChars = loadUserChars();
        console.log("updateAllCharsForDisplay: Loaded userChars:", JSON.stringify(userChars));
        const displayChars = [...PREDEFINED_CHARS];
        console.log("updateAllCharsForDisplay: Started with predefined:", JSON.stringify(displayChars));
        userChars.forEach(uc => {
            if (!displayChars.includes(uc)) { 
                displayChars.push(uc);
            }
        });
        allCharsForDisplay = displayChars;
        console.log("updateAllCharsForDisplay: Final allCharsForDisplay:", JSON.stringify(allCharsForDisplay));
    }

    function addUserChar(char) {
        console.log(`addUserChar: Attempting to add "${char}"`);
        if (!char || char.length !== 1) {
            console.warn("addUserChar: Invalid char to add (null, empty, or multiple chars).");
            return false;
        }
        const userChars = loadUserChars();
        if (PREDEFINED_CHARS.includes(char)) {
            console.log(`addUserChar: "${char}" is a predefined character.`);
            return false; 
        }
        if (userChars.includes(char)) {
            console.log(`addUserChar: "${char}" already exists in user characters.`);
            return false; 
        }
        userChars.push(char);
        saveUserChars(userChars);
        updateAllCharsForDisplay(); 
        console.log(`addUserChar: Successfully added "${char}". New allCharsForDisplay:`, JSON.stringify(allCharsForDisplay));
        return true;
    }

    function deleteUserChar(charToDelete) {
        console.log(`deleteUserChar: Attempting to delete "${charToDelete}"`);
        let userChars = loadUserChars();
        const initialLength = userChars.length;
        userChars = userChars.filter(char => char !== charToDelete);
        if (userChars.length < initialLength) {
            console.log(`deleteUserChar: "${charToDelete}" found and removed from userChars.`);
        } else {
            console.warn(`deleteUserChar: "${charToDelete}" not found in userChars.`);
        }
        saveUserChars(userChars);
        updateAllCharsForDisplay(); 
        console.log(`deleteUserChar: After deletion, allCharsForDisplay:`, JSON.stringify(allCharsForDisplay));
    }
    
    function updatePaginationControls() {
        // console.log("updatePaginationControls: Called. currentPage:", currentPage, "allCharsForDisplay.length:", allCharsForDisplay.length);
        if (!prevPageBtn || !nextPageBtn || !pageInfoSpan) { console.error("Pagination controls not found!"); return; }

        const totalChars = allCharsForDisplay.length;
        const totalPages = Math.max(1, Math.ceil(totalChars / CHARS_PER_PAGE)); 

        if (currentPage < 1 && totalPages > 0) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        pageInfoSpan.textContent = `第 ${totalPages === 0 ? 0 : currentPage}/${totalPages} 頁`;

        prevPageBtn.disabled = (currentPage === 1);
        nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
        // console.log(`updatePaginationControls: Page ${currentPage}/${totalPages}. Prev disabled: ${prevPageBtn.disabled}, Next disabled: ${nextPageBtn.disabled}`);
    }

    function renderCharButtons() {
        console.log("renderCharButtons: Called. currentChar:", currentChar, "currentPage:", currentPage);
        console.log("renderCharButtons: Current allCharsForDisplay:", JSON.stringify(allCharsForDisplay));
        if (!charButtonsWrapper) { console.error("renderCharButtons: charButtonsWrapper not found!"); return; }
        charButtonsWrapper.innerHTML = ''; 

        const startIndex = (currentPage - 1) * CHARS_PER_PAGE;
        const endIndex = startIndex + CHARS_PER_PAGE;
        const charsOnThisPage = allCharsForDisplay.slice(startIndex, endIndex);
        console.log(`renderCharButtons: Displaying page ${currentPage}. StartIndex: ${startIndex}, EndIndex: ${endIndex}. Chars on this page:`, JSON.stringify(charsOnThisPage));


        if (allCharsForDisplay.length === 0) {
            console.log("renderCharButtons: No characters to display at all.");
            charButtonsWrapper.innerHTML = '<p style="font-size: 0.9em; color: #666;">暫無字元，請手動輸入添加。</p>';
            if (!currentChar){ 
                 initializeWriter(''); // This will also call renderCharButtons, ensure no infinite loop
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
        
        charsOnThisPage.forEach((char) => { 
            // console.log(`renderCharButtons: Creating button for "${char}"`);
            const button = document.createElement('button');
            button.classList.add('char-btn'); 
            if (char === currentChar) {
                button.classList.add('active');
                // console.log(`renderCharButtons: Button for "${char}" is active.`);
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
                console.log(`Button for "${char}" clicked.`);
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
                    console.log(`Delete button for "${char}" clicked.`);
                    if (confirm(`您確定要從您的練習列表中刪除「${char}」嗎？`)) {
                        const charWasCurrent = currentChar === char;
                        deleteUserChar(char); 
                        
                        if (charWasCurrent) {
                            console.log(`Deleted current character "${char}". Determining next character.`);
                            const nextCharToLoad = allCharsForDisplay.length > 0 ? allCharsForDisplay[0] : ''; 
                            console.log(`Next character to load after delete: "${nextCharToLoad}"`);
                            initializeWriter(nextCharToLoad); 
                        }
                        
                        const totalPages = Math.max(1, Math.ceil(allCharsForDisplay.length / CHARS_PER_PAGE));
                        if (currentPage > totalPages) {
                            console.log(`Current page ${currentPage} is now out of bounds (total pages: ${totalPages}). Setting to ${totalPages}`);
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

    if (prevPageBtn) { prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderCharButtons(); } }); }
    if (nextPageBtn) { nextPageBtn.addEventListener('click', () => { const totalPages = Math.ceil(allCharsForDisplay.length / CHARS_PER_PAGE); if (currentPage < totalPages) { currentPage++; renderCharButtons(); } }); }
    
    if (clearAllUserCharsBtn) { clearAllUserCharsBtn.addEventListener('click', () => { /* ... (與上一版本相同，內含日誌) ... */ }); }

    function speakCharacterInCantonese(character) { /* ... (與上一版本相同，內含日誌) ... */ }
    function redrawUserStrokeOverlay() { /* ... (與上一版本相同，內含日誌) ... */ }

    function initializeWriter(char) {
        console.log(`initializeWriter: Called with char = "${char}"`);
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
            if (charButtonsWrapper && allCharsForDisplay.length === 0) {
                 console.log("initializeWriter: No characters in allCharsForDisplay, calling renderCharButtons to show empty message.");
                 renderCharButtons(); 
            }
            return;
        }

        currentChar = char; 
        currentCharText.textContent = char; 
        scoreFeedback.textContent = '---'; 
        scoreFeedback.style.color = '#D84315'; 

        targetDiv.innerHTML = ''; 
        
        if (userStrokeOverlay) {
            userStrokeOverlay.innerHTML = ''; 
            userStrokeOverlay.setAttribute('viewBox', '0 0 1024 1024'); 
        } else {
            console.error("initializeWriter: userStrokeOverlay is null!");
        }
        userDrawnPaths = [];

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
        console.log("initializeWriter: Calling renderCharButtons at the end for char:", char);
        renderCharButtons(); 
    }

    if (submitManualCharBtn && manualCharInput) {
        submitManualCharBtn.addEventListener('click', () => {
            const charToLoad = manualCharInput.value.trim();
            console.log(`Manual Submit: charToLoad = "${charToLoad}"`);
            if (charToLoad && charToLoad.length === 1) {
                const isNewCharAdded = addUserChar(charToLoad); 
                console.log(`Manual Submit: addUserChar returned ${isNewCharAdded}`);
                if (isNewCharAdded) {
                    currentPage = Math.max(1, Math.ceil(allCharsForDisplay.length / CHARS_PER_PAGE));
                    console.log(`Manual Submit: New char added. Set currentPage to ${currentPage}`);
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
    
    animateBtn.addEventListener('click', () => { /* ... (與上一版本相同，內含日誌) ... */ });
    quizBtn.addEventListener('click', () => { /* ... (與上一版本相同，內含日誌和發音) ... */ }); 
    resetBtn.addEventListener('click', () => { /* ... (與上一版本相同) ... */ });
    
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


    const debouncedResizeHandler = debounce(() => { /* ... (與上一版本相同，內含日誌) ... */ });
    window.addEventListener('resize', debouncedResizeHandler);

});
