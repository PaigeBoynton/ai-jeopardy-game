# AI-Powered Jeopardy Game

An interactive Jeopardy-style trivia game that uses OpenAI's GPT to generate custom questions on any topic you choose!

## Features

- 🎯 **AI-Generated Questions**: Enter any topic and get 6 categories with 5 questions each
- 📊 **Difficulty Progression**: Questions range from $200 (easy) to $1000 (difficult)
- 🎨 **Classic Jeopardy Styling**: Authentic blue and gold color scheme
- 💯 **Smart Answer Checking**: Accepts different word forms (e.g., "marinate" vs "marination")
- ✨ **Beautiful Interface**: Clean, responsive design with smooth animations

## Setup Instructions

### 1. Get an OpenAI API Key

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (it starts with `sk-`)

### 2. Configure the Game

1. Copy `config.example.js` to `config.js`:
   ```bash
   cp config.example.js config.js
   ```

2. Open `config.js` and replace `'your-openai-api-key-here'` with your actual API key:
   ```javascript
   const CONFIG = {
       OPENAI_API_KEY: 'sk-proj-your-actual-key-here'
   };
   ```

3. **IMPORTANT**: Never commit `config.js` to Git! It's already in `.gitignore`.

### 3. Run the Game

Simply open `index.html` in your web browser. No build step required!

## How to Play

1. Enter a topic you want to be tested on (e.g., "Ancient Rome", "Space Exploration", "Cooking")
2. Click "Generate Game" and wait a few seconds
3. Click on any dollar amount to see the question
4. Type your answer and click Submit
5. Your score updates based on correct/incorrect answers
6. Click "New Game" to try a different topic

## Technologies Used

- **HTML/CSS/JavaScript**: Core game implementation
- **OpenAI GPT-3.5**: AI question generation
- **Fetch API**: Asynchronous API calls

## Project Structure

```
jeopardy-game/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── script.js           # Game logic and AI integration
├── config.js           # Your API key (NOT in Git)
├── config.example.js   # Template for config
├── .gitignore          # Excludes config.js from Git
└── README.md           # This file
```

## Security Notes

- **Never commit your `config.js` file** - it contains your API key
- The `.gitignore` file prevents accidental commits
- If you accidentally commit your key, regenerate it immediately on OpenAI's website

## Contributing

Feel free to fork this project and submit pull requests! Some ideas for improvements:

- Add sound effects
- Implement Daily Double
- Add multiplayer support
- Create different difficulty modes
- Add a timer for answering

## License

MIT License - feel free to use this project however you'd like!

## Credits

Built as a learning project to explore:
- JavaScript game development
- AI API integration
- DOM manipulation
- Async/await patterns
