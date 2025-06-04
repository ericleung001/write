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
    const characters = ["我", "你", "們"]; //
    let currentChar = characters[0]; //
    let writer = null; //
    let totalStrokes = 0; //

    const charButtons = document.querySelectorAll('.char-btn'); //
    const currentCharText = document.getElementById('current-char-text'); //
    const targetDiv = document.getElementById('character-target-div'); // HanziWriter's target
    const hanziCanvasContainer = document.getElementById('hanzi-canvas-container'); 
    const userStrokeOverlay = document.getElementById('user-stroke-overlay'); 
    let userDrawnPaths = []; 

    const animateBtn = document.getElementById('animate-btn'); //
    const quizBtn = document.getElementById('quiz-btn'); //
    const resetBtn = document.getElementById('reset-btn'); //
    const scoreFeedback = document.getElementById('score-feedback'); //

    const manualCharInput = document.getElementById('manual-char-input');
    const submitManualCharBtn = document.getElementById('submit-manual-char-btn');

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
        console.log('initializeWriter called with char:', char);
        currentChar = char;
        currentCharText.textContent = char; //
        scoreFeedback.textContent = '---'; //
        scoreFeedback.style.color = '#D84315'; //

        targetDiv.innerHTML = ''; //
        
        if (userStrokeOverlay) {
            userStrokeOverlay.innerHTML = ''; 
            userStrokeOverlay.setAttribute('viewBox', '0 0 1024 1024'); 
        }
        userDrawnPaths = [];

        const containerWidth = hanziCanvasContainer.offsetWidth;
        const containerHeight = hanziCanvasContainer.offsetHeight; 

        console.log('Canvas dimensions for HanziWriter from container:', containerWidth, containerHeight);

        const finalCanvasWidth = containerWidth > 0 ? containerWidth : 250;
        const finalCanvasHeight = containerHeight > 0 ? containerHeight : 250;
        
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
            const charToLoad = manualCharInput.value.trim();
            if (charToLoad && charToLoad.length === 1) {
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
        if (writer) writer.animateCharacter(); //
        scoreFeedback.textContent = '請觀察筆順。'; //
        scoreFeedback.style.color = '#17a2b8'; //
    });

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
                onCorrectStroke: function(data) { //
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`; //
                    scoreFeedback.style.color = '#28a745'; //
                    if (data.drawnPath) {
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#28a745' }); 
                        redrawUserStrokeOverlay();
                    }
                },
                onMistake: function(data) { //
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`; //
                    scoreFeedback.style.color = '#dc3545'; //
                     if (data.drawnPath) {
                        userDrawnPaths.push({ path: data.drawnPath.pathString, color: '#dc3545' }); 
                        redrawUserStrokeOverlay();
                    }
                },
                onComplete: function(summary) { //
                    let mistakes = summary.totalMistakes; //
                    let score = 0; //
                    if (totalStrokes > 0) { //
                        if (mistakes === 0) score = 100; //
                        else if (mistakes <= Math.ceil(totalStrokes * 0.25)) score = 80 - (mistakes - 1) * 5; //
                        else if (mistakes <= Math.ceil(totalStrokes * 0.5)) score = 60 - (mistakes - Math.ceil(totalStrokes * 0.25) - 1) * 5; //
                        else score = Math.max(0, 40 - (mistakes - Math.ceil(totalStrokes * 0.5)) * 5); //
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
            initializeWriter(currentChar); 
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

    const debouncedResizeHandler = debounce(() => {
        const isQuizActive = quizBtn && quizBtn.disabled === true && quizBtn.textContent === '練習中...';

        if (isQuizActive) {
            console.log('視窗大小改變，但測驗正在進行中。為保持測驗狀態，HanziWriter 不會重新初始化。');
            return; 
        }

        if (writer && currentChar) {
            console.log('視窗大小/方向改變，重新初始化 HanziWriter (字元:', currentChar, ')');
            initializeWriter(currentChar);
        }
    }, 250);

    window.addEventListener('resize', debouncedResizeHandler);
});
