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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const users = await loadUsers();
    const user = users[username.toLowerCase()];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return games sorted by date (newest first)
    const games = [...user.games].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    res.status(200).json({
      success: true,
      games: games,
      stats: {
        totalGames: games.length,
        averageScore: games.length > 0
          ? Math.round(games.reduce((sum, g) => sum + g.score, 0) / games.length)
          : 0,
        averagePercentCorrect: games.length > 0
          ? Math.round(games.reduce((sum, g) => sum + g.percentCorrect, 0) / games.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get game history' });
  }
}
