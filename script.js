// API key loaded from config.js (not committed to GitHub)
const OPENAI_API_KEY = CONFIG.OPENAI_API_KEY;

// Game state
let score = 0;
let currentQuestion = null;
let gameData = null;
let dailyDoubles = [];

// Generate questions using OpenAI API
async function generateQuestions(topic) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.textContent = 'Generating questions';

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are an expert Jeopardy question writer. Create engaging questions with proper difficulty scaling. Avoid obvious definitions but keep questions fair and answerable. Return ONLY valid JSON, no extra text.'
                }, {
                    role: 'user',
                    content: `Generate a Jeopardy game about "${topic}". Create 6 related categories and 5 questions per category (values: 200, 400, 600, 800, 1000).

DIFFICULTY GUIDELINES (VERY IMPORTANT - follow this progression):

$200 - EASY: Well-known facts, famous people/events, common knowledge in the category. Most people familiar with the topic should know these.
Example: "This planet is known as the Red Planet" → Mars

$400 - MODERATE: Requires some knowledge but still accessible. Use interesting facts or indirect clues.
Example: "Neil Armstrong took his famous first steps on the Moon in this year" → 1969

$600 - MEDIUM: Requires specific knowledge. Add context, dates, or connections that narrow it down.
Example: "This Soviet cosmonaut became the first human in space in 1961" → Yuri Gagarin

$800 - CHALLENGING: For enthusiasts. Specific historical details, lesser-known facts, or require connecting multiple pieces of information.
Example: "This NASA mission in 1970 famously radioed 'Houston, we've had a problem' after an oxygen tank explosion" → Apollo 13

$1000 - DIFFICULT: Deep knowledge required. Obscure facts, specific technical details, or advanced connections.
Example: "This Voyager spacecraft launched in 1977 became the first human-made object to enter interstellar space in 2012" → Voyager 1

QUESTION WRITING RULES:
- Make questions interesting with context, not just definitions
- MUST progress from easy ($200) to hard ($1000) in each category
- Avoid overly obscure trivia even at $1000 - should still be answerable by someone knowledgeable
- Use varied styles: "This person...", "In this year...", "This event...", "This famous..."
- Keep it educational and fun!
- BE FACTUALLY ACCURATE! Ensure questions and answers match correctly:
  * BAD: "What chemical reaction causes bread to rise?" → "Yeast" (yeast is an organism, not a reaction)
  * GOOD: "This microorganism causes bread dough to rise through fermentation" → "Yeast"
  * BAD: "The color of the sky" → "Blue" (too vague/simple)
  * GOOD: "Rayleigh scattering of sunlight gives Earth's sky this color during the day" → "Blue"
- Double-check that your question's wording accurately describes the answer

Return ONLY a JSON object with this exact structure:
{
  "categories": ["Category1", "Category2", "Category3", "Category4", "Category5", "Category6"],
  "questions": [
    [
      {"value": 200, "question": "Question text", "answer": "Short answer"},
      {"value": 400, "question": "Question text", "answer": "Short answer"},
      {"value": 600, "question": "Question text", "answer": "Short answer"},
      {"value": 800, "question": "Question text", "answer": "Short answer"},
      {"value": 1000, "question": "Question text", "answer": "Short answer"}
    ],
    ... (5 more category arrays)
  ]
}

Keep answers SHORT (1-4 words max). All categories must relate to: ${topic}`
                }],
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();

        // Parse the JSON response
        let parsedData;
        try {
            // Try to extract JSON if there's extra text
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            } else {
                parsedData = JSON.parse(content);
            }
        } catch (e) {
            console.error('Failed to parse response:', content);
            throw new Error('Failed to parse AI response as JSON');
        }

        // Validate the structure
        if (!parsedData.categories || !parsedData.questions) {
            console.error('Missing categories or questions:', parsedData);
            throw new Error('AI response missing required fields. Please try again.');
        }

        if (parsedData.categories.length !== 6) {
            console.error('Wrong number of categories:', parsedData.categories.length);
            throw new Error(`AI returned ${parsedData.categories.length} categories instead of 6. Please try again.`);
        }

        if (parsedData.questions.length !== 6) {
            console.error('Wrong number of question arrays:', parsedData.questions.length);
            throw new Error(`AI returned ${parsedData.questions.length} question sets instead of 6. Please try again.`);
        }

        // Validate each category has 5 questions
        for (let i = 0; i < parsedData.questions.length; i++) {
            if (!parsedData.questions[i] || parsedData.questions[i].length !== 5) {
                console.error(`Category ${i} has wrong number of questions:`, parsedData.questions[i]?.length);
                throw new Error(`Category "${parsedData.categories[i]}" doesn't have exactly 5 questions. Please try again.`);
            }
        }

        loadingDiv.textContent = '';
        return parsedData;

    } catch (error) {
        loadingDiv.textContent = '';
        throw error;
    }
}

