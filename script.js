let cantoneseVoice = null;
let voicesLoaded = false;

// 新增：按鈕顏色調色盤
const BUTTON_COLOR_PALETTE = [
    '#FF8A65', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8',
    '#4DB6AC', '#7986CB', '#90A4AE', '#A1887F', '#F06292',
    '#FFAB40', '#40C4FF', '#69F0AE', '#FFEE58', '#CE93D8'
];
let lastColorIndex = -1; // 用於嘗試避免相鄰按鈕顏色太接近或重複

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
            if (!currentChar){ 
                 initializeWriter('');
            }
            return;
        }
        
        displayChars.forEach((char, index) => { // 增加 index 以便選擇顏色
            const button = document.createElement('button');
            button.classList.add('char-btn'); 
            if (char === currentChar) {
                button.classList.add('active');
            }
            button.dataset.char = char;
            button.textContent = char;

            // 設定隨機背景顏色
            let colorIndex;
            if (PREDEFINED_CHARS.includes(char)) {
                // 為預設字元保留之前的固定顏色 (如果需要的話，或者也讓它們隨機)
                // 這裡我讓預設字元也參與隨機顏色，以符合「每個字隨機顯示不同顏色」
                colorIndex = (index + PREDEFINED_CHARS.indexOf(char)) % BUTTON_COLOR_PALETTE.length; // 簡單的分配方式
            } else {
                 // 簡單循環使用調色盤顏色，避免緊鄰的顏色相同
                lastColorIndex = (lastColorIndex + 1) % BUTTON_COLOR_PALETTE.length;
                colorIndex = lastColorIndex;
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
                        deleteUserChar(char);
                        
                        if (currentChar === char) {
                            const remainingUserChars = loadUserChars(); 
                            const nextCharToLoad = PREDEFINED_CHARS.length > 0 ? PREDEFINED_CHARS[0] : (remainingUserChars[0] || '');
                            initializeWriter(nextCharToLoad); 
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
        console.log("speakCharacterInCantonese called for:", character); // 調試日誌
        if (!character) {
            console.warn("嘗試朗讀的字元為空。");
            return;
        }
        if (!('speechSynthesis' in window)) { console.warn('語音合成功能不可用。'); return; }
        
        if (!voicesLoaded) { // 如果 voicesLoaded 仍為 false，嘗試強制更新一次
            console.log("語音列表尚未標記為已載入，嘗試再次獲取...");
            loadAvailableVoices(); // 確保在朗讀前嘗試獲取最新的語音列表
        }
        // 即使 loadAvailableVoices 被呼叫，cantoneseVoice 也可能仍然是 null
        // 所以在真正使用前再次檢查
        let voiceToUse = cantoneseVoice;
        if (!voiceToUse) {
            const allVoices = speechSynthesis.getVoices(); // 在朗讀前即時獲取
            if (allVoices.length > 0 && !cantoneseVoice) { // 只有在之前 cantoneseVoice 未找到時才重新查找
                 cantoneseVoice = allVoices.find(voice => voice.lang === 'zh-HK');
                 voiceToUse = cantoneseVoice;
            }

            if (voiceToUse) {
                 console.log('在朗讀前找到廣東話語音:', voiceToUse.name);
            } else {
                 const fallbackChineseVoice = allVoices.find(voice => voice.lang.startsWith('zh-CN')) || allVoices.find(voice => voice.lang.startsWith('zh-TW')) || allVoices.find(voice => voice.lang.startsWith('zh-'));
                if (fallbackChineseVoice) {
                    voiceToUse = fallbackChineseVoice;
                    console.warn(`未找到廣東話，使用備選: "${voiceToUse.name}" (${voiceToUse.lang})`);
                } else { 
                    console.warn(`未找到廣東話或備選中文語音，將使用瀏覽器預設語音。`);
                }
            }
        }


        const utterance = new SpeechSynthesisUtterance(character);
        if (voiceToUse) {
            utterance.voice = voiceToUse;
            utterance.lang = voiceToUse.lang; // 使用選定語音的 lang 屬性
        } else {
            utterance.lang = 'zh-HK'; // 如果連備選都沒有，還是嘗試設定為 zh-HK
        }
        utterance.rate = 0.85;   
        utterance.pitch = 1;    
        
        speechSynthesis.cancel(); // 取消之前的朗讀
        console.log("準備朗讀:", utterance);
        speechSynthesis.speak(utterance);

        utterance.onstart = () => console.log("朗讀開始:", character);
        utterance.onend = () => console.log("朗讀結束:", character);
        utterance.onerror = (e) => console.error('語音合成錯誤:', e.error, "朗讀的字:", character);
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
            if (charButtonsWrapper.querySelectorAll('.char-btn').length === 0) {
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
                // 先將其設為當前字元並嘗試初始化
                // initializeWriter 會更新 currentChar 並觸發 renderCharButtons
                initializeWriter(charToLoad); 
                
                const addedToStorage = addUserChar(charToLoad);
                if (addedToStorage) {
                    // 如果是新字且成功加入 localStorage，initializeWriter 內部已調用 renderCharButtons
                    // 所以這裡可能不需要再次調用，或者確保 initializeWriter 最後調用 renderCharButtons
                    // initializeWriter 最後確實調用了 renderCharButtons，所以這裡可以不用再調用
                } else {
                    // 如果字元已存在，initializeWriter 也會處理並高亮它
                    // 也確保 renderCharButtons 被調用以正確高亮
                    renderCharButtons();
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
    
    animateBtn.addEventListener('click', () => { 
        if (writer) writer.animateCharacter(); 
        scoreFeedback.textContent = '請觀察筆順。'; 
        scoreFeedback.style.color = '#17a2b8'; 
    }); 
    
    quizBtn.addEventListener('click', () => { 
        if (writer) { 
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

                    console.log("測驗完成，準備朗讀字元:", currentChar); // 調試日誌
                    if (currentChar) { 
                        speakCharacterInCantonese(currentChar);
                    }
                }
            });
        }
    });

    resetBtn.addEventListener('click', () => { 
        let charToReset = currentChar;
        if (!charToReset) { 
            const userChars = loadUserChars();
            charToReset = PREDEFINED_CHARS.length > 0 ? PREDEFINED_CHARS[0] : (userChars[0] || '');
        }
        
        if (charToReset) { 
            initializeWriter(charToReset); 
            scoreFeedback.textContent = '已重設，請重新開始。'; 
            scoreFeedback.style.color = '#17a2b8'; 
        } else {
            initializeWriter(''); 
        }
    });
    
    renderCharButtons(); 
    const initialUserChars = loadUserChars();
    const charToLoadInitially = PREDEFINED_CHARS[0] || initialUserChars[0] || '';
    if (charToLoadInitially) { // 只有在確定有字元可載入時才初始化
        initializeWriter(charToLoadInitially);
    } else {
        initializeWriter(''); // 如果列表為空，則使用空字串進行初始化以顯示提示
    }


    const debouncedResizeHandler = debounce(() => {
        const isQuizActive = quizBtn && quizBtn.disabled === true && quizBtn.textContent === '練習中...';
        if (isQuizActive) {
            console.log('視窗大小改變，但測驗正在進行中。HanziWriter 不重新初始化。');
            return; 
        }
        if (writer && currentChar) {
            console.log('視窗大小/方向改變，重新初始化 HanziWriter (字元:', currentChar, ')');
            initializeWriter(currentChar);
        } else if (currentChar === '' && (PREDEFINED_CHARS.length > 0 || loadUserChars().length > 0)) {
            const nextCharToLoad = PREDEFINED_CHARS[0] || loadUserChars()[0] || '';
            if(nextCharToLoad) initializeWriter(nextCharToLoad);
        }
    }, 250);
    window.addEventListener('resize', debouncedResizeHandler);
});
