// Utility functions for the word circle game

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
 function levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

/**
 * Check if two strings are similar enough based on fuzzy matching settings
 * @param {string} input 
 * @param {string} target 
 * @param {Object} fuzzySettings 
 * @returns {boolean}
 */
function isFuzzyMatch(input, target, fuzzySettings) {
    if (!fuzzySettings.enabled) {
        return input.toLowerCase() === target.toLowerCase();
    }
    
    const inputLower = input.toLowerCase().trim();
    const targetLower = target.toLowerCase().trim();
    
    // Exact match
    if (inputLower === targetLower) {
        return true;
    }
    
    // Check if it's close enough using Levenshtein distance
    const distance = levenshteinDistance(inputLower, targetLower);
    const maxAllowedDistance = Math.min(fuzzySettings.maxDistance, Math.floor(targetLower.length / 3));
    
    if (distance <= maxAllowedDistance) {
        return true;
    }
    
    // Check similarity ratio
    const similarity = 1 - (distance / Math.max(inputLower.length, targetLower.length));
    return similarity >= fuzzySettings.threshold;
}

/**
 * Check if user answer matches any of the acceptable answers
 * @param {string} userAnswer 
 * @param {Array} acceptableAnswers 
 * @param {Object} fuzzySettings 
 * @returns {boolean}
 */
function checkAnswer(userAnswer, acceptableAnswers, fuzzySettings) {
    return acceptableAnswers.some(answer => 
        isFuzzyMatch(userAnswer, answer, fuzzySettings)
    );
}

/**
 * Format time in MM:SS format
 * @param {number} seconds 
 * @returns {string}
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate time bonus based on configuration
 * @param {number} correctAnswers 
 * @param {number} timeUsed 
 * @param {Object} bonusConfig 
 * @returns {number}
 */
function calculateTimeBonus(correctAnswers, timeUsed, bonusConfig) {
    if (correctAnswers < bonusConfig.threshold) {
        return 0;
    }
    
    for (const level of bonusConfig.levels) {
        if (timeUsed <= level.maxTime) {
            return level.bonus;
        }
    }
    
    return 0;
}

/**
 * Play sound effect (placeholder function)
 * @param {string} type 
 */
function playSound(type) {
    // Placeholder for sound effects
    // Could be implemented with Web Audio API or HTML5 audio
    console.log(`Playing ${type} sound`);
}

/**
 * Show visual feedback animation
 * @param {boolean} isCorrect 
 * @param {HTMLElement} element 
 */
function showFeedback(isCorrect, element) {
    const feedbackClass = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
    element.classList.add(feedbackClass);
    
    setTimeout(() => {
        element.classList.remove(feedbackClass);
    }, 1000);
}

/**
 * Shuffle array in place
 * @param {Array} array 
 * @returns {Array}
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Apply theme colors to CSS variables
 * @param {Object} theme 
 */
 function applyTheme(theme) {
    const root = document.documentElement;
    const colors = theme?.colors || {};
  
    // generic kebab-case (keeps --card-background, --text-color working)
    Object.entries(colors).forEach(([key, value]) => {
      const kebab = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(kebab, value);
    });
  
    // explicit aliases for "*-color" tokens used throughout CSS
    const alias = {
      primary:        '--primary-color',
      accent:         '--accent-color',
      correct:        '--correct-color',
      incorrect:      '--incorrect-color',
      background:     '--background-color',
      cardBackground: '--card-background',
      textColor:      '--text-color',
      textSecondary:  '--text-secondary'
    };
  
    Object.entries(alias).forEach(([key, cssVar]) => {
      if (colors[key]) root.style.setProperty(cssVar, colors[key]);
    });
  }

/**
 * Create confetti effect
 */
function showConfetti() {
    // Simple confetti effect using CSS animations
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.top = '-10px';
            confetti.style.zIndex = '9999';
            confetti.style.pointerEvents = 'none';
            confetti.style.borderRadius = '50%';
            
            document.body.appendChild(confetti);
            
            // Animate falling
            const animation = confetti.animate([
                { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight + 20}px) rotate(360deg)`, opacity: 0 }
            ], {
                duration: 3000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => confetti.remove();
        }, i * 100);
    }
}

/**
 * Load configuration from file
 * @param {string} configFile 
 * @returns {Promise<Object>}
 */
async function loadConfig(configFile = 'config.json') {
    try {
        const response = await fetch(configFile);
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
        // Return default config
        return getDefaultConfig();
    }
}

/**
 * Load questions from file
 * @param {string} questionsFile 
 * @returns {Promise<Object>}
 */
async function loadQuestions(questionsFile) {
    try {
        const response = await fetch(questionsFile, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        if (!response.ok) {
            throw new Error(`Failed to load questions: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading questions:', error);
        throw error;
    }
}

/**
 * Load logo/image content
 * @param {string} logoPath 
 * @returns {Promise<string>}
 */
async function loadLogo(logoPath) {
    try {
        if (!logoPath) {
            throw new Error('No logo path provided');
        }
        
        if (logoPath.endsWith('.svg')) {
            const response = await fetch(logoPath);
            if (!response.ok) {
                throw new Error(`Failed to load logo: ${response.statusText}`);
            }
            return await response.text();
        } else {
            // For PNG, JPG, etc., return img tag
            return `<img src="${logoPath}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
        }
    } catch (error) {
        console.error('Error loading logo:', error);
        // Return empty string or a simple placeholder if logo fails to load
        return `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #E30613; font-weight: bold; font-size: 18px;">LOGO</div>`;
    }
}

/**
 * Get default configuration
 * @returns {Object}
 */
function getDefaultConfig() {
    return {
        gameSettings: {
            timeLimit: 300,
            maxHints: 3,
            scoring: {
                correct: 3,
                incorrect: -2,
                pasapalabra: -1,
                timeBonus: {
                    threshold: 10,
                    levels: [
                        { maxTime: 60, bonus: 30 },
                        { maxTime: 120, bonus: 20 },
                        { maxTime: 180, bonus: 10 }
                    ]
                }
            },
            fuzzyMatching: {
                enabled: true,
                threshold: 0.8,
                maxDistance: 2
            },
            penalizeUnanswered: false
        },
        theme: {
            name: "henkel",
            colors: {
                primary: "#E30613",
                accent: "#C10511",
                correct: "#00A651",
                incorrect: "#E30613",
                warning: "#FF8C00",
                background: "#F5F5F5",
                cardBackground: "#FFFFFF",
                textColor: "#333333",
                textSecondary: "#666666"
            }
        },
        questionsFile: "questions-corporate.json",
        previewQuestionsFile: "questions-preview.json",
        gameTitle: "Word Circle Game",
        gameSubtitle: "Challenge 2025",
        logoPath: "",
        centerLogoPath: "",
        welcomeText: {
            challengeDescription: "Answer questions for each letter A-Z. Each letter has a specific definition to complete.",
            timePressureText: "Quick thinking is key!",
            smartMatchingText: "The system accepts similar answers and provides helpful hints when you're close."
        }
    };
}