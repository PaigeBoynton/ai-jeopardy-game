import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Hash password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);

    // Get user from database
    const result = await sql`
      SELECT id, username, password_hash, created_at
      FROM users
      WHERE username = ${username.toLowerCase()}
    `;

    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result[0];

    // Check password
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Get total games count
    const gamesCount = await sql`
      SELECT COUNT(*) as count FROM games WHERE user_id = ${user.id}
    `;

    // Return success
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
        totalGames: parseInt(gamesCount[0].count)
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
}
