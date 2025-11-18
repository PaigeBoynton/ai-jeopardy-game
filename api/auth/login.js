import crypto from 'crypto';
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

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const users = await loadUsers();
    const user = users[username.toLowerCase()];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordHash = hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate session token
    const token = generateToken();

    // Return success with user data and token
    res.status(200).json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        totalGames: user.games.length
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}
