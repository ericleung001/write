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

    /**
     * 初始化或更新 Hanzi Writer 實例
     * @param {string} char - 要顯示和練習的漢字
     */
    /**
     * 初始化或更新 Hanzi Writer 實例
     * @param {string} char - 要顯示和練習的漢字
     */
    function initializeWriter(char) {
        currentChar = char;
        currentCharText.textContent = char;
        scoreFeedback.textContent = '---';
        scoreFeedback.style.color = '#D84315'; // 更新預設回饋顏色

        targetDiv.innerHTML = ''; // 清除舊的畫布

        let canvasSize = 250; // 預設畫布大小 (適用於手機等小螢幕)
        // 如果視窗寬度大於等於 600px (例如平板)，則使用較大的畫布
        if (window.innerWidth >= 600) {
            canvasSize = 280;
        }

        writer = HanziWriter.create(targetDiv, char, {
            width: canvasSize,  // 使用動態計算的畫布寬度
            height: canvasSize, // 使用動態計算的畫布高度
            padding: 10,
            showOutline: true,
            showCharacter: true,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 250,
            strokeColor: '#4A4A4A', // 筆劃顏色可以深一點
            highlightColor: '#F06292', // 高亮顏色用粉紅色
            outlineColor: '#FFD180', // 漢字外框用淡橘色
            drawingColor: '#29B6F6', // 使用者繪製筆劃的顏色 (藍色)
            drawingWidth: 14, // 筆劃寬度加粗，方便小朋友
            onLoadCharDataSuccess: function(data) {
                totalStrokes = data.strokes.length;
                animateBtn.disabled = false;
                if (quizBtn) {
                    quizBtn.disabled = false;
                    quizBtn.textContent = '開始練習';
                }
            },
            onLoadCharDataError: function(reason) {
                console.error('無法載入字元數據: ' + char, reason);
                currentCharText.textContent = `無法載入 "${char}"`;
                scoreFeedback.textContent = '載入錯誤';
                scoreFeedback.style.color = '#dc3545';
                animateBtn.disabled = true;
                if (quizBtn) {
                    quizBtn.disabled = true;
                }
            }
        });

        charButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.char === char);
        });
    }

    charButtons.forEach(button => {
        button.addEventListener('click', () => {
            initializeWriter(button.dataset.char);
        });
    });

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
                // quiz অপশন এখানে যোগ করা যেতে পারে, যেমন:
                //leniency: 1, // ভুলের সহনশীলতা
                //showHintAfterMisses: 1, // কতবার ভুলের পর হিন্ট দেখাবে (ডিফল্ট 1)
                //highlightOnComplete: true, // সম্পূর্ণ হলে হাইলাইট করবে কিনা

                // 當使用者畫出正確的一筆時觸發
                onCorrectStroke: function(data) {
                    console.log(`筆劃 ${data.strokeNum + 1} 正確! (此筆劃嘗試 ${data.mistakesOnStroke + 1} 次)`);
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆正確！(${data.strokeNum + 1}/${totalStrokes})`;
                    scoreFeedback.style.color = '#28a745'; // 綠色表示正確
                },
                // 當使用者在某筆劃上出錯時觸發
                onMistake: function(data) {
                    console.log(`筆劃 ${data.strokeNum + 1} 錯誤 (此筆劃第 ${data.mistakesOnStroke} 次錯誤)! 總錯誤: ${data.totalMistakes}`);
                    // Hanzi Writer 會自動顯示正確筆劃的提示，這就是視覺上的對比
                    scoreFeedback.textContent = `第 ${data.strokeNum + 1} 筆好像不太對喔，請看提示修正。`;
                    scoreFeedback.style.color = '#dc3545'; // 紅色表示錯誤
                    // data.drawnPath 包含了使用者畫的錯誤筆劃數據 (SVG 路徑字符串)
                    // console.log("使用者畫的錯誤路徑:", data.drawnPath.pathString);
                },
                // 當使用者完成所有筆劃（無論對錯）時觸發
                onComplete: function(summary) {
                    console.log('練習完成!', summary);
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
        if (writer) {
            initializeWriter(currentChar);
            scoreFeedback.textContent = '已重設，請重新開始。';
            scoreFeedback.style.color = '#17a2b8';
        }
    });

    initializeWriter(characters[0]);
});