/**
 * Word Circle Game - Main Game Logic
 * Modular, configurable word circle game with fuzzy matching and themes
 */

 class WordCircleGame {
    constructor() {
        this.config = null;
        this.allWords = {};
        this.previewWords = {};
        this.words = [];
        this.currentIndex = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.pasapalabraCount = 0;
        this.correctPoints = 0;
        this.incorrectPoints = 0;
        this.pasapalabraPoints = 0;
        this.timeBonus = 0;
        this.totalPoints = 0;
        this.remainingWords = [];
        this.answeredWords = [];
        this.userAnswers = {};
        this.timerInterval = null;
        this.timeLeft = 300;
        this.hintsUsed = 0;
        this.pasapalabraUsed = [];
        this.gameEnded = false;
        this.isPreviewMode = false;
        this.previewIndex = 0;
    }

    /**
     * Initialize the game
     */
    async init() {
        try {
            // Show loading screen
            document.getElementById('loadingScreen').style.display = 'flex';
            
            // Load configuration
            this.config = await loadConfig('config.json');
            
            // Load questions
            this.allWords = await loadQuestions(this.config.questionsFile);
            this.previewWords = await loadQuestions(this.config.previewQuestionsFile);
            
            // Apply theme
            applyTheme(this.config.theme);
            
            // Load and set logos
            await this.loadLogos();
            
            // Set game content from config
            this.setGameContent();
            
            // Hide loading screen and show welcome
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('welcomeScreen').style.display = 'flex';
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            // Show error but still try to show welcome screen with defaults
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('welcomeScreen').style.display = 'flex';
            this.config = getDefaultConfig();
            this.setGameContent();
            this.setupEventListeners();
        }
    }

    /**
     * Load logos from config
     */
    async loadLogos() {
        try {
            // Welcome logo (inversed/white version)
            let welcomeLogo;
            if (this.config.logoPath) {
                welcomeLogo = await loadLogo(this.config.logoPath);
            } else {
                // Simple placeholder if no logo configured
                welcomeLogo = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: white; font-weight: bold; font-size: 24px;">LOGO</div>`;
            }
            document.getElementById('welcomeLogo').innerHTML = welcomeLogo;

            // Center logo (colored version)
            let centerLogo;
            if (this.config.centerLogoPath) {
                centerLogo = await loadLogo(this.config.centerLogoPath);
            } else {
                // Simple placeholder if no logo configured
                centerLogo = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #E30613; font-weight: bold; font-size: 18px;">LOGO</div>`;
            }
            document.getElementById('centerLogo').innerHTML = centerLogo;
            
        } catch (error) {
            console.error('Error loading logos, using placeholders:', error);
            document.getElementById('welcomeLogo').innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: white; font-weight: bold; font-size: 24px;">LOGO</div>`;
            document.getElementById('centerLogo').innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #E30613; font-weight: bold; font-size: 18px;">LOGO</div>`;
        }
    }

    /**
     * Set game content from configuration
     */
    setGameContent() {
        // Set titles and subtitles
        document.getElementById('gameTitle').textContent = this.config.gameTitle;
        document.getElementById('gameSubtitle').textContent = this.config.gameSubtitle;
        document.getElementById('gameHeaderTitle').textContent = this.config.gameTitle;
        document.getElementById('gameHeaderSubtitle').textContent = this.config.gameSubtitle;
        
        // Set welcome screen dynamic text
        document.getElementById('welcomeTimeLimit').textContent = formatTime(this.config.gameSettings.timeLimit);
        document.getElementById('welcomeMaxHints').textContent = this.config.gameSettings.maxHints;
        
        // Set scoring information
        document.getElementById('correctPoints').textContent = `+${this.config.gameSettings.scoring.correct} points`;
        document.getElementById('incorrectPoints').textContent = `${this.config.gameSettings.scoring.incorrect} points`;
        document.getElementById('pasapalabraPoints').textContent = `${this.config.gameSettings.scoring.pasapalabra} point`;
        document.getElementById('timeBonusThreshold').textContent = this.config.gameSettings.scoring.timeBonus.threshold;
        
        // Calculate max time bonus
        const maxBonus = Math.max(...this.config.gameSettings.scoring.timeBonus.levels.map(level => level.bonus));
        document.getElementById('maxTimeBonus').textContent = `Up to +${maxBonus} points`;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Enter key to submit answer
        document.getElementById('answer').addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !this.gameEnded) {
                this.checkAnswer();
            }
        });

        // Window resize handler
        window.addEventListener('resize', () => this.recalculateRoscoPositions());
    }

    /**
     * Start preview mode - like a real game but with preview questions
     */
    startPreview() {
        this.isPreviewMode = true;
        
        // Use preview questions for the demo
        this.selectWordsFromSet(this.previewWords);
        this.resetGameState();
        this.createRosco();
        this.updateGame();
        
        // Start preview timer (same as normal game)
        this.startTimer();
        setTimeout(() => this.recalculateRoscoPositions(), 100);
        
        // Show game container
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        
        // Enable normal game controls
        const answerInput = document.getElementById('answer');
        if (answerInput) {
            answerInput.disabled = false;
            answerInput.placeholder = "Preview Mode - Type your answer...";
        }
        
        // Update definition to show it's preview
        const currentWord = this.remainingWords[this.currentIndex];
        document.getElementById('definition').textContent = `[PREVIEW] ${currentWord.definition}`;
    }

    /**
     * Select words from a given question set
     */
    selectWordsFromSet(questionSet) {
        this.words = [];
        for (let letter in questionSet) {
            if (questionSet[letter].length > 0) {
                const randomIndex = Math.floor(Math.random() * questionSet[letter].length);
                this.words.push({
                    letter: letter, 
                    ...questionSet[letter][randomIndex]
                });
            }
        }
        this.words.sort((a, b) => a.letter.localeCompare(b.letter));
    }

    /**
     * Select random words for the normal game
     */
    selectRandomWords() {
        this.selectWordsFromSet(this.allWords);
    }

    /**
     * Start a new game
     */
    newGame() {
        this.isPreviewMode = false;
        this.selectRandomWords();
        this.resetGameState();
        this.createRosco();
        this.updateGame();
        this.startTimer();
        setTimeout(() => this.recalculateRoscoPositions(), 100);
    }

    /**
     * Reset game state
     */
    resetGameState() {
        this.currentIndex = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.pasapalabraCount = 0;
        this.hintsUsed = 0;
        this.correctPoints = 0;
        this.incorrectPoints = 0;
        this.pasapalabraPoints = 0;
        this.timeBonus = 0;
        this.totalPoints = 0;
        this.remainingWords = [...this.words];
        this.answeredWords = new Array(this.words.length).fill(null);
        this.userAnswers = {};
        this.pasapalabraUsed = [];
        this.timeLeft = this.config.gameSettings.timeLimit;
        this.gameEnded = false;

        // Reset UI elements
        const answerInput = document.getElementById('answer');
        if (answerInput) {
            answerInput.disabled = false;
            answerInput.value = '';
            answerInput.placeholder = "Type your answer here...";
        }
        
        // Clear and hide result elements
        const finalScore = document.getElementById('finalScore');
        if (finalScore) {
            finalScore.innerHTML = '';
            finalScore.style.display = 'none';
        }
        
        const viewResults = document.getElementById('viewResults');
        if (viewResults) {
            viewResults.style.display = 'none';
        }
        
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'none';
            results.innerHTML = '';
        }
        
        const fuzzyHint = document.getElementById('fuzzyHint');
        if (fuzzyHint) {
            fuzzyHint.style.display = 'none';
        }
        
        // Update hints counter
        const hintsLeft = document.querySelector('.hints-left');
        if (hintsLeft) {
            hintsLeft.textContent = this.config.gameSettings.maxHints;
        }
    }

    /**
     * Create the rosco (letter circle)
     */
    createRosco() {
        const rosco = document.getElementById('rosco');
        rosco.innerHTML = '';
        
        this.words.forEach((word, index) => {
            const letterDiv = document.createElement('div');
            letterDiv.className = 'letter';
            letterDiv.textContent = word.letter;
            letterDiv.setAttribute('data-letter', word.letter);
            letterDiv.setAttribute('data-index', index);
            rosco.appendChild(letterDiv);
        });
    }

    /**
     * Recalculate letter positions on the circle
     */
    recalculateRoscoPositions() {
        const letters = document.querySelectorAll('.letter');
        if (letters.length === 0) return;

        const roscoContainer = document.querySelector('.rosco-container');
        if (!roscoContainer) return;
        
        const containerWidth = roscoContainer.offsetWidth;
        const containerHeight = roscoContainer.offsetHeight;
        const radius = Math.min(containerWidth, containerHeight) * 0.44;
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        letters.forEach((letter, index) => {
            const angle = (index / letters.length) * 2 * Math.PI - Math.PI / 2; // Start at top
            const x = Math.cos(angle) * radius + centerX - (letter.offsetWidth / 2);
            const y = Math.sin(angle) * radius + centerY - (letter.offsetHeight / 2);
            letter.style.left = `${x}px`;
            letter.style.top = `${y}px`;
        });
    }

    /**
     * Start the game timer
     */
    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('timer');
        if (!timerElement) return;
        
        if (this.isPreviewMode) {
            timerElement.textContent = "PREVIEW";
            timerElement.style.background = "linear-gradient(135deg, #FF8C00 0%, #e67300 100%)";
        } else {
            timerElement.textContent = formatTime(this.timeLeft);
            timerElement.style.background = "";
            
            // Add urgency styling for last minute
            if (this.timeLeft <= 60) {
                timerElement.classList.add('timer-urgent');
            } else {
                timerElement.classList.remove('timer-urgent');
            }
        }
    }

    /**
     * Update game display
     */
    updateGame() {
        const letters = document.querySelectorAll('.letter');
        letters.forEach((letter, index) => {
            letter.classList.remove('current');
            if (this.remainingWords.length > 0 && this.words[index] === this.remainingWords[this.currentIndex]) {
                letter.classList.add('current');
            }
        });
        
        if (this.remainingWords.length > 0) {
            const currentWord = this.remainingWords[this.currentIndex];
            const prefix = this.isPreviewMode ? '[PREVIEW] ' : '';
            const definitionElement = document.getElementById('definition');
            if (definitionElement) {
                definitionElement.textContent = prefix + currentWord.definition;
            }
            
            const letterDisplayElement = document.getElementById('currentLetterDisplay');
            if (letterDisplayElement) {
                letterDisplayElement.textContent = currentWord.letter;
            }
        } else {
            const definitionElement = document.getElementById('definition');
            if (definitionElement) {
                definitionElement.textContent = "You've completed all words!";
            }
            
            const letterDisplayElement = document.getElementById('currentLetterDisplay');
            if (letterDisplayElement) {
                letterDisplayElement.textContent = "";
            }
        }
        
        const answerInput = document.getElementById('answer');
        if (answerInput) {
            answerInput.value = '';
            answerInput.focus();
            if (this.isPreviewMode) {
                answerInput.placeholder = "Preview Mode - Type your answer...";
            } else {
                answerInput.placeholder = "Type your answer here...";
            }
        }
        
        const fuzzyHintElement = document.getElementById('fuzzyHint');
        if (fuzzyHintElement) {
            fuzzyHintElement.style.display = 'none';
        }
        
        // Update score display  
        const correctCountElement = document.getElementById('correctCount');
        const incorrectCountElement = document.getElementById('incorrectCount');
        const pointsCountElement = document.getElementById('pointsCount');
        
        if (correctCountElement) correctCountElement.textContent = this.correctAnswers;
        if (incorrectCountElement) incorrectCountElement.textContent = this.incorrectAnswers;
        if (pointsCountElement) pointsCountElement.textContent = this.totalPoints;
    }

    /**
     * Check user's answer
     */
    checkAnswer() {
        if (this.remainingWords.length === 0 || this.gameEnded) {
            this.endGame();
            return;
        }

        const userAnswer = document.getElementById('answer').value.trim();
        if (!userAnswer) return;

        const currentWord = this.remainingWords[this.currentIndex];
        const currentLetter = currentWord.letter;
        const letterIndex = this.words.findIndex(word => word.letter === currentLetter);
        const letters = document.querySelectorAll('.letter');

        this.userAnswers[currentLetter] = userAnswer;

        // Check if answer is correct (including fuzzy matching)
        const isCorrect = checkAnswer(userAnswer, currentWord.answers, this.config.gameSettings.fuzzyMatching);

        if (isCorrect) {
            // Correct answer
            playSound('correct');
            showFeedback(true, letters[letterIndex]);
            
            letters[letterIndex].classList.remove('current');
            letters[letterIndex].classList.add('correct');
            this.correctAnswers++;
            this.answeredWords[letterIndex] = true;
            
            // Points for correct answer (only count in real game)
            if (!this.isPreviewMode) {
                this.correctPoints += this.config.gameSettings.scoring.correct;
                this.totalPoints += this.config.gameSettings.scoring.correct;
            }
            
        } else {
            // Incorrect answer - check if it was close for fuzzy hint
            if (this.config.gameSettings.fuzzyMatching.enabled) {
                const wasClose = currentWord.answers.some(answer => {
                    const similarity = 1 - (levenshteinDistance(userAnswer.toLowerCase(), answer.toLowerCase()) / Math.max(userAnswer.length, answer.length));
                    return similarity > 0.6 && similarity < this.config.gameSettings.fuzzyMatching.threshold;
                });
                
                if (wasClose) {
                    document.getElementById('fuzzyHint').style.display = 'block';
                    setTimeout(() => {
                        document.getElementById('fuzzyHint').style.display = 'none';
                    }, 3000);
                }
            }
            
            playSound('incorrect');
            showFeedback(false, letters[letterIndex]);
            
            letters[letterIndex].classList.remove('current');
            letters[letterIndex].classList.add('incorrect');
            this.incorrectAnswers++;
            this.answeredWords[letterIndex] = false;
            
            // Points deducted for incorrect answer (only count in real game)
            if (!this.isPreviewMode) {
                this.incorrectPoints += this.config.gameSettings.scoring.incorrect;
                this.totalPoints += this.config.gameSettings.scoring.incorrect;
            }
        }

        // Remove answered word from remaining words
        this.remainingWords.splice(this.currentIndex, 1);

        if (this.remainingWords.length === 0) {
            this.endGame();
        } else {
            if (this.currentIndex >= this.remainingWords.length) {
                this.currentIndex = 0;
            }
            this.updateGame();
        }
    }

    /**
     * Skip current word (pasapalabra)
     */
    pasapalabra() {
        if (this.remainingWords.length > 1 && !this.gameEnded) {
            playSound('pasapalabra');
            
            const currentLetter = this.remainingWords[this.currentIndex].letter;
            if (!this.pasapalabraUsed.includes(currentLetter)) {
                this.pasapalabraUsed.push(currentLetter);
                this.pasapalabraCount++;
                
                // Points deducted for pasapalabra (only count in real game)
                if (!this.isPreviewMode) {
                    this.pasapalabraPoints += this.config.gameSettings.scoring.pasapalabra;
                    this.totalPoints += this.config.gameSettings.scoring.pasapalabra;
                }
            }
            
            this.currentIndex = (this.currentIndex + 1) % this.remainingWords.length;
            this.updateGame();
        } else if (this.remainingWords.length === 1) {
            alert("Only one word remaining. You must answer it!");
        } else {
            this.endGame();
        }
    }

    /**
     * Show hint for current word
     */
    showHint() {
        if (this.hintsUsed < this.config.gameSettings.maxHints && this.remainingWords.length > 0 && !this.gameEnded) {
            const currentWord = this.remainingWords[this.currentIndex];
            const correctAnswer = currentWord.word || currentWord.answers[0];
            const firstLetter = correctAnswer.charAt(0);
            const hint = `The word starts with "${firstLetter}" and has ${correctAnswer.length} letters`;
            
            // Remove previous hint
            const existingHint = document.getElementById('current-hint');
            if (existingHint) {
                existingHint.remove();
            }
            
            // Show hint with animation
            const hintElement = document.createElement('div');
            hintElement.id = 'current-hint';
            hintElement.textContent = hint;
            hintElement.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.9));
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                z-index: 1000;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            `;
            
            document.querySelector('.rosco-container').appendChild(hintElement);
            
            // Auto-remove hint after 3 seconds
            setTimeout(() => {
                if (hintElement.parentNode) {
                    hintElement.remove();
                }
            }, 3000);
            
            this.hintsUsed++;
            document.querySelector('.hints-left').textContent = this.config.gameSettings.maxHints - this.hintsUsed;
            
        } else if (this.hintsUsed >= this.config.gameSettings.maxHints) {
            alert("You've used all available hints!");
        }
    }

    /**
     * End the game
     */
    endGame() {
        if (this.gameEnded) return;
        
        this.gameEnded = true;
        clearInterval(this.timerInterval);
        
        if (this.isPreviewMode) {
            // Preview mode ending
            alert("Preview complete! Ready to start the real challenge?");
            this.backToWelcome();
            return;
        }
        
        // Normal game ending logic
        const letters = document.querySelectorAll('.letter');
        letters.forEach((letter, index) => {
            if (this.answeredWords[index] === null) {
                letter.classList.remove('current');
                letter.classList.add('incorrect');
                
                if (this.config.gameSettings.penalizeUnanswered) {
                    this.incorrectAnswers++;
                    this.incorrectPoints += this.config.gameSettings.scoring.incorrect;
                    this.totalPoints += this.config.gameSettings.scoring.incorrect;
                }
                
                this.userAnswers[this.words[index].letter] = "";
            }
        });
        
        // Calculate time bonus
        const usedTime = this.config.gameSettings.timeLimit - this.timeLeft;
        this.timeBonus = calculateTimeBonus(
            this.correctAnswers, 
            usedTime, 
            this.config.gameSettings.scoring.timeBonus
        );
        this.totalPoints += this.timeBonus;
        
        // Display final score
        this.displayFinalScore(usedTime);
        
        // Disable input and show results button
        const answerInput = document.getElementById('answer');
        if (answerInput) answerInput.disabled = true;
        
        document.getElementById('viewResults').style.display = 'inline-block';
        
        // Show celebration if performed well
        if (this.correctAnswers > this.incorrectAnswers) {
            showConfetti();
        }
    }

    /**
     * Return to welcome screen
     */
    backToWelcome() {
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';
        
        // Reset preview mode
        this.isPreviewMode = false;
        
        // Clear any intervals
        clearInterval(this.timerInterval);
    }

    /**
     * Display final score
     */
    displayFinalScore(usedTime) {
        const finalScore = document.getElementById('finalScore');
        
        const unansweredCount = this.words.length - this.correctAnswers - this.incorrectAnswers;
        
        finalScore.innerHTML = `
            <h3>🎉 Game Complete!</h3>
            <p>Your final performance:</p>
            <p>
                <span class="score-value correct-score">${this.correctAnswers}</span> correct | 
                <span class="score-value incorrect-score">${this.incorrectAnswers}</span> incorrect | 
                <span class="score-value">${this.pasapalabraCount}</span> passed
                ${unansweredCount > 0 ? ` | <span class="score-value">${unansweredCount}</span> unanswered` : ''}
            </p>
            <p>Time used: ${formatTime(usedTime)} of ${formatTime(this.config.gameSettings.timeLimit)}</p>
            
            <div class="points-breakdown">
                <h3>📊 Score Breakdown</h3>
                <p>✅ Points from correct answers: <strong>+${this.correctPoints}</strong></p>
                <p>❌ Points lost from incorrect answers: <strong>${this.incorrectPoints}</strong></p>
                <p>⏭️ Points lost from passes: <strong>${this.pasapalabraPoints}</strong></p>
                <p>⚡ Time bonus: <strong>+${this.timeBonus}</strong></p>
                <div class="total-points">🏆 TOTAL SCORE: ${this.totalPoints}</div>
            </div>
        `;
    }

    /**
     * Show detailed results
     */
    showResults() {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'block';

        // Create results container
        const container = document.createElement('div');
        container.className = 'results-container';
        
        // Header
        const header = document.createElement('div');
        header.className = 'results-header';
        header.innerHTML = `
            <h2>📋 Detailed Results</h2>
            <p class="subtitle">${this.config.gameTitle} - ${this.config.gameSubtitle}</p>
        `;
        container.appendChild(header);

        // Summary statistics
        const summary = document.createElement('div');
        summary.className = 'results-summary';
        const accuracy = Math.round((this.correctAnswers / this.words.length) * 100);
        
        summary.innerHTML = `
            <div class="summary-item">
                <div class="summary-label">Accuracy</div>
                <div class="summary-value neutral">${accuracy}%</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Correct</div>
                <div class="summary-value correct">${this.correctAnswers}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Incorrect</div>
                <div class="summary-value incorrect">${this.incorrectAnswers}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Passed</div>
                <div class="summary-value neutral">${this.pasapalabraCount}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Final Score</div>
                <div class="summary-value neutral">${this.totalPoints}</div>
            </div>
        `;
        container.appendChild(summary);

        // Group words by result
        const correctWords = [];
        const incorrectWords = [];
        
        this.words.forEach(word => {
            const userAnswer = this.userAnswers[word.letter] || "Not answered";
            const isCorrect = checkAnswer(userAnswer, word.answers, {enabled: false}); // Exact match for results
            
            if (isCorrect) {
                correctWords.push({...word, userAnswer});
            } else {
                incorrectWords.push({...word, userAnswer});
            }
        });

        // Show correct answers
        if (correctWords.length > 0) {
            const correctSection = document.createElement('div');
            correctSection.className = 'results-section';
            correctSection.innerHTML = `<h3 class="section-title correct" style="color: #00A651;">✅ Correct Answers (${correctWords.length})</h3>`;
            
            const correctGrid = document.createElement('div');
            correctGrid.className = 'results-grid';
            
            correctWords.forEach(word => {
                const card = this.createResultCard(word, true);
                correctGrid.appendChild(card);
            });
            
            correctSection.appendChild(correctGrid);
            container.appendChild(correctSection);
        }

        // Show incorrect answers
        if (incorrectWords.length > 0) {
            const incorrectSection = document.createElement('div');
            incorrectSection.className = 'results-section';
            incorrectSection.innerHTML = `<h3 class="section-title incorrect" style="color: #E30613;">❌ Incorrect Answers (${incorrectWords.length})</h3>`;
            
            const incorrectGrid = document.createElement('div');
            incorrectGrid.className = 'results-grid';
            
            incorrectWords.forEach(word => {
                const card = this.createResultCard(word, false);
                incorrectGrid.appendChild(card);
            });
            
            incorrectSection.appendChild(incorrectGrid);
            container.appendChild(incorrectSection);
        }

        // Action buttons
        const footer = document.createElement('div');
        footer.className = 'result-footer';
        footer.innerHTML = `
            <div class="results-actions" style="text-align: center; margin-top: 30px;">
                <button class="primary" onclick="game.generatePDF()" style="margin: 0 10px;">📄 Download PDF</button>
                <button class="success" onclick="game.newGame()" style="margin: 0 10px;">🎮 New Game</button>
                <button onclick="game.hideResults()" style="margin: 0 10px;">👁️ Hide Results</button>
            </div>
        `;
        container.appendChild(footer);

        resultsDiv.appendChild(container);
    }

    /**
     * Create result card for a word
     */
    createResultCard(word, isCorrect) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid ${isCorrect ? '#00A651' : '#E30613'};
        `;
        
        const correctAnswer = word.word || word.answers[0];
        const userAnswer = word.userAnswer || "Not answered";
        
        card.innerHTML = `
            <div style="font-weight: bold; color: #E30613; margin-bottom: 5px; font-size: 18px;">${word.letter} - ${correctAnswer}</div>
            <div style="margin-bottom: 8px; color: #666; font-style: italic;">${word.definition}</div>
            <div style="color: ${isCorrect ? '#00A651' : '#E30613'}; font-weight: 500;">
                Your answer: ${userAnswer}
                ${!isCorrect ? `<br><strong style="color: #333;">Correct answer: ${correctAnswer}</strong>` : ''}
                ${word.answers.length > 1 ? `<br><small style="color: #666;">Also accepted: ${word.answers.slice(1).join(', ')}</small>` : ''}
            </div>
        `;
        
        return card;
    }

    /**
     * Hide results panel
     */
    hideResults() {
        document.getElementById('results').style.display = 'none';
    }

    /**
     * Generate PDF report
     */
    generatePDF() {
        if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
            alert('PDF generation is not available. Please ensure jsPDF is loaded.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // Header
        pdf.setFillColor(226, 240, 253);
        pdf.rect(0, 0, 210, 35, 'F');
        pdf.setDrawColor(52, 152, 219);
        pdf.setLineWidth(1.5);
        pdf.line(0, 35, 210, 35);
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.setTextColor(44, 62, 80);
        pdf.text(this.config.gameTitle, 105, 15, { align: "center" });
        
        pdf.setFontSize(14);
        pdf.text(this.config.gameSubtitle, 105, 25, { align: "center" });
        
        const today = new Date().toLocaleDateString('en-US');
        pdf.setFontSize(10);
        pdf.text(`Date: ${today}`, 180, 10, { align: "left" });
        
        // Summary section
        const accuracy = Math.round((this.correctAnswers / this.words.length) * 100);
        let yPos = 50;
        
        pdf.setFillColor(235, 245, 253);
        pdf.roundedRect(15, yPos, 180, 60, 3, 3, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("GAME SUMMARY", 105, yPos + 15, { align: "center" });
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(`Accuracy: ${accuracy}% (${this.correctAnswers}/${this.words.length})`, 25, yPos + 30);
        pdf.text(`Incorrect: ${this.incorrectAnswers} | Passed: ${this.pasapalabraCount}`, 25, yPos + 40);
        pdf.text(`Time used: ${formatTime(this.config.gameSettings.timeLimit - this.timeLeft)}`, 25, yPos + 50);
        
        // Score breakdown
        yPos += 80;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("SCORE BREAKDOWN", 25, yPos);
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        yPos += 15;
        pdf.text(`Correct answers: +${this.correctPoints}`, 25, yPos);
        yPos += 10;
        pdf.text(`Incorrect answers: ${this.incorrectPoints}`, 25, yPos);
        yPos += 10;
        pdf.text(`Passes: ${this.pasapalabraPoints}`, 25, yPos);
        yPos += 10;
        pdf.text(`Time bonus: +${this.timeBonus}`, 25, yPos);
        yPos += 15;
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(`TOTAL SCORE: ${this.totalPoints}`, 25, yPos);
        
        // Add detailed results on new page
        pdf.addPage();
        this.addDetailedResultsToPDF(pdf);
        
        // Save PDF
        pdf.save(`${this.config.gameTitle.replace(/\s+/g, '_')}_Results.pdf`);
    }

    /**
     * Add detailed results to PDF
     */
    addDetailedResultsToPDF(pdf) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("DETAILED RESULTS", 105, 20, { align: "center" });
        
        let yPos = 40;
        const pageHeight = 280;
        
        this.words.forEach(word => {
            if (yPos > pageHeight - 40) {
                pdf.addPage();
                yPos = 20;
            }
            
            const userAnswer = this.userAnswers[word.letter] || "Not answered";
            const correctAnswer = word.word || word.answers[0];
            const isCorrect = checkAnswer(userAnswer, word.answers, {enabled: false});
            
            // Letter circle
            pdf.setFillColor(isCorrect ? 46 : 231, isCorrect ? 204 : 76, isCorrect ? 113 : 60);
            pdf.circle(25, yPos + 5, 6, 'F');
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(255, 255, 255);
            pdf.text(word.letter, 25, yPos + 7, { align: "center" });
            
            // Word and definition
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.setTextColor(44, 62, 80);
            pdf.text(correctAnswer, 40, yPos + 5);
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(80, 80, 80);
            const defLines = pdf.splitTextToSize(word.definition, 150);
            pdf.text(defLines, 40, yPos + 15);
            
            // User answer
            pdf.setTextColor(isCorrect ? 46 : 231, isCorrect ? 204 : 76, isCorrect ? 113 : 60);
            pdf.text(`Your answer: ${userAnswer}`, 40, yPos + 25);
            
            yPos += 35;
        });
    }
}

// Create global game instance
const game = new WordCircleGame();