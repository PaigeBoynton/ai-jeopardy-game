// Game state
let score = 0;
let currentQuestion = null;
let gameData = null;
let dailyDoubles = [];
let questionsAnswered = 0;
let correctAnswers = 0;

// Check if we're running locally or on Vercel
function isLocalEnvironment() {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
}

// Generate questions using OpenAI API
async function generateQuestions(topic) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.textContent = 'Generating questions';

    const messagePayload = {
        model: 'gpt-4o-mini',
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

CRITICAL RULE #1 - ANSWER MUST MATCH CATEGORY (MOST IMPORTANT RULE!):

  READ THE CATEGORY NAME CAREFULLY! Your answer MUST be exactly what the category asks for.

  * Category "Famous Chefs" → Answer MUST be a CHEF (Gordon Ramsay, Julia Child)
    - NOT a cooking technique, NOT a food, NOT a restaurant - ONLY a chef!

  * Category "Sports Legends" → Answer MUST be an ATHLETE (Michael Jordan, Serena Williams)
    - NOT a food, NOT a stadium, NOT equipment - ONLY an athlete!

  * Category "Historic Landmarks" → Answer MUST be a LANDMARK (Eiffel Tower, Taj Mahal)
    - NOT a food, NOT a person, NOT an event - ONLY a landmark!

  * Category "Food & Cuisine" → Answer CAN be food (Pizza, Sushi)
    - This is where food answers belong!

  COMMON MISTAKES TO AVOID:
  * BAD: Category "Sports" → Answer "Hot dog" (that's FOOD, not SPORTS!)
  * GOOD: Category "Sports" → Answer "Babe Ruth" (that's an athlete)

  * BAD: Category "Landmarks" → Answer "Lobster roll" (that's FOOD, not a LANDMARK!)
  * GOOD: Category "Landmarks" → Answer "Statue of Liberty" (that's a landmark)

  * BAD: Category "Famous Chefs" → Answer "Sous vide" (that's a technique, not a chef!)
  * GOOD: Category "Famous Chefs" → Answer "Thomas Keller" (that's a chef)

  BEFORE CREATING ANY ANSWER: Ask yourself "Is this answer literally what the category name describes?"
  If NO → Pick a different answer that matches!

CRITICAL RULE #2 - NEVER PUT THE ANSWER IN THE QUESTION (AUTOMATIC REJECTION):

  BEFORE FINALIZING ANY QUESTION, RUN THIS TEST:
  1. Split the answer into individual words
  2. Check if ANY word (or word root) appears ANYWHERE in the question
  3. If YES → REJECT and completely rewrite the question

  EXAMPLES OF BANNED QUESTIONS:
  * BANNED: "This tool is used to zest citrus fruits" → Answer: "Zester"
    WHY: "zest" is the root of "zester" - REWRITE REQUIRED

  * BANNED: "This sandwich made with lobster salad is famous in Massachusetts" → Answer: "Lobster roll"
    WHY: Word "lobster" appears in question - REWRITE REQUIRED

  * BANNED: "This prestigious women's college is located in Wellesley, MA" → Answer: "Wellesley College"
    WHY: Word "Wellesley" appears in question - REWRITE REQUIRED

  * BANNED: "This Massachusetts town was the site of the Salem Witch Trials" → Answer: "Salem"
    WHY: Word "Salem" appears in question - REWRITE REQUIRED

  CORRECT VERSIONS:
  * GOOD: "This small kitchen tool has tiny sharp holes for removing citrus peel" → "Zester"
  * GOOD: "This New England seafood sandwich is served on a toasted split-top bun" → "Lobster roll"
  * GOOD: "This prestigious women's college is located in a wealthy Boston suburb" → "Wellesley College"
  * GOOD: "This Massachusetts town was the site of infamous witch trials in 1692" → "Salem"

  VALIDATION CHECKLIST FOR EVERY QUESTION:
  □ Split answer into words: ["word1", "word2", ...]
  □ Search question for each word
  □ Search question for word roots (first 3-4 letters)
  □ If ANY match found → REJECT and create completely new question
  □ Only accept if NO matches found

CRITICAL RULE #3 - BE FACTUALLY ACCURATE:
  * Ensure questions and answers match correctly
  * BAD: "What chemical reaction causes bread to rise?" → "Yeast" (yeast is an organism, not a reaction)
  * GOOD: "This microorganism causes bread dough to rise through fermentation" → "Yeast"

MANDATORY VALIDATION - For EVERY question, check these THREE things:

1. CATEGORY MATCH: Does the answer LITERALLY match what the category describes?
   - Category "Famous Chefs" → Answer MUST be a chef's name (NOT food, NOT techniques)
   - Category "Sports Legends" → Answer MUST be an athlete (NOT food, NOT stadiums)
   - Category "Landmarks" → Answer MUST be a landmark (NOT food, NOT people)
   - Category "Food & Cuisine" → Answer CAN be food

   ASK: "If the category is 'Sports', is my answer about sports?"
   If the answer is a food item and category is NOT about food → REJECT!
   If answer type doesn't match category → REJECT and create new question!

2. ANSWER NOT IN QUESTION: Split your answer into individual words and check each one
   - Answer "Lobster roll" → Check for "lobster" AND "roll" in question
   - Answer "New York" → Check for "New" AND "York" in question
   - Answer "Zester" → Check for "zest", "zester", "zesting" in question
   - If ANY word from answer appears in question → REJECT and rewrite question

3. FACTUAL ACCURACY: Does the question accurately describe the answer?
   - If description is wrong → REJECT and fix it

DO NOT SKIP THIS VALIDATION! Check every single question before finalizing.

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
        temperature: 0.3
    };

    try {
        let response;

        // Check if running locally or on Vercel
        if (isLocalEnvironment()) {
            // Local development: call OpenAI directly with API key from config.js
            if (typeof CONFIG === 'undefined' || !CONFIG.OPENAI_API_KEY) {
                throw new Error('API key not found. Make sure config.js exists with your OPENAI_API_KEY.');
            }

            response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify(messagePayload)
            });
        } else {
            // Production: use Vercel serverless function
            response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messagePayload)
            });
        }

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

        // Store topic for later
        gameData.topic = topic;

        // Reset score and statistics
        score = 0;
        questionsAnswered = 0;
        correctAnswers = 0;
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
async function resetGame() {
    // Save game results if user is logged in and game was played
    if (typeof currentUser !== 'undefined' && currentUser && !currentUser.isGuest && gameData && questionsAnswered > 0) {
        await saveGameResult(
            gameData.topic,
            questionsAnswered,
            correctAnswers,
            score
        );
    }

    // Clear the game board
    document.getElementById('game-board').innerHTML = '';

    // Show topic screen, hide game screen
    document.getElementById('topic-screen').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';

    // Re-enable the generate button and clear loading text
    document.getElementById('generate-game').disabled = false;
    document.getElementById('loading').textContent = '';

    // Reset game state
    gameData = null;
    score = 0;
    currentQuestion = null;
    dailyDoubles = [];
    questionsAnswered = 0;
    correctAnswers = 0;
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

// Helper function to get word stem (basic stemming for better matching)
function getWordStem(word) {
    // Remove common suffixes to get base form
    const suffixes = [
        'ation', 'tion', // Handle these first (longer suffixes)
        'ing', 'ed', 'es', 's',
        'ment', 'ly', 'er', 'est',
        'ness', 'ion', 'ate', 'e'
    ];
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

    // Get stems for both answers (for the normalized versions)
    const userStem = getWordStem(normalizedUser);
    const correctStem = getWordStem(normalizedCorrect);

    // Split into words for word-by-word comparison
    const userWords = userLower.split(/\s+/);
    const correctWords = correctLower.split(/\s+/);

    // Check if main words match (ignoring articles)
    const userMainWords = userWords.filter(w => !['the', 'a', 'an'].includes(w));
    const correctMainWords = correctWords.filter(w => !['the', 'a', 'an'].includes(w));

    // Flexible answer checking
    const isCorrect =
        // Exact match (case insensitive)
        userLower === correctLower ||
        // Normalized match (handles spaces, hyphens, articles, punctuation)
        normalizedUser === normalizedCorrect ||
        // Stem match on normalized text (handles "marinate" vs "marination")
        (userStem.length > 3 && correctStem.length > 3 && userStem === correctStem) ||
        // Main words match (all correct words appear in user answer)
        (correctMainWords.length > 0 && correctMainWords.every(word =>
            userMainWords.some(userWord => {
                // Direct match or stem match
                return userWord === word ||
                       getWordStem(userWord) === getWordStem(word) ||
                       userWord.includes(word) ||
                       word.includes(userWord);
            })
        )) ||
        // Substring match for normalized answers (handles "spiderman" vs "spider-man")
        (normalizedUser.length > 3 && normalizedCorrect.includes(normalizedUser)) ||
        (normalizedCorrect.length > 3 && normalizedUser.includes(normalizedCorrect)) ||
        // Check if all non-trivial words from correct answer appear in user answer
        (correctMainWords.length > 0 && correctMainWords.every(word =>
            word.length > 2 && normalizedUser.includes(normalizeAnswer(word))
        ));

    // Track statistics
    questionsAnswered++;
    if (isCorrect) {
        correctAnswers++;
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
    // Track as answered but not correct
    questionsAnswered++;

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
