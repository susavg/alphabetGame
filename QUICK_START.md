# 🚀 Quick Start Card - Alphabet Game Admin

## 📍 Admin Panel URL
**https://alphabet-game-umber.vercel.app/admin.html**

---

## 🔐 First Time Setup (5 Minutes)

### 1. Access Admin Panel
Visit the URL above and login with your admin password.

### 2. Download Template
Click **"📄 Download Questions Template"** button.

### 3. Edit Template
Open the downloaded JSON file and replace with your questions:
```json
{
  "A": [
    {
      "word": "Your Answer",
      "definition": "Your question?",
      "answers": ["Answer", "Alternative"]
    }
  ],
  "B": [ ... ],
  ...
  "Z": [ ... ]
}
```
**Important**: Must have all 26 letters (A-Z)!

### 4. Upload Challenge
- **Slug**: `my-challenge` (lowercase, hyphens only)
- **Title**: `My First Challenge`
- **Questions File**: Your edited JSON
- Click **"🚀 Upload Challenge"**

### 5. Share with Players
Give players this URL:
**https://alphabet-game-umber.vercel.app/?challenge=my-challenge**

---

## 🎯 Most Common Tasks

| Task | Steps |
|------|-------|
| **Create Challenge** | Download template → Edit → Upload |
| **Edit Challenge** | Download existing → Edit → Re-upload with same slug |
| **Share Challenge** | Copy URL: `?challenge=your-slug` |
| **Delete Challenge** | Find in list → Click 🗑️ Delete |
| **Test Challenge** | Click 👁️ View button |

---

## 📋 JSON Template Structure

### Minimal Question
```json
{
  "word": "Apple",
  "definition": "A red fruit?",
  "answers": ["Apple", "Apples"]
}
```

### With Hints (Recommended)
```json
{
  "word": "Apple",
  "definition": "A red fruit?",
  "answers": ["Apple", "Apples"],
  "hints": [
    "Grows on trees",
    "Common in pies",
    "Can be red or green",
    "Starts with A, 5 letters"
  ]
}
```

---

## ⚠️ Common Mistakes

❌ **Missing letters** - Must have A-Z (26 letters)
❌ **Invalid JSON** - Check at [jsonlint.com](https://jsonlint.com)
❌ **Special characters in slug** - Use lowercase and hyphens only
❌ **Forgot password** - Contact Vercel admin to reset

---

## 💡 Pro Tips

✅ Start with simple questions for A, B, C
✅ Make X, Y, Z more challenging
✅ Include multiple answer variations
✅ Test your challenge before sharing
✅ Download challenges as backups

---

## 📞 Need Help?

📖 **Full Guides**:
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md) - Detailed user guide
- [SETUP.md](SETUP.md) - Technical setup

🐛 **Common Issues**:
- "Unauthorized" → Check password
- "Invalid JSON" → Validate at jsonlint.com
- Challenge not appearing → Refresh list

---

## 🎮 Game Features

- ⏰ **Time Limit**: 5 minutes (300 seconds)
- 💡 **Hints**: Up to 5 hints available
- ✨ **Smart Matching**: Accepts similar spellings
- 📊 **Scoring**: Points for correct answers
- 📄 **PDF Export**: Download results

---

## 🔒 Security Notes

- Never share admin password publicly
- Logout when done (especially on shared PCs)
- Use HTTPS (automatic on Vercel)
- Backup important challenges by downloading

---

**Created by: Alphabet Game Admin Team**
**Last Updated: 2025**
