

async function fetchJSON(path) { const r = await fetch(path); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }
const withBase = (base, p) => !p || /^https?:|^\//.test(p) ? p : `${(base || '').replace(/\/$/, '')}/${p}`;
const deepMerge = (t, s) => {
    if (!s || typeof s !== 'object') return t; for (const k of Object.keys(s)) {
        const sv = s[k], tv = t[k];
        t[k] = sv && typeof sv === 'object' && !Array.isArray(sv) ? deepMerge(tv && typeof tv === 'object' ? tv : {}, sv) : Array.isArray(sv) ? sv.slice() : sv;
    } return t;
};

function getPathSlug(base = "/game") {
    const p = location.pathname.replace(/\/+$/, "");
    if (!base) return null;
    const normBase = base.replace(/\/+$/, "");
    if (!p.startsWith(normBase)) return null;
    const rest = p.slice(normBase.length);
    const parts = rest.split("/").filter(Boolean);
    return parts[0] || null;
}



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
        document.getElementById('loadingScreen').style.display = 'flex';

        // Load catalog + defaults
        this.catalog = await fetchJSON('catalog.json');
        this.defaultNode = this.catalog.default;

        // Routing (param or path)
        const param = this.catalog.routing?.param || 'challenge';
        const pathBase = this.catalog.routing?.pathBase || null; // e.g. "/game"
        const defaultSlug = this.catalog.routing?.defaultSlug || Object.keys(this.catalog.challenges)[0];

        const pathSlug = pathBase ? getPathSlug(pathBase) : null;
        const urlSlug = new URL(location.href).searchParams.get(param);
        const savedSlug = localStorage.getItem('wcg:lastChallenge');

        const slug = this.catalog.challenges[pathSlug] ? pathSlug
            : this.catalog.challenges[urlSlug] ? urlSlug
                : this.catalog.challenges[savedSlug] ? savedSlug
                    : defaultSlug;

        await this.selectChallenge(slug, { silent: true });

        this.setGameContent();

        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';

        const cond = document.getElementById('conditionsBar');
        if (cond) {
            const sc = gs.scoring || {};
            const fm = gs.fuzzyMatching || {};
            const timeText = typeof gs.timeLimit === 'number' ? formatTime(gs.timeLimit) : '—';
            const maxBonus = (Array.isArray(sc.timeBonus?.levels) && sc.timeBonus.levels.length)
                ? Math.max(...sc.timeBonus.levels.map(l => l?.bonus ?? 0))
                : 0;

            const pills = [
                `<span class="cond-pill warn">⏱ ${timeText}</span>`,
                `<span class="cond-pill">💡 Hints: ${gs.maxHints ?? 0}</span>`,
                `<span class="cond-pill good">✅ +${sc.correct ?? 0}</span>`,
                `<span class="cond-pill bad">❌ ${sc.incorrect ?? 0}</span>`,
                `<span class="cond-pill warn">⏭ ${sc.pasapalabra ?? 0}</span>`,
                fm.enabled ? `<span class="cond-pill">🧠 Fuzzy ≥${Math.round((fm.threshold ?? 0) * 100)}%</span>`
                    : `<span class="cond-pill">🧠 Exact match</span>`,
                gs.penalizeUnanswered
                    ? `<span class="cond-pill bad">⛔ Unanswered = ${sc.incorrect ?? 0}</span>`
                    : `<span class="cond-pill">⛔ Unanswered = 0</span>`,
                maxBonus ? `<span class="cond-pill good">⚡ Bonus up to +${maxBonus} (≥${sc.timeBonus?.threshold ?? 0} correct)</span>` : ''
            ].filter(Boolean).join('');

            cond.innerHTML = pills;

            // mirror into the mobile sheet
            const body = document.getElementById('condBody');
            if (body) body.innerHTML = pills;
        }

        this.setupEventListeners();
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


    async selectChallenge(slug, { silent = false } = {}) {
        const ch = this.catalog.challenges[slug]; if (!ch) throw new Error(`Unknown challenge: ${slug}`);
        this.activeSlug = slug;

        // Merge defaults + overrides
        const gameSettings = deepMerge({}, this.defaultNode.gameSettings || {}); deepMerge(gameSettings, ch.gameSettings || {});
        const theme = deepMerge({}, this.defaultNode.theme || {}); deepMerge(theme, ch.theme || {});
        const logoPath = ch.logoPath ? withBase(ch.basePath, ch.logoPath) : withBase(this.defaultNode.basePath, this.defaultNode.logoPath);
        const centerLogoPath = ch.centerLogoPath ? withBase(ch.basePath, ch.centerLogoPath) : withBase(this.defaultNode.basePath, this.defaultNode.centerLogoPath);
        const stylesPath = ch.stylesPath ? withBase(ch.basePath, ch.stylesPath) : withBase(this.defaultNode.basePath, this.defaultNode.stylesPath);

        this.config = {
            gameSettings, theme,
            gameTitle: ch.title || this.defaultNode.title || 'Word Circle Game',
            gameSubtitle: ch.subtitle || this.defaultNode.subtitle || '',
            logoPath, centerLogoPath, stylesPath,
            basePath: ch.basePath
        };

        // Load content for the selected challenge
        const qPath = withBase(ch.basePath, ch.questionsPath || 'questions.json');
        const pPath = ch.previewPath ? withBase(ch.basePath, ch.previewPath) : qPath;
        this.allWords = await fetchJSON(qPath);
        this.previewWords = await fetchJSON(pPath);

        await this.loadStyles();
        applyTheme(this.config.theme);
        await this.loadLogos();

        this.setGameContent();

        if (!silent) {
            const param = this.catalog.routing?.param || 'challenge';
            const url = new URL(location.href);
            url.searchParams.set(param, slug);
            history.replaceState({}, '', url);
            localStorage.setItem('wcg:lastChallenge', slug);
        }
    }

    async loadStyles() {
        const link = document.getElementById('challengeStylesheet');
        if (link && this.config.stylesPath) link.href = this.config.stylesPath;
    }


    /**
     * Set game content from configuration
     */
    setGameContent() {
        const cfg = this.config || {};
        const gs = cfg.gameSettings || {};
        const scoring = gs.scoring || {};
        const timeBonus = scoring.timeBonus || { threshold: 0, levels: [] };

        // Titles
        const title = cfg.gameTitle || 'Word Circle Game';
        const subtitle = (cfg.gameSubtitle || '').trim();
        const setText = (sel, v) => { const el = document.querySelector(sel); if (el && v != null) el.textContent = v; };

        setText('#gameTitle', title);                 // welcome screen
        setText('#gameSubtitle', subtitle);           // welcome screen
        setText('#gameHeaderTitle', title);

        const badge = document.getElementById('challengeBadge');
        if (badge) {
            if (subtitle) {
                badge.textContent = subtitle.toUpperCase();
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Welcome stats
        setText('#welcomeTimeLimit', formatTime(gs.timeLimit || 0));
        setText('#welcomeMaxHints', gs.maxHints ?? 0);

        // Scoring
        const pluralPts = (n) => `point${Math.abs(n) === 1 ? '' : 's'}`;
        setText('#correctPoints', `+${scoring.correct ?? 0} points`);
        setText('#incorrectPoints', `${scoring.incorrect ?? 0} points`);
        setText('#pasapalabraPoints', `${scoring.pasapalabra ?? 0} ${pluralPts(scoring.pasapalabra ?? 0)}`);
        setText('#timeBonusThreshold', timeBonus.threshold ?? 0);

        // Max time bonus (handles empty/undefined levels)
        const maxBonus = (Array.isArray(timeBonus.levels) && timeBonus.levels.length)
            ? Math.max(...timeBonus.levels.map(l => l?.bonus ?? 0))
            : 0;
        setText('#maxTimeBonus', maxBonus ? `Up to +${maxBonus} points` : '—');
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

        const overlay = document.getElementById('condOverlay');
        document.getElementById('condToggle')?.addEventListener('click', () => {
            overlay?.classList.add('show');
        });
        document.getElementById('condClose')?.addEventListener('click', () => {
            overlay?.classList.remove('show');
        });
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('show');
        });

        // Window resize handler
        window.addEventListener('resize', () => this.recalculateRoscoPositions());
    }

    /**
     * Start preview mode - like a real game but with preview questions
     */
    startPreview() {
        this.isPreviewMode = true;

        // Fallback if a challenge has no preview file
        const set = (this.previewWords && Object.keys(this.previewWords).length)
            ? this.previewWords
            : this.allWords;

        this.selectWordsFromSet(set);

        if (!this.words.length) {
            alert('No preview questions found for this challenge.');
            return;
        }

        this.resetGameState();
        this.createRosco();
        this.updateGame();

        this.startTimer();
        setTimeout(() => this.recalculateRoscoPositions(), 100);

        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';

        const answerInput = document.getElementById('answer');
        if (answerInput) {
            answerInput.disabled = false;
            answerInput.placeholder = 'Preview Mode - Type your answer...';
        }

        const currentWord = this.remainingWords[this.currentIndex];
        if (currentWord) {
            document.getElementById('definition').textContent = `[PREVIEW] ${currentWord.definition}`;
        }

        if (window.matchMedia('(max-width: 768px)').matches) {
            // show the bottom sheet when preview starts on mobile
            document.getElementById('condOverlay')?.classList.add('show');
          }
    }

    /**
     * Select words from a given question set
     */
    selectWordsFromSet(questionSet) {
        this.words = [];
        if (!questionSet || typeof questionSet !== 'object') return;

        // Sort keys so the rosco is stable A→Z
        const letters = Object.keys(questionSet).sort((a, b) => a.localeCompare(b));

        for (const key of letters) {
            const list = questionSet[key];
            if (!Array.isArray(list) || list.length === 0) continue;

            const idx = Math.floor(Math.random() * list.length);
            const item = list[idx] || {};

            // Ensure answers array exists (fallback to the "word")
            const answers = Array.isArray(item.answers) && item.answers.length
                ? item.answers
                : (item.word ? [item.word] : []);

            this.words.push({
                letter: key.toUpperCase(),
                word: item.word || (answers[0] || ''),
                definition: item.definition || '',
                answers
            });
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
        letters[letterIndex].classList.remove('passed');
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
            const letterIndex = this.words.findIndex(w => w.letter === currentLetter);
            const letters = document.querySelectorAll('.letter');

            if (!this.pasapalabraUsed.includes(currentLetter)) {
                this.pasapalabraUsed.push(currentLetter);
                this.pasapalabraCount++;
                if (!this.isPreviewMode) {
                    this.pasapalabraPoints += this.config.gameSettings.scoring.pasapalabra;
                    this.totalPoints += this.config.gameSettings.scoring.pasapalabra;
                }
                if (letters[letterIndex]) letters[letterIndex].classList.add('passed');
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
                // Clear any previous visual state
                letter.classList.remove('current', 'correct', 'incorrect', 'passed');
                // Show unanswered look
                letter.classList.add('unanswered');

                // Optionally penalize (controlled by config)
                if (this.config.gameSettings.penalizeUnanswered) {
                    this.incorrectAnswers++;
                    this.incorrectPoints += this.config.gameSettings.scoring.incorrect;
                    this.totalPoints += this.config.gameSettings.scoring.incorrect;
                }

                // Record empty answer for results/PDF
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
        document.body.classList.remove('preview-mode');

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
            const isCorrect = checkAnswer(userAnswer, word.answers, { enabled: false }); // Exact match for results

            if (isCorrect) {
                correctWords.push({ ...word, userAnswer });
            } else {
                incorrectWords.push({ ...word, userAnswer });
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
            const isCorrect = checkAnswer(userAnswer, word.answers, { enabled: false });

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