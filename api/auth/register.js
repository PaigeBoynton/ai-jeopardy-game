import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = '/tmp/jeopardy-data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Load users from file
async function loadUsers() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet
    return {};
  }
}

// Save users to file
async function saveUsers(users) {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const users = await loadUsers();

    // Check if username already exists
    if (users[username.toLowerCase()]) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Create new user
    const userId = crypto.randomUUID();
    users[username.toLowerCase()] = {
      id: userId,
      username: username,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      games: []
    };

    await saveUsers(users);

    // Return success (don't send password hash to client)
    res.status(201).json({
      success: true,
      user: {
        id: userId,
        username: username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}
