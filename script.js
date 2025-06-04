document.addEventListener('DOMContentLoaded', () => {
    // 等待 HTML 文件完全載入並解析後才執行
    const characters = ["我", "你", "們"]; // 可練習的漢字列表
    let currentChar = characters[0]; // 目前選擇的漢字，預設為第一個
    let writer = null; // 用於儲存 Hanzi Writer 的實例
    let totalStrokes = 0; // 目前漢字的總筆劃數

    // 獲取 HTML 元素
    const charButtons = document.querySelectorAll('.char-btn');
    const currentCharText = document.getElementById('current-char-text');
    const targetDiv = document.getElementById('character-target-div');
    const animateBtn = document.getElementById('animate-btn');
    const quizBtn = document.getElementById('quiz-btn');
    const resetBtn = document.getElementById('reset-btn');
    const scoreFeedback = document.getElementById('score-feedback');

    // 新增：獲取手動輸入相關元素
    const manualCharInput = document.getElementById('manual-char-input');
    const submitManualCharBtn = document.getElementById('submit-manual-char-btn');

    /**
     * 初始化或更新 Hanzi Writer 實例
     * @param {string} char - 要顯示和練習的漢字
     */
    function initializeWriter(char) {
        console.log('initializeWriter called with char:', char);
        currentChar = char; // 更新當前字元
        console.log('Setting currentCharText.textContent to:', char);
        currentCharText.textContent = char;
        scoreFeedback.textContent = '---';
        scoreFeedback.style.color = '#D84315'; // 更新預設回饋顏色

        targetDiv.innerHTML = ''; // 清除舊的畫布

        let canvasSize = 250; // 預設畫布大小
        if (window.innerWidth >= 600) {
            canvasSize = 280; // 較大螢幕使用較大畫布
        }

        writer = HanziWriter.create(targetDiv, char, {
            width: canvasSize,
            height: canvasSize,
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
                console.log('onLoadCharDataSuccess for char:', char, data);
                totalStrokes = data.strokes.length;
                animateBtn.disabled = false;
                if (quizBtn) { // 檢查 quizBtn 是否存在
                    quizBtn.disabled = false;
                    quizBtn.textContent = '開始練習';
                }
            },
            onLoadCharDataError: function(reason) {
                console.error('onLoadCharDataError for char:', char, reason);
                currentCharText.textContent = `無法載入 "${char}"`;
                scoreFeedback.textContent = '載入錯誤，請確認字元或網路。';
                scoreFeedback.style.color = '#dc3545';
                animateBtn.disabled = true;
                if (quizBtn) { // 檢查 quizBtn 是否存在
                    quizBtn.disabled = true;
                }
            }
        });

        // 更新預設字元按鈕的 active 狀態
        charButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.char === char);
        });
    }

    // 為預設字元按鈕綁定事件
    charButtons.forEach(button => {
        button.addEventListener('click', () => {
            initializeWriter(button.dataset.char);
        });
    });

    // 為手動輸入按鈕綁定事件
    if (submitManualCharBtn && manualCharInput) { // 確保元素存在
        submitManualCharBtn.addEventListener('click', () => {
            console.log('Submit button clicked.');
            const charToLoad = manualCharInput.value.trim();
            console.log('Character to load:', charToLoad, 'Length:', charToLoad.length);

            if (charToLoad && charToLoad.length === 1) {
                console.log('Calling initializeWriter with:', charToLoad);
                initializeWriter(charToLoad);
                manualCharInput.value = ''; // 清空輸入框
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
        if (writer) {
            writer.animateCharacter();
            scoreFeedback.textContent = '請觀察筆順。';
            scoreFeedback.style.color = '#17a2b8';
        }
    });

    quizBtn.addEventListener('click', () => {
        if (writer) {
            scoreFeedback.textContent = '請依照筆順書寫。';
            scoreFeedback.style.color = '#17a2b8';
            quizBtn.textContent = '練習中...';
            quizBtn.disabled = true;

            writer.quiz({
                onCorrectStroke: function(data) {
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`;
                    scoreFeedback.style.color = '#28a745';
                },
                onMistake: function(data) {
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`;
                    scoreFeedback.style.color = '#dc3545';
                },
                onComplete: function(summary) {
                    let mistakes = summary.totalMistakes;
                    let score = 0;

                    if (totalStrokes > 0) {
                        if (mistakes === 0) {
                            score = 100;
                        } else if (mistakes <= Math.ceil(totalStrokes * 0.25)) {
                            score = 80 - (mistakes - 1) * 5;
                        } else if (mistakes <= Math.ceil(totalStrokes * 0.5)) {
                            score = 60 - (mistakes - Math.ceil(totalStrokes * 0.25) - 1) * 5;
                        } else {
                            score = Math.max(0, 40 - (mistakes - Math.ceil(totalStrokes * 0.5)) * 5);
                        }
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
                }
            });
        }
    });

    resetBtn.addEventListener('click', () => {
        if (writer && currentChar) { // 確保 currentChar 有效
            initializeWriter(currentChar); // 重設為最後一個成功載入的字
            scoreFeedback.textContent = '已重設，請重新開始。';
            scoreFeedback.style.color = '#17a2b8';
        } else if (characters.length > 0) { // 如果 currentChar 無效，嘗試重設為列表第一個字
             initializeWriter(characters[0]);
             scoreFeedback.textContent = '已重設，請重新開始。';
             scoreFeedback.style.color = '#17a2b8';
        }
    });

    // 初始載入第一個預設字元
    if (characters.length > 0) {
        initializeWriter(characters[0]);
    } else {
        // 如果沒有預設字元，可以提示使用者手動輸入
        scoreFeedback.textContent = '請選擇或輸入一個字開始練習。';
        animateBtn.disabled = true;
        if(quizBtn) quizBtn.disabled = true;
    }
});