// Start game with generated questions
async function startGame() {
    const topic = document.getElementById('topic-input').value.trim();
    const generateBtn = document.getElementById('generate-game');
    const loadingDiv = document.getElementById('loading');

    if (!topic) {
        alert('Please enter a topic!');
        return;
    }

    // Disable button during generation
    generateBtn.disabled = true;
    loadingDiv.textContent = 'Generating questions';

    try {
        gameData = await generateQuestions(topic);

        // Hide topic screen, show game screen
        document.getElementById('topic-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';

        // Display the chosen topic
        document.getElementById('current-topic').textContent = topic;

        // Reset score
        score = 0;
        updateScore();

        // Select Daily Double positions
        selectDailyDoubles();

        // Initialize the board
        initializeBoard();

    } catch (error) {
        console.error('Error generating questions:', error);
        alert(`Error generating questions: ${error.message}\n\nPlease try again with a different topic.`);
        generateBtn.disabled = false;
        loadingDiv.textContent = '';
    }
}

// Select Daily Double positions (2 random positions, weighted toward higher values)
function selectDailyDoubles() {
    dailyDoubles = [];
    const usedPositions = new Set();

    // Weights for each row (0-4, where 0 is $200 and 4 is $1000)
    // Higher rows have higher probability
    const rowWeights = [1, 2, 3, 5, 8]; // Fibonacci-like progression

    while (dailyDoubles.length < 2) {
        // Pick a random row based on weights
        const totalWeight = rowWeights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let row = 0;

        for (let i = 0; i < rowWeights.length; i++) {
            random -= rowWeights[i];
            if (random <= 0) {
                row = i;
                break;
            }
        }

        // Pick a random column (0-5)
        const col = Math.floor(Math.random() * 6);

        // Create position key
        const posKey = `${col}-${row}`;

        // Only add if not already used
        if (!usedPositions.has(posKey)) {
            usedPositions.add(posKey);
            dailyDoubles.push({ category: col, questionIndex: row });
        }
    }

    console.log('Daily Doubles placed at:', dailyDoubles);
}

// Check if a position is a Daily Double
function isDailyDouble(categoryIndex, questionIndex) {
    return dailyDoubles.some(dd =>
        dd.category === categoryIndex && dd.questionIndex === questionIndex
    );
}

// Reset game and go back to topic selection
function resetGame() {
    // Clear the game board
    document.getElementById('game-board').innerHTML = '';

    // Show topic screen, hide game screen
    document.getElementById('topic-screen').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';

    // Reset game state
    gameData = null;
    score = 0;
    currentQuestion = null;
    dailyDoubles = [];
}

// Initialize the game board
function initializeBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = ''; // Clear existing board

    // Add category headers
    gameData.categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.textContent = category;
        gameBoard.appendChild(categoryDiv);
    });

    // Add clues (5 rows of questions)
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 6; col++) {
            const clue = document.createElement('div');
            clue.className = 'clue';
            clue.textContent = `$${gameData.questions[col][row].value}`;
            clue.dataset.category = col;
            clue.dataset.questionIndex = row;

            // Add click event
            clue.addEventListener('click', () => showQuestion(col, row, clue));

            gameBoard.appendChild(clue);
        }
    }
}

