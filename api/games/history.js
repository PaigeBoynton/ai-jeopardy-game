import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  // Validate input
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
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

    // Get all games for this user
    const games = await sql`
      SELECT id, topic, score, correct_answers, total_questions, played_at
      FROM games
      WHERE user_id = ${userId}
      ORDER BY played_at DESC
    `;

    // Calculate stats
    const totalGames = games.length;

    let totalScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;

    const formattedGames = games.map(game => {
      totalScore += game.score;
      totalCorrect += game.correct_answers;
      totalQuestions += game.total_questions;

      const percentCorrect = Math.round((game.correct_answers / game.total_questions) * 100);

      return {
        id: game.id,
        topic: game.topic,
        score: game.score,
        correctAnswers: game.correct_answers,
        totalQuestions: game.total_questions,
        percentCorrect: percentCorrect,
        date: game.played_at
      };
    });

    const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
    const averagePercentCorrect = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalGames: totalGames,
        averageScore: averageScore,
        averagePercentCorrect: averagePercentCorrect
      },
      games: formattedGames
    });

  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({ error: 'Failed to get game history' });
  }
}
