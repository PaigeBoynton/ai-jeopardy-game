import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, gameData } = req.body;

  // Validate input
  if (!username || !gameData) {
    return res.status(400).json({ error: 'Username and game data are required' });
  }

  const { topic, totalQuestions, correctAnswers, score } = gameData;

  if (!topic || totalQuestions === undefined || correctAnswers === undefined || score === undefined) {
    return res.status(400).json({ error: 'Incomplete game data' });
  }

  try {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE username = ${username.toLowerCase()}
    `;

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult[0].id;

    // Insert game record
    await sql`
      INSERT INTO games (user_id, topic, score, correct_answers, total_questions)
      VALUES (${userId}, ${topic}, ${score}, ${correctAnswers}, ${totalQuestions})
    `;

    return res.status(201).json({ success: true });

  } catch (error) {
    console.error('Save game error:', error);
    return res.status(500).json({ error: 'Failed to save game' });
  }
}
