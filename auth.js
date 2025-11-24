// Authentication state
let currentUser = null;

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('jeopardyUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showTopicScreen();
    }

    setupAuthListeners();
});

function setupAuthListeners() {
    // Tab switching
    document.getElementById('login-tab').addEventListener('click', () => {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('register-tab').classList.remove('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        clearErrors();
    });

    document.getElementById('register-tab').addEventListener('click', () => {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('login-tab').classList.remove('active');
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'none';
        clearErrors();
    });

    // Login
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Register
    document.getElementById('register-btn').addEventListener('click', handleRegister);
    document.getElementById('register-confirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    // Guest mode
    document.getElementById('guest-btn').addEventListener('click', handleGuestMode);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // View history
    document.getElementById('view-history').addEventListener('click', showGameHistory);
    document.getElementById('back-to-game').addEventListener('click', () => {
        document.getElementById('history-screen').style.display = 'none';
        document.getElementById('topic-screen').style.display = 'block';
    });
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    errorDiv.textContent = '';

    if (!username || !password) {
        errorDiv.textContent = 'Please enter username and password';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('jeopardyUser', JSON.stringify(data.user));
            showTopicScreen();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        console.error('Login error:', error);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorDiv = document.getElementById('register-error');
    const registerBtn = document.getElementById('register-btn');

    errorDiv.textContent = '';

    if (!username || !password || !confirm) {
        errorDiv.textContent = 'Please fill in all fields';
        return;
    }

    if (password !== confirm) {
        errorDiv.textContent = 'Passwords do not match';
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = 'Creating account...';

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Auto-login after registration
            currentUser = data.user;
            localStorage.setItem('jeopardyUser', JSON.stringify(data.user));
            showTopicScreen();
        } else {
            errorDiv.textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        console.error('Registration error:', error);
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register';
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('jeopardyUser');

    // Clear form inputs
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';

    // Show auth screen
    document.getElementById('topic-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('history-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'block';

    clearErrors();
}

function handleGuestMode() {
    currentUser = {
        id: 'guest',
        username: 'Guest',
        isGuest: true
    };
    showTopicScreen();
}

function showTopicScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('topic-screen').style.display = 'block';
    document.getElementById('username-display').textContent = currentUser.username;

    // Show/hide game history button based on guest status
    const historyBtn = document.getElementById('view-history');
    if (currentUser.isGuest) {
        historyBtn.style.display = 'none';
    } else {
        historyBtn.style.display = 'inline-block';
    }

    // Update logout button text
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.textContent = currentUser.isGuest ? 'Back to Login' : 'Logout';
}

async function showGameHistory() {
    if (!currentUser || currentUser.isGuest) return;

    document.getElementById('topic-screen').style.display = 'none';
    document.getElementById('history-screen').style.display = 'block';
    document.getElementById('history-username').textContent = currentUser.username;

    try {
        const response = await fetch(`/api/games/history?username=${encodeURIComponent(currentUser.username)}`);
        const data = await response.json();

        if (response.ok) {
            displayGameHistory(data);
        } else {
            console.error('Failed to load history:', data.error);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function displayGameHistory(data) {
    // Update stats
    document.getElementById('total-games').textContent = data.stats.totalGames;
    document.getElementById('avg-score').textContent = '$' + data.stats.averageScore;
    document.getElementById('avg-percent').textContent = data.stats.averagePercentCorrect + '%';

    // Display games list
    const gamesList = document.getElementById('games-list');

    if (data.games.length === 0) {
        gamesList.innerHTML = '<div class="no-games">No games played yet. Start playing to build your history!</div>';
        return;
    }

    gamesList.innerHTML = data.games.map(game => {
        const date = new Date(game.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        return `
            <div class="game-card">
                <div class="game-header">
                    <div class="game-topic">${escapeHtml(game.topic)}</div>
                    <div class="game-date">${formattedDate}</div>
                </div>
                <div class="game-stats">
                    <div class="game-stat">
                        <span class="stat-label">Score:</span>
                        <span class="stat-value">$${game.score}</span>
                    </div>
                    <div class="game-stat">
                        <span class="stat-label">Correct:</span>
                        <span class="stat-value">${game.correctAnswers}/${game.totalQuestions}</span>
                    </div>
                    <div class="game-stat">
                        <span class="stat-label">Accuracy:</span>
                        <span class="stat-value ${game.percentCorrect >= 70 ? 'good' : game.percentCorrect >= 50 ? 'ok' : 'poor'}">${game.percentCorrect}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function clearErrors() {
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Save game result
async function saveGameResult(topic, totalQuestions, correctAnswers, score) {
    // Don't save game results for guest users
    if (!currentUser || currentUser.isGuest) return;

    try {
        const response = await fetch('/api/games/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                gameData: {
                    topic,
                    totalQuestions,
                    correctAnswers,
                    score
                }
            })
        });

        if (!response.ok) {
            console.error('Failed to save game');
        }
    } catch (error) {
        console.error('Error saving game:', error);
    }
}
