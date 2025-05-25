# Corporate Word Circle Game

A modern, configurable word circle game designed for corporate training and team building. Features include fuzzy matching, customizable themes, multiple question sets, and comprehensive scoring.

## 🚀 Features

- **Configurable Game Settings**: Customize time limits, scoring, fuzzy matching, and more
- **Multiple Question Sets**: Easy to swap between different question databases
- **Fuzzy Matching**: Accept similar answers with configurable tolerance
- **Modern UI**: Responsive design with dark/light theme support
- **Comprehensive Scoring**: Detailed scoring system with time bonuses
- **PDF Export**: Generate detailed result reports
- **Accessibility**: Keyboard navigation and screen reader friendly

## 📁 File Structure

```
corporate-word-circle/
├── index.html              # Main game HTML
├── styles.css              # Game styles and themes
├── wordCircleGame.js       # Main game logic
├── gameUtils.js            # Utility functions
├── config.json             # Game configuration
├── questions-corporate.json # Corporate questions database
├── IMAGEN.png              # Game logo/image
└── README.md               # This file
```

## 🛠️ Setup Instructions

1. **Download all files** to the same directory
2. **Place your logo** as `IMAGEN.png` in the root directory
3. **Customize configuration** in `config.json`
4. **Add/modify questions** in the questions JSON file
5. **Open `index.html`** in a web browser

## ⚙️ Configuration

### Game Settings (`config.json`)

```json
{
  "gameSettings": {
    "timeLimit": 300,           // Game duration in seconds
    "maxHints": 3,              // Maximum hints allowed
    "penalizeUnanswered": false, // Whether to penalize unanswered questions
    "scoring": {
      "correct": 3,             // Points for correct answers
      "incorrect": -2,          // Points deducted for wrong answers
      "pasapalabra": -1,        // Points deducted for passes
      "timeBonus": {            // Time bonus configuration
        "threshold": 10,        // Minimum correct answers for bonus
        "levels": [
          { "maxTime": 60, "bonus": 30 },
          { "maxTime": 120, "bonus": 20 },
          { "maxTime": 180, "bonus": 10 }
        ]
      }
    },
    "fuzzyMatching": {
      "enabled": true,          // Enable fuzzy matching
      "threshold": 0.8,         // Similarity threshold (0-1)
      "maxDistance": 2          // Maximum character differences
    }
  },
  "theme": {
    "name": "corporate",
    "colors": {
      "primary": "#2c3e50",
      "accent": "#3498db",
      "correct": "#2ecc71",
      "incorrect": "#e74c3c",
      "background": "#ecf0f1",
      "cardBackground": "#ffffff",
      "textColor": "#333333"
    }
  },
  "questionsFile": "questions-corporate.json",
  "gameTitle": "Corporate Word Circle",
  "gameSubtitle": "NRM Challenge - 2025"
}
```

### Questions Format

Questions are organized by letter in JSON format:

```json
{
  "A": [
    {
      "word": "Automation",
      "definition": "What word means using technology to make processes automatic?",
      "answers": ["Automation", "Automatization", "Auto"]
    }
  ],
  "B": [
    {
      "word": "Brand",
      "definition": "What represents company identity and product recognition?",
      "answers": ["Brand", "Business", "Banner"]
    }
  ]
}
```

## 🎮 Game Controls

- **Enter**: Submit answer
- **Answer Button**: Submit current answer
- **Pass Button**: Skip to next question
- **Hint Button**: Get a hint for current question
- **⚙️ Settings**: Configure game options
- **🌙/☀️ Theme**: Toggle dark/light theme

## 🏆 Scoring System

- **Correct Answer**: +3 points (configurable)
- **Incorrect Answer**: -2 points (configurable)
- **Pass (Pasapalabra)**: -1 point (configurable)
- **Time Bonus**: Up to +30 points for fast completion
- **Unanswered**: Configurable penalty

## 🔧 Customization

### Creating New Question Sets

1. Copy `questions-corporate.json`
2. Rename to your theme (e.g., `questions-medical.json`)
3. Update questions for each letter
4. Update `questionsFile` in `config.json`

### Custom Themes

Modify the `theme.colors` section in `config.json`:

```json
"theme": {
  "name": "custom",
  "colors": {
    "primary": "#your-color",
    "accent": "#your-accent",
    "correct": "#success-color",
    "incorrect": "#error-color",
    "background": "#bg-color",
    "cardBackground": "#card-color",
    "textColor": "#text-color"
  }
}
```

### Fuzzy Matching

The game supports intelligent answer matching:

- **Exact matches**: Always accepted
- **Similar spelling**: "Automatization" vs "Automation"
- **Typos**: Small character differences
- **Configurable tolerance**: Adjust sensitivity

## 📱 Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers

## 🚨 Troubleshooting

### Common Issues

1. **Game won't load**
   - Check that all files are in the same directory
   - Ensure questions file path is correct in config.json
   - Check browser console for errors

2. **Questions not displaying**
   - Verify JSON syntax in questions file
   - Check that all letters A-Z have at least one question

3. **Styling issues**
   - Ensure styles.css is loading properly
   - Check for CSS conflicts if embedded in existing site

4. **PDF generation fails**
   - Ensure jsPDF library is loading from CDN
   - Check browser console for errors

### Development Mode

For development/testing:
1. Open browser developer tools
2. Check console for error messages
3. Use `game` object in console to inspect state
4. Modify `config.json` and reload to test changes

## 🔒 Security Notes

- All files should be served over HTTPS in production
- Validate question content before deployment
- Consider input sanitization for custom deployments

## 📄 License

This game is provided as-is for educational and corporate training purposes. Modify and distribute as needed for your organization.

## 🤝 Contributing

To contribute improvements:
1. Test thoroughly across different browsers
2. Maintain backward compatibility with existing config files
3. Document any new configuration options
4. Ensure responsive design on mobile devices

## 📞 Support

For technical issues:
1. Check this README first
2. Verify all files are present and correct
3. Test with default configuration
4. Check browser compatibility

---

**Happy Gaming! 🎯**