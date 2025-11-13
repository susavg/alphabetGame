# Admin Dashboard - Quick Reference Guide

## 📍 Access the Admin Panel

**URL**: https://alphabet-game-umber.vercel.app/admin.html

**Password**: Contact your Vercel administrator for the admin password.

---

## 🎯 Common Tasks

### 1. Creating Your First Challenge

#### Step 1: Download a Template
1. Click **"📄 Download Questions Template"**
2. Save the file as `my-challenge-questions.json`

#### Step 2: Edit the Template
Open the downloaded file in any text editor and customize:

```json
{
  "A": [
    {
      "word": "Your Answer",
      "definition": "Your question here?",
      "answers": ["Your Answer", "Alternative Answer"],
      "hints": [
        "First hint",
        "Second hint",
        "Third hint",
        "Fourth hint"
      ]
    }
  ],
  ...
}
```

**Important**:
- You MUST have all 26 letters (A-Z)
- Each letter needs at least one question
- The `word` and `definition` fields are required
- `answers` array should include all acceptable variations
- `hints` are optional (4 hints recommended)

#### Step 3: Upload to Admin Panel
1. Fill in the form:
   - **Challenge Slug**: `my-first-challenge` (lowercase, hyphens only)
   - **Title**: `My First Challenge`
   - **Subtitle**: `Created on [today's date]`
   - **Questions File**: Select your edited JSON file
   - **Time Limit**: `300` (5 minutes)

2. Click **"🚀 Upload Challenge"**

3. Wait for confirmation message

4. Click the link to test your challenge!

---

### 2. Editing an Existing Challenge

#### Download Existing Challenge
1. Find the challenge in the **"📚 Existing Challenges"** list
2. Click **"📥 Download"**
3. This downloads the current questions.json file

#### Edit and Re-upload
1. Edit the downloaded file
2. Upload as a NEW challenge with the same slug (it will overwrite)
3. Or use a different slug to create a variant

---

### 3. Creating a Preview Version

A preview is a simpler, shorter version of your challenge for demos.

#### Download Preview Template
1. Click **"📄 Download Preview Template"**
2. Edit with simpler questions (same format as questions.json)
3. Upload alongside your main questions file

**When to Use Preview**:
- Quick demos at events
- Testing the game flow
- Practice rounds before the real challenge

---

### 4. Managing Challenges

#### View Challenge
- Click **"👁️ View"** to open the challenge in a new tab
- URL format: `?challenge=your-slug`

#### Delete Challenge
- Click **"🗑️ Delete"**
- Confirm deletion (this cannot be undone!)
- All files (questions, preview, logos) are removed from storage

#### Refresh List
- Click **"🔄 Refresh List"** to reload the challenges list
- Use after uploading or deleting

---

## 📋 Question Format Reference

### Minimal Question (Required Fields Only)
```json
{
  "word": "Answer",
  "definition": "What is the question?",
  "answers": ["Answer"]
}
```

### Full Question (All Fields)
```json
{
  "word": "Amazon",
  "definition": "The biggest ecommerce retailer in Europe?",
  "answers": ["Amazon", "Amazon.com", "AMZN"],
  "hints": [
    "Known for fast delivery and a smile logo.",
    "Seattle-based company with cloud services.",
    "Owns Prime Video streaming service.",
    "Starts with A and ends with N (6 letters)."
  ]
}
```

### Best Practices

**Definitions**:
- Keep them concise (one sentence)
- End with a question mark
- Avoid ambiguity

**Answers**:
- Include common misspellings
- Add abbreviations if relevant
- Consider plural forms
- Fuzzy matching is enabled by default

**Hints** (4 recommended):
1. General context hint
2. More specific clue
3. Even more specific
4. First letter + word length

---

## 🎨 Advanced: Custom Branding

### Upload a Logo
1. In the upload form, use **"Logo File"** field
2. Supported formats: PNG, SVG, JPG
3. Recommended: SVG for best quality
4. Logo appears in the welcome screen

### Custom Time Limit
- Default: 300 seconds (5 minutes)
- Minimum: 60 seconds
- Maximum: 3600 seconds (1 hour)
- Set in the **"Time Limit"** field

---

## 🔧 Troubleshooting

### "Unauthorized" Error
- Check that you're using the correct admin password
- Password is case-sensitive
- Contact Vercel administrator to reset

### Upload Fails with "Invalid JSON"
- Validate your JSON at https://jsonlint.com/
- Common issues:
  - Missing comma between items
  - Extra comma after last item
  - Unescaped quotes in text
  - Missing closing brackets

### Missing Letters Error
- Ensure all 26 letters (A-Z) are present
- Each letter must have at least one question
- Check for typos in letter names

### Challenge Not Appearing in Game
1. Refresh the challenges list
2. Check that upload succeeded
3. Try accessing directly: `?challenge=your-slug`
4. Clear browser cache

---

## 💡 Tips for Great Challenges

### Theme Ideas
- Corporate training (sales, marketing, HR)
- Industry-specific (retail, healthcare, tech)
- Event-based (conferences, team building)
- Educational (history, science, literature)
- Fun (pop culture, movies, music)

### Question Writing Tips
1. **Start Easy**: Letters like A, B, C should be straightforward
2. **Build Difficulty**: Make X, Y, Z more challenging
3. **Be Specific**: Avoid questions with multiple valid answers
4. **Test It**: Play through your challenge before sharing
5. **Get Feedback**: Have someone else try it

### Answer Variations
Include common alternatives:
- `Amazon` → `["Amazon", "Amazon.com", "AMZ"]`
- `E-commerce` → `["Ecommerce", "E-commerce", "E-comm"]`
- `Key Performance Indicator` → `["KPI", "Key Performance Indicator"]`

---

## 📊 Challenge Statistics

After uploading challenges, the admin panel shows:
- **Total Challenges**: Number of challenges in the system
- **Questions per Challenge**: Always 26 (A-Z)
- **Total Questions**: Challenges × 26

---

## 🔒 Security Notes

- **Never share** the admin password publicly
- **Use HTTPS** (automatic on Vercel)
- **Logout** when done (especially on shared computers)
- **Backup** important challenges by downloading them

---

## 📞 Need Help?

### Check These Resources First
1. [SETUP.md](SETUP.md) - Complete technical setup guide
2. [README.md](README.md) - Game overview and features
3. Vercel Dashboard - Check deployment logs

### Common Questions

**Q: Can I have multiple people managing challenges?**
A: Yes! Share the admin password with trusted team members.

**Q: How many challenges can I create?**
A: Vercel free tier allows 1 GB storage. Each challenge is ~10 KB, so you can create thousands.

**Q: Can I use images in questions?**
A: Not currently supported. Stick to text-based questions.

**Q: Can I change the scoring system?**
A: Not via the admin panel. This requires editing `catalog.json` directly.

**Q: Can players save their scores?**
A: The game generates a PDF export. No automatic score storage currently.

---

## 🎓 Example Workflow

### Creating a Conference Challenge

1. **Before the event**:
   - Download template
   - Create 26 questions about your company/industry
   - Upload as `conference-2025`
   - Test with colleagues

2. **At the event**:
   - Display QR code linking to: `?challenge=conference-2025`
   - Attendees play on their phones
   - Winners export PDF as proof of score

3. **After the event**:
   - Download the challenge for archival
   - Create a preview version for next year's teaser
   - Delete if no longer needed

---

**Happy Challenge Creating! 🎮**
