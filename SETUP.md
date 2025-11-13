# Alphabet Game - Admin System Setup Guide

## 🎯 Overview

This guide will help you set up the dynamic challenge management system for the Alphabet Game using Vercel Serverless Functions and Vercel Blob Storage.

## 📋 Prerequisites

- A [Vercel](https://vercel.com) account (free tier works)
- Your project already deployed on Vercel (or ready to deploy)
- Node.js 18+ installed locally (for testing)
- Git repository connected to Vercel

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `@vercel/blob` - Vercel's file storage SDK
- `formidable` - File upload handling

### Step 2: Configure Vercel Blob Storage

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Blob**
4. Name it: `alphabet-game-storage`
5. Click **Create**

Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` environment variable to your project.

### Step 3: Set Admin Password

1. In Vercel Dashboard, go to **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name**: `ADMIN_PASSWORD`
   - **Value**: Your secure admin password (e.g., `MySecurePass123!`)
   - **Environment**: Production, Preview, Development (select all)
3. Click **Save**

### Step 4: Deploy to Vercel

#### Option A: Deploy via Git (Recommended)

```bash
git add .
git commit -m "Add admin system with Vercel Blob storage"
git push
```

Vercel will automatically deploy your changes.

#### Option B: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts to deploy.

### Step 5: Access Admin Panel

Once deployed, visit:
```
https://your-project.vercel.app/admin.html
```

Login with the password you set in Step 3.

## 🎮 Using the Admin Dashboard

### Downloading Templates

1. Click **"📥 Download Templates"** section
2. Download either:
   - **Questions Template** - Full question set with hints
   - **Preview Template** - Simpler demo questions
3. Edit the JSON file with your custom questions

### Uploading a New Challenge

1. Fill in the form:
   - **Challenge Slug**: URL-friendly identifier (e.g., `sales-2025`)
   - **Title**: Display name (e.g., "Sales Directors 2025")
   - **Subtitle**: Optional tagline
   - **Questions File**: Your edited questions.json
   - **Preview File**: Optional preview.json
   - **Logo**: Optional image file
   - **Time Limit**: Game duration in seconds (default: 300)

2. Click **"🚀 Upload Challenge"**

3. Access your challenge at:
   ```
   https://your-project.vercel.app/?challenge=sales-2025
   ```

### Managing Challenges

- **👁️ View**: Opens the challenge in a new tab
- **📥 Download**: Downloads the challenge files for editing
- **🗑️ Delete**: Removes the challenge (requires confirmation)

## 📁 File Structure

```
alphabetGame/
├── api/                          # Serverless functions
│   ├── upload-challenge.js       # Upload new challenges
│   ├── list-challenges.js        # List all challenges
│   ├── delete-challenge.js       # Delete challenges
│   ├── get-challenge.js          # Get challenge details
│   └── generate-template.js      # Generate templates
├── admin.html                    # Admin interface
├── admin.js                      # Admin logic
├── challenges/                   # Local challenge files
│   ├── default/                  # Default theme assets
│   ├── eu-nrm/
│   └── sales-directors/
├── index.html                    # Main game
├── wordCircleGame.js             # Game logic
├── gameUtils.js                  # Utilities
├── catalog.json                  # Challenge registry
├── package.json                  # Dependencies
└── vercel.json                   # Vercel configuration
```

## 🔧 How It Works

### File Storage Flow

1. **Upload**: Files are uploaded to Vercel Blob Storage (CDN)
2. **Catalog Update**: `catalog.json` is updated with Blob URLs
3. **Game Loads**: Game fetches questions from Blob Storage or local files
4. **Fallback**: If Blob URL fails, falls back to local files

### URL Priority

The game supports both storage types:

```javascript
// Blob Storage URL (uploaded via admin)
"questionsPath": "https://blob.vercel-storage.com/..."

// Local file path (traditional)
"questionsPath": "questions.json"
```

### Authentication

Simple password-based authentication using HTTP headers:
- Password stored in Vercel environment variables
- Transmitted via `x-admin-password` header
- Protected routes: Upload, Delete

## 🔒 Security Best Practices

1. **Strong Password**: Use a complex admin password (16+ characters)
2. **HTTPS Only**: Vercel enforces HTTPS automatically
3. **Environment Variables**: Never commit passwords to Git
4. **Blob Access**: Set to `public` (read-only for URLs)
5. **CORS**: APIs allow cross-origin requests (safe for this use case)

## 🧪 Local Development

### Run Development Server

```bash
npm run dev
```

This starts Vercel Dev server at `http://localhost:3000`

### Test Admin Panel Locally

1. Set environment variable:
   ```bash
   export ADMIN_PASSWORD="your-password"
   ```

2. Visit `http://localhost:3000/admin.html`

3. Upload and test challenges locally

## 📊 Questions.json Format

Each challenge needs 26 questions (A-Z):

```json
{
  "A": [
    {
      "word": "Apple",
      "definition": "A red or green fruit?",
      "answers": ["Apple", "Apples"],
      "hints": [
        "Grows on trees",
        "Can be red or green",
        "Often used in pies",
        "Five letters, starts with A"
      ]
    }
  ],
  "B": [...],
  ...
  "Z": [...]
}
```

### Required Fields

- `word`: The correct answer (string)
- `definition`: The question text (string)
- `answers`: Array of acceptable answers (string[])

### Optional Fields

- `hints`: Array of 4 hints (string[])
  - If not provided, auto-generated hints are used
  - Format: First letter + word length

## 🌐 API Endpoints

### Public Endpoints

```
GET  /api/list-challenges
GET  /api/get-challenge?slug=...
GET  /api/generate-template?type=questions|preview
```

### Protected Endpoints (Require Authentication)

```
POST   /api/upload-challenge
DELETE /api/delete-challenge?slug=...
```

## 🐛 Troubleshooting

### Issue: "Unauthorized" error

**Solution**: Check that `ADMIN_PASSWORD` environment variable is set in Vercel Dashboard.

### Issue: "Module not found: @vercel/blob"

**Solution**:
```bash
npm install
git add package.json package-lock.json
git commit -m "Add dependencies"
git push
```

### Issue: Uploaded files not appearing

**Solution**:
1. Check Vercel Dashboard → Storage → Blob
2. Verify files are uploaded
3. Check `catalog.json` has correct URLs
4. Clear browser cache

### Issue: Template download fails

**Solution**: Ensure `/api/generate-template.js` is deployed. Check Vercel Functions logs.

## 💰 Pricing

### Vercel Blob Storage (Free Tier)

- **Storage**: 1 GB
- **Bandwidth**: 100 GB/month
- **Read Operations**: Unlimited
- **Write Operations**: Unlimited

**Estimated Usage for 100 Challenges:**
- Questions JSON: ~10 KB each = 1 MB total
- Well within free tier limits

### Vercel Functions (Free Tier)

- **Executions**: 100k/month
- **Duration**: 100 GB-Hrs/month

**More than enough for admin operations.**

## 🔄 Migration Strategy

### Moving Existing Challenges to Blob Storage

1. Download existing challenge:
   ```
   Admin Panel → Download → Select challenge
   ```

2. Re-upload through admin panel

3. Old local files remain as backup

### Keeping Local Files

You can use both:
- Blob Storage: For dynamically uploaded challenges
- Local Files: For version-controlled challenges

The system automatically handles both.

## 📈 Scaling

For larger deployments:

1. **Custom Domain**: Add via Vercel Dashboard
2. **CDN**: Vercel Edge Network (automatic)
3. **Analytics**: Add Vercel Analytics
4. **Monitoring**: Use Vercel Logs
5. **Backup**: Export challenges regularly

## 🆘 Support

### Vercel Documentation

- [Blob Storage Docs](https://vercel.com/docs/storage/vercel-blob)
- [Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)

### Testing Checklist

- [ ] Admin login works
- [ ] Template downloads
- [ ] Challenge upload succeeds
- [ ] Challenge appears in list
- [ ] Challenge viewable in game
- [ ] Challenge downloadable
- [ ] Challenge deletable

## 🎉 You're Done!

Your Alphabet Game now has a fully functional admin system for managing challenges without touching code or databases!

**Next Steps:**
1. Create your first custom challenge
2. Share admin access with team members
3. Upload challenges for different events
4. Download and edit existing challenges as templates
