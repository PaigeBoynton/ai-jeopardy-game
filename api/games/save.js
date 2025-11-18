import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = '/tmp/jeopardy-data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Load users from file
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Save users to file
async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, gameData } = req.body;

  if (!username || !gameData) {
    return res.status(400).json({ error: 'Username and game data are required' });
  }

  // Validate game data
  const { topic, totalQuestions, correctAnswers, score } = gameData;

  if (!topic || totalQuestions === undefined || correctAnswers === undefined || score === undefined) {
    return res.status(400).json({ error: 'Invalid game data' });
  }

  try {
    const users = await loadUsers();
    const user = users[username.toLowerCase()];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate percentage
    const percentCorrect = totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

    // Add game to user's history
    const game = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      topic: topic,
      totalQuestions: totalQuestions,
      correctAnswers: correctAnswers,
      percentCorrect: percentCorrect,
      score: score
    };

    user.games.push(game);

    await saveUsers(users);

    res.status(200).json({
      success: true,
      game: game
    });
  } catch (error) {
    console.error('Save game error:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
}
