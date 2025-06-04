let cantoneseVoice = null;
let voicesLoaded = false;

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

    function addUserChar(char) {
        if (!char || char.length !== 1) return false;
        const userChars = loadUserChars();
        if (PREDEFINED_CHARS.includes(char) || userChars.includes(char)) {
            console.log(`字元 "${char}" 已存在於預設列表或使用者列表中。`);
            return false; 
        }
        userChars.push(char);
        saveUserChars(userChars);
        return true;
    }

    function deleteUserChar(charToDelete) {
        let userChars = loadUserChars();
        userChars = userChars.filter(char => char !== charToDelete);
        saveUserChars(userChars);
        console.log(`已從列表中刪除字元 "${charToDelete}"`);
    }

    function renderCharButtons() {
        if (!charButtonsWrapper) return;
        charButtonsWrapper.innerHTML = ''; 

        const userChars = loadUserChars();
        const displayChars = [...PREDEFINED_CHARS];
        userChars.forEach(uc => {
            if (!displayChars.includes(uc)) { 
                displayChars.push(uc);
            }
        });

        if (displayChars.length === 0) {
            charButtonsWrapper.innerHTML = '<p style="font-size: 0.9em; color: #666;">暫無字元，請手動輸入添加。</p>';
            if (!currentChar && PREDEFINED_CHARS.length === 0 && userChars.length === 0){ // 如果沒有任何字元了
                 initializeWriter(''); // 傳遞空字串以清空畫板和相關狀態
            }
            return;
        }
        
        displayChars.forEach(char => {
            const button = document.createElement('button');
            button.classList.add('char-btn'); 
            if (char === currentChar) {
                button.classList.add('active');
            }
            button.dataset.char = char;
            button.textContent = char;

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
                        deleteUserChar(char);
                        
                        if (currentChar === char) {
                            const remainingUserChars = loadUserChars(); // 獲取刪除後的使用者字元列表
                            const nextCharToLoad = PREDEFINED_CHARS.length > 0 ? PREDEFINED_CHARS[0] : (remainingUserChars[0] || '');
                            initializeWriter(nextCharToLoad); // 會更新 currentChar
                        }
                        renderCharButtons(); 
                    }
                });
                button.appendChild(deleteBtn);
                button.classList.add('user-added-char'); 
            }
            charButtonsWrapper.appendChild(button);
        });
    }

    function speakCharacterInCantonese(character) {
        if (!('speechSynthesis' in window)) { console.warn('語音合成功能不可用。'); return; }
        if (!cantoneseVoice && voicesLoaded) { loadAvailableVoices(); }
        const utterance = new SpeechSynthesisUtterance(character);
        utterance.lang = 'zh-HK'; utterance.rate = 0.85; utterance.pitch = 1;
        if (cantoneseVoice) {
            utterance.voice = cantoneseVoice;
        } else {
            const allVoices = speechSynthesis.getVoices();
            const fallbackChineseVoice = allVoices.find(voice => voice.lang.startsWith('zh-CN')) || allVoices.find(voice => voice.lang.startsWith('zh-TW')) || allVoices.find(voice => voice.lang.startsWith('zh-'));
            if (fallbackChineseVoice) {
                utterance.voice = fallbackChineseVoice; utterance.lang = fallbackChineseVoice.lang;
                console.warn(`未找到廣東話，使用備選: "${fallbackChineseVoice.name}" (${fallbackChineseVoice.lang})`);
            } else { console.warn(`未找到廣東話或備選中文語音`); }
        }
        speechSynthesis.cancel(); speechSynthesis.speak(utterance);
        utterance.onerror = (e) => console.error('語音合成錯誤:', e.error);
    }

    function redrawUserStrokeOverlay() { 
        if (!userStrokeOverlay) return;
        userStrokeOverlay.innerHTML = ''; 
        userDrawnPaths.forEach(pathData => {
            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.setAttribute('d', pathData.path);
            pathElement.setAttribute('fill', 'none');
            pathElement.setAttribute('stroke', pathData.color); 
            pathElement.setAttribute('stroke-width', '3'); 
            pathElement.setAttribute('stroke-linecap', 'round');
            pathElement.setAttribute('stroke-linejoin', 'round');
            pathElement.setAttribute('opacity', '0.8'); 
            userStrokeOverlay.appendChild(pathElement);
        });
    }

    function initializeWriter(char) {
        if (!char) { // 處理沒有字元可載入的情況
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
            if (charButtonsWrapper.querySelectorAll('.char-btn').length === 0) {
                 renderCharButtons(); // 確保顯示 "暫無字元" 提示
            }
            return;
        }

        console.log('initializeWriter called with char:', char);
        currentChar = char; // 更新 currentChar
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
                    quizBtn.disabled = true; //
                }
            }
        });
        // Call renderCharButtons to ensure the correct button is highlighted as active
        renderCharButtons();
    }

    if (submitManualCharBtn && manualCharInput) {
        submitManualCharBtn.addEventListener('click', () => {
            const charToLoad = manualCharInput.value.trim();
            if (charToLoad && charToLoad.length === 1) {
                // 先將其設為當前字元並嘗試初始化
                // initializeWriter 會更新 currentChar
                initializeWriter(charToLoad); 
                
                // 然後嘗試添加到 localStorage (如果不是預設字且不存在於使用者列表)
                // addUserChar 內部會檢查重複
                const addedToStorage = addUserChar(charToLoad);
                if (addedToStorage) {
                    renderCharButtons(); // 如果成功添加到 localStorage，則重新渲染按鈕列表
                                         // initializeWriter 內部已調用 renderCharButtons，這裡可能多餘，但確保狀態一致
                }
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
    
    animateBtn.addEventListener('click', () => { /* ... (與上一版本相同) ... */ });
    
    quizBtn.addEventListener('click', () => { //
        if (writer) { //
            if (quizBtn.textContent === '開始練習' || quizBtn.textContent === '重新練習') { //
                if (userStrokeOverlay) userStrokeOverlay.innerHTML = '';
                userDrawnPaths = [];
            }
            scoreFeedback.textContent = '請依照筆順書寫。'; //
            scoreFeedback.style.color = '#17a2b8'; //
            quizBtn.textContent = '練習中...'; //
            quizBtn.disabled = true; //

            writer.quiz({ //
                onCorrectStroke: function(data) { /* ... (與上一版本相同, 含 redrawUserStrokeOverlay) ... */ 
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`;
                    scoreFeedback.style.color = '#28a745';
                    if (data.drawnPath) {
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#28a745' }); 
                        redrawUserStrokeOverlay();
                    }
                },
                onMistake: function(data) { /* ... (與上一版本相同, 含 redrawUserStrokeOverlay) ... */ 
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`;
                    scoreFeedback.style.color = '#dc3545';
                     if (data.drawnPath) {
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#dc3545' }); 
                        redrawUserStrokeOverlay();
                    }
                },
                onComplete: function(summary) { /* ... (與上一版本相同, 含 speakCharacterInCantonese) ... */ 
                    let mistakes = summary.totalMistakes;
                    let score = 0;
                    if (totalStrokes > 0) { /* ... */ }
                    if (score >= 80) { /* ... */ }
                    else if (score >= 60) { /* ... */ }
                    else { /* ... */ }
                    quizBtn.textContent = '重新練習';
                    quizBtn.disabled = false;
                    if (currentChar) { speakCharacterInCantonese(currentChar); }
                }
            });
        }
    });

    resetBtn.addEventListener('click', () => { //
        // 確保 currentChar 有一個有效值去重設
        let charToReset = currentChar;
        if (!charToReset) { // 如果 currentChar 為空 (例如所有字都被刪除了)
            const userChars = loadUserChars();
            charToReset = PREDEFINED_CHARS.length > 0 ? PREDEFINED_CHARS[0] : (userChars[0] || '');
        }
        
        if (charToReset) { // 只有在確定有字可以重設時才執行
            initializeWriter(charToReset); 
            scoreFeedback.textContent = '已重設，請重新開始。'; //
            scoreFeedback.style.color = '#17a2b8'; //
        } else {
             // 如果仍然沒有字可以重設 (例如列表為空)
            initializeWriter(''); // 清空畫板並顯示提示
        }
    });
    
    renderCharButtons(); 
    const initialUserChars = loadUserChars();
    const charToLoadInitially = PREDEFINED_CHARS[0] || initialUserChars[0] || '';
    initializeWriter(charToLoadInitially);


    const debouncedResizeHandler = debounce(() => {
        const isQuizActive = quizBtn && quizBtn.disabled === true && quizBtn.textContent === '練習中...';
        if (isQuizActive) {
            console.log('視窗大小改變，但測驗進行中。HanziWriter 不重新初始化。');
            return; 
        }
        if (writer && currentChar) {
            console.log('視窗大小/方向改變，重新初始化 HanziWriter (字元:', currentChar, ')');
            initializeWriter(currentChar);
        } else if (currentChar === '' && (PREDEFINED_CHARS.length > 0 || loadUserChars().length > 0)) {
            // 如果當前字元為空，但仍有字可以載入 (例如全部刪除後又添加了新字，但尚未選中)
            // 則嘗試載入第一個可用的字
            const nextCharToLoad = PREDEFINED_CHARS[0] || loadUserChars()[0] || '';
            if(nextCharToLoad) initializeWriter(nextCharToLoad);
        }
    }, 250);
    window.addEventListener('resize', debouncedResizeHandler);
});