// Show question modal
function showQuestion(categoryIndex, questionIndex, clueElement) {
    // Don't allow clicking used clues
    if (clueElement.classList.contains('used')) {
        return;
    }

    const question = gameData.questions[categoryIndex][questionIndex];
    const isDD = isDailyDouble(categoryIndex, questionIndex);

    currentQuestion = {
        question: question,
        clueElement: clueElement,
        isDailyDouble: isDD,
        wager: null
    };

    if (isDD) {
        // Show Daily Double wager screen
        showDailyDoubleWager();
    } else {
        // Show normal question
        displayQuestion();
    }
}

// Show Daily Double wager interface
function showDailyDoubleWager() {
    const modal = document.getElementById('question-modal');

    // Calculate max wager (higher of current score or question value, min 200)
    const maxWager = Math.max(score > 0 ? score : 200, 1000);

    // Hide normal question elements
    document.getElementById('question-text').style.display = 'none';
    document.getElementById('answer-input').style.display = 'none';
    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('skip-question').style.display = 'none';
    document.getElementById('feedback').textContent = '';

    // Show Daily Double announcement
    document.getElementById('question-value').innerHTML = `
        <div class="daily-double-announcement">DAILY DOUBLE!</div>
        <div class="daily-double-wager-prompt">Place your wager (max: $${maxWager})</div>
        <input type="number" id="wager-input" class="wager-input" min="200" max="${maxWager}" value="200" step="100">
        <button id="submit-wager" class="btn btn-submit">Lock In Wager</button>
    `;

    modal.classList.add('show');

    // Focus on wager input
    setTimeout(() => {
        const wagerInput = document.getElementById('wager-input');
        if (wagerInput) {
            wagerInput.focus();
            wagerInput.select();
        }
    }, 100);

    // Handle wager submission
    const submitWagerBtn = document.getElementById('submit-wager');
    const wagerInput = document.getElementById('wager-input');

    const submitWager = () => {
        const wager = parseInt(wagerInput.value);
        if (wager >= 200 && wager <= maxWager) {
            currentQuestion.wager = wager;
            displayQuestion();
        } else {
            alert(`Please enter a wager between $200 and $${maxWager}`);
        }
    };

    submitWagerBtn.onclick = submitWager;
    wagerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitWager();
        }
    });
}

// Display the actual question (after Daily Double wager or immediately for normal questions)
function displayQuestion() {
    // Show normal question elements
    document.getElementById('question-text').style.display = 'block';
    document.getElementById('answer-input').style.display = 'block';
    document.getElementById('submit-answer').style.display = 'inline-block';
    document.getElementById('skip-question').style.display = 'inline-block';

    // Update modal content
    const valueText = currentQuestion.isDailyDouble
        ? `DAILY DOUBLE - $${currentQuestion.wager}`
        : `$${currentQuestion.question.value}`;

    document.getElementById('question-value').textContent = valueText;
    document.getElementById('question-text').textContent = currentQuestion.question.question;
    document.getElementById('answer-input').value = '';
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';

    // Disable submit button initially (no answer yet)
    document.getElementById('submit-answer').disabled = true;

    // Show modal and focus on answer input
    document.getElementById('question-modal').classList.add('show');
    document.getElementById('answer-input').focus();
}

// Update submit button state based on answer input
function updateSubmitButton() {
    const answerInput = document.getElementById('answer-input');
    const submitButton = document.getElementById('submit-answer');
    submitButton.disabled = answerInput.value.trim() === '';
}

