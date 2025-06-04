document.addEventListener('DOMContentLoaded', () => {
    // 等待 HTML 文件完全載入並解析後才執行
    const characters = ["我", "你", "們"]; // 可練習的漢字列表
    let currentChar = characters[0]; // 目前選擇的漢字，預設為第一個
    let writer = null; // 用於儲存 Hanzi Writer 的實例
    let totalStrokes = 0; // 目前漢字的總筆劃數

    // 獲取 HTML 元素
    const charButtons = document.querySelectorAll('.char-btn'); //
    const currentCharText = document.getElementById('current-char-text'); //
    const targetDiv = document.getElementById('character-target-div'); //
    const animateBtn = document.getElementById('animate-btn'); //
    const quizBtn = document.getElementById('quiz-btn'); //
    const resetBtn = document.getElementById('reset-btn'); //
    const scoreFeedback = document.getElementById('score-feedback'); //

    const manualCharInput = document.getElementById('manual-char-input');
    const submitManualCharBtn = document.getElementById('submit-manual-char-btn');

    /**
     * 初始化或更新 Hanzi Writer 實例
     * @param {string} char - 要顯示和練習的漢字
     */
    function initializeWriter(char) {
        console.log('initializeWriter called with char:', char);
        currentChar = char;
        console.log('Setting currentCharText.textContent to:', char);
        currentCharText.textContent = char; //
        scoreFeedback.textContent = '---'; //
        scoreFeedback.style.color = '#D84315'; //

        targetDiv.innerHTML = ''; // 清除舊的畫布

        // 讓 HanziWriter 使用 #character-target-div 由 CSS 計算後的實際尺寸
        const currentDivWidth = targetDiv.offsetWidth;
        const currentDivHeight = targetDiv.offsetHeight;

        console.log('Canvas dimensions from CSS:', currentDivWidth, currentDivHeight);

        // 確保尺寸有效，避免 HanziWriter 出錯
        const finalCanvasWidth = currentDivWidth > 0 ? currentDivWidth : 250;
        const finalCanvasHeight = currentDivHeight > 0 ? currentDivHeight : 250;
        
        writer = HanziWriter.create(targetDiv, char, {
            width: finalCanvasWidth,
            height: finalCanvasHeight,
            padding: 10, //
            showOutline: true, //
            showCharacter: true, //
            strokeAnimationSpeed: 1, //
            delayBetweenStrokes: 250, //
            strokeColor: '#4A4A4A', //
            highlightColor: '#F06292', //
            outlineColor: '#FFD180', //
            drawingColor: '#29B6F6', //
            drawingWidth: 14, //
            onLoadCharDataSuccess: function(data) { //
                console.log('onLoadCharDataSuccess for char:', char, data);
                totalStrokes = data.strokes.length; //
                animateBtn.disabled = false; //
                if (quizBtn) { //
                    quizBtn.disabled = false; //
                    quizBtn.textContent = '開始練習'; //
                }
            },
            onLoadCharDataError: function(reason) { //
                console.error('onLoadCharDataError for char:', char, reason); //
                currentCharText.textContent = `無法載入 "${char}"`; //
                scoreFeedback.textContent = '載入錯誤，請確認字元或網路。'; //
                scoreFeedback.style.color = '#dc3545'; //
                animateBtn.disabled = true; //
                if (quizBtn) { //
                    quizBtn.disabled = true; //
                }
            }
        });

        charButtons.forEach(btn => { //
            btn.classList.toggle('active', btn.dataset.char === char); //
        });
    }

    charButtons.forEach(button => { //
        button.addEventListener('click', () => { //
            initializeWriter(button.dataset.char); //
        });
    });

    if (submitManualCharBtn && manualCharInput) {
        submitManualCharBtn.addEventListener('click', () => {
            console.log('Submit button clicked.');
            const charToLoad = manualCharInput.value.trim();
            console.log('Character to load:', charToLoad, 'Length:', charToLoad.length);

            if (charToLoad && charToLoad.length === 1) {
                console.log('Calling initializeWriter with:', charToLoad);
                initializeWriter(charToLoad);
                manualCharInput.value = '';
            } else if (charToLoad.length > 1) {
                scoreFeedback.textContent = '請只輸入一個字進行練習。'; //
                scoreFeedback.style.color = '#dc3545'; //
            } else {
                scoreFeedback.textContent = '請輸入一個繁體中文字。'; //
                scoreFeedback.style.color = '#dc3545'; //
            }
        });

        manualCharInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitManualCharBtn.click();
            }
        });
    }

    animateBtn.addEventListener('click', () => { //
        if (writer) { //
            writer.animateCharacter(); //
            scoreFeedback.textContent = '請觀察筆順。'; //
            scoreFeedback.style.color = '#17a2b8'; //
        }
    });

    quizBtn.addEventListener('click', () => { //
        if (writer) { //
            scoreFeedback.textContent = '請依照筆順書寫。'; //
            scoreFeedback.style.color = '#17a2b8'; //
            quizBtn.textContent = '練習中...'; //
            quizBtn.disabled = true; //

            writer.quiz({ //
                onCorrectStroke: function(data) { //
                    console.log(`筆劃 ${data.strokeNum + 1} 正確! (此筆劃嘗試 ${data.mistakesOnStroke + 1} 次)`); //
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`; //
                    scoreFeedback.style.color = '#28a745'; //
                },
                onMistake: function(data) { //
                    console.log(`筆劃 ${data.strokeNum + 1} 錯誤 (此筆劃第 ${data.mistakesOnStroke} 次錯誤)! 總錯誤: ${data.totalMistakes}`); //
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`; //
                    scoreFeedback.style.color = '#dc3545'; //
                },
                onComplete: function(summary) { //
                    console.log('練習完成!', summary); //
                    let mistakes = summary.totalMistakes; //
                    let score = 0; //

                    if (totalStrokes > 0) { //
                        if (mistakes === 0) { //
                            score = 100; //
                        } else if (mistakes <= Math.ceil(totalStrokes * 0.25)) { //
                            score = 80 - (mistakes - 1) * 5; //
                        } else if (mistakes <= Math.ceil(totalStrokes * 0.5)) { //
                            score = 60 - (mistakes - Math.ceil(totalStrokes * 0.25) - 1) * 5; //
                        } else {
                            score = Math.max(0, 40 - (mistakes - Math.ceil(totalStrokes * 0.5)) * 5); //
                        }
                        score = Math.max(0, Math.round(score)); //
                    }

                    if (score >= 80) { //
                        scoreFeedback.textContent = `太棒了！得分：${score} 分 (總錯誤 ${mistakes} 次)`; //
                        scoreFeedback.style.color = '#28a745'; //
                    } else if (score >= 60) { //
                        scoreFeedback.textContent = `做得不錯！得分：${score} 分 (總錯誤 ${mistakes} 次)`; //
                        scoreFeedback.style.color = '#ffc107'; //
                    } else {
                        scoreFeedback.textContent = `再接再厲！得分：${score} 分 (總錯誤 ${mistakes} 次)`; //
                        scoreFeedback.style.color = '#dc3545'; //
                    }
                    quizBtn.textContent = '重新練習'; //
                    quizBtn.disabled = false; //
                }
            });
        }
    });

    resetBtn.addEventListener('click', () => { //
        if (writer && currentChar) {
            initializeWriter(currentChar); //
            scoreFeedback.textContent = '已重設，請重新開始。'; //
            scoreFeedback.style.color = '#17a2b8'; //
        } else if (characters.length > 0) {
             initializeWriter(characters[0]); //
             scoreFeedback.textContent = '已重設，請重新開始。'; //
             scoreFeedback.style.color = '#17a2b8'; //
        }
    });

    if (characters.length > 0) { //
        initializeWriter(characters[0]); //
    } else {
        scoreFeedback.textContent = '請選擇或輸入一個字開始練習。'; //
        animateBtn.disabled = true; //
        if(quizBtn) quizBtn.disabled = true; //
    }
});
