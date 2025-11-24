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

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);

    // Check if username already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username.toLowerCase()}
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Insert new user
    const result = await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username.toLowerCase()}, ${passwordHash})
      RETURNING id, username, created_at
    `;

    const user = result[0];

    // Return success
    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
}