// Normalize text for comparison (removes spaces, hyphens, punctuation, articles)
function normalizeAnswer(text) {
    return text
        .toLowerCase()
        .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/[-_]/g, '') // Remove hyphens and underscores
        .replace(/[.,!?;:'"]/g, '') // Remove punctuation
        .trim();
}

// Helper function to get word stem (basic stemming)
function getWordStem(word) {
    // Remove common suffixes to get base form
    const suffixes = ['ing', 'ed', 'es', 's', 'tion', 'ation', 'ment', 'ly', 'er', 'est', 'ness'];
    let stem = word.toLowerCase();

    for (const suffix of suffixes) {
        if (stem.endsWith(suffix) && stem.length > suffix.length + 2) {
            return stem.substring(0, stem.length - suffix.length);
        }
    }
    return stem;
}

// Check answer
function checkAnswer() {
    const userAnswer = document.getElementById('answer-input').value.trim();
    const correctAnswer = currentQuestion.question.answer;
    const feedback = document.getElementById('feedback');

    // Determine the value to add/subtract (use wager for Daily Doubles)
    const pointValue = currentQuestion.isDailyDouble
        ? currentQuestion.wager
        : currentQuestion.question.value;

    // Normalize both answers for comparison
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    // Also check lowercase versions for simpler matching
    const userLower = userAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    // Get stems for both answers
    const userStem = getWordStem(normalizedUser);
    const correctStem = getWordStem(normalizedCorrect);

    // Flexible answer checking
    const isCorrect =
        // Exact match (case insensitive)
        userLower === correctLower ||
        // Normalized match (handles spaces, hyphens, articles, punctuation)
        normalizedUser === normalizedCorrect ||
        // Partial match (one contains the other)
        (normalizedUser.length > 3 && normalizedCorrect.includes(normalizedUser)) ||
        (normalizedCorrect.length > 3 && normalizedUser.includes(normalizedCorrect)) ||
        // Stem match (handles variations like singular/plural)
        (userStem.length > 3 && correctStem.length > 3 && userStem === correctStem) ||
        // Check if user answer contains the correct answer (or vice versa) after basic cleanup
        (userLower.length > 3 && correctLower.includes(userLower)) ||
        (correctLower.length > 3 && userLower.includes(correctLower));

    if (isCorrect) {
        feedback.textContent = `Correct! The answer is: ${currentQuestion.question.answer}`;
        feedback.className = 'feedback correct';
        score += pointValue;
        updateScore();

        // Mark clue as used
        currentQuestion.clueElement.classList.add('used');
        currentQuestion.clueElement.textContent = '';

        // Close modal after 2 seconds
        setTimeout(closeModal, 2000);
    } else {
        feedback.textContent = `Incorrect! The answer is: ${currentQuestion.question.answer}`;
        feedback.className = 'feedback incorrect';
        score -= pointValue;
        updateScore();

        // Mark clue as used
        currentQuestion.clueElement.classList.add('used');
        currentQuestion.clueElement.textContent = '';

        // Close modal after 3 seconds
        setTimeout(closeModal, 3000);
    }
}

// Skip question
function skipQuestion() {
    const feedback = document.getElementById('feedback');
    feedback.textContent = `The answer was: ${currentQuestion.question.answer}`;
    feedback.className = 'feedback';

    currentQuestion.clueElement.classList.add('used');
    currentQuestion.clueElement.textContent = '';

    // Close modal after 2 seconds
    setTimeout(closeModal, 2000);
}

// Close modal
function closeModal() {
    document.getElementById('question-modal').classList.remove('show');
    currentQuestion = null;
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = `$${score}`;
}

// Event listeners for game generation
document.getElementById('generate-game').addEventListener('click', startGame);
document.getElementById('new-game').addEventListener('click', resetGame);

// Allow Enter key to generate game
document.getElementById('topic-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startGame();
    }
});

// Event listeners for gameplay
document.getElementById('submit-answer').addEventListener('click', checkAnswer);
document.getElementById('skip-question').addEventListener('click', skipQuestion);

// Update submit button state when user types
document.getElementById('answer-input').addEventListener('input', updateSubmitButton);

// Allow Enter key to submit answer (only if there's text)
document.getElementById('answer-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        checkAnswer();
    }
});

// Close modal when clicking outside
document.getElementById('question-modal').addEventListener('click', (e) => {
    if (e.target.id === 'question-modal') {
        skipQuestion();
    }
});
