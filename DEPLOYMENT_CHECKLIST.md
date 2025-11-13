# Deployment Checklist

Use this checklist to deploy the admin system to your existing Vercel project.

## ✅ Pre-Deployment

- [ ] Review all new files in your repository
- [ ] Understand the admin system architecture (see [SETUP.md](SETUP.md))
- [ ] Decide on a secure admin password (16+ characters recommended)

## ✅ Configuration

### 1. Vercel Blob Storage Setup

- [ ] Log into [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Navigate to your project: `alphabet-game-umber`
- [ ] Go to **Storage** tab
- [ ] Click **Create Database**
- [ ] Select **Blob** storage type
- [ ] Name: `alphabet-game-storage`
- [ ] Click **Create**
- [ ] Verify `BLOB_READ_WRITE_TOKEN` appears in environment variables

### 2. Admin Password Setup

- [ ] In Vercel Dashboard, go to **Settings** → **Environment Variables**
- [ ] Click **Add New**
- [ ] Variable name: `ADMIN_PASSWORD`
- [ ] Variable value: Your secure password
- [ ] Select environments: ✅ Production, ✅ Preview, ✅ Development
- [ ] Click **Save**

## ✅ Code Deployment

### Option A: Git Push (Recommended)

```bash
# Stage all new files
git add .

# Review what will be committed
git status

# Commit the changes
git commit -m "Add admin system with Vercel Blob storage and serverless functions"

# Push to GitHub/GitLab
git push origin main
```

- [ ] Run `git add .`
- [ ] Run `git commit -m "Add admin system"`
- [ ] Run `git push`
- [ ] Verify deployment starts in Vercel Dashboard

### Option B: Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy
vercel --prod
```

- [ ] Install Vercel CLI
- [ ] Run `vercel --prod`
- [ ] Confirm deployment

## ✅ Post-Deployment Verification

### 1. Check Deployment Status

- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Open your project
- [ ] Verify deployment status is **Ready**
- [ ] Check deployment logs for errors

### 2. Test Admin Panel Access

- [ ] Visit: https://alphabet-game-umber.vercel.app/admin.html
- [ ] Verify admin login page appears
- [ ] Enter your admin password
- [ ] Confirm successful login
- [ ] Check that the admin dashboard loads

### 3. Test Template Downloads

- [ ] Click "📄 Download Questions Template"
- [ ] Verify file downloads successfully
- [ ] Open file and confirm it's valid JSON
- [ ] Click "📄 Download Preview Template"
- [ ] Verify preview template downloads

### 4. Test Challenge Upload

- [ ] Use the downloaded template (or create a simple test)
- [ ] Fill in the upload form:
  - Slug: `test-challenge`
  - Title: `Test Challenge`
  - Questions file: Your test JSON
- [ ] Click "🚀 Upload Challenge"
- [ ] Verify success message appears
- [ ] Check Vercel Dashboard → Storage → Blob for uploaded files

### 5. Test Challenge in Game

- [ ] Click the challenge link or visit: `?challenge=test-challenge`
- [ ] Verify game loads with your questions
- [ ] Test answering a few questions
- [ ] Confirm the challenge works correctly

### 6. Test Challenge Management

- [ ] Return to admin panel
- [ ] Click "🔄 Refresh List"
- [ ] Verify `test-challenge` appears
- [ ] Click "📥 Download" and verify files download
- [ ] Click "👁️ View" and verify challenge opens
- [ ] Click "🗑️ Delete" and confirm deletion works
- [ ] Refresh list and verify challenge is gone

## ✅ API Endpoints Verification

Test each API endpoint:

### Public Endpoints

- [ ] GET `/api/list-challenges`
  ```bash
  curl https://alphabet-game-umber.vercel.app/api/list-challenges
  ```

- [ ] GET `/api/get-challenge?slug=test`
  ```bash
  curl https://alphabet-game-umber.vercel.app/api/get-challenge?slug=test-challenge
  ```

- [ ] GET `/api/generate-template?type=questions`
  ```bash
  curl https://alphabet-game-umber.vercel.app/api/generate-template?type=questions
  ```

### Protected Endpoints (Require Password)

- [ ] POST `/api/upload-challenge` (tested via admin UI)
- [ ] DELETE `/api/delete-challenge` (tested via admin UI)

## ✅ Security Verification

- [ ] Confirm admin password works
- [ ] Verify unauthorized requests are rejected
- [ ] Check that Blob storage URLs are publicly readable
- [ ] Confirm environment variables are not exposed in client code
- [ ] Test logout functionality

## ✅ Documentation

- [ ] Share admin panel URL with authorized users
- [ ] Distribute admin password securely (not via email!)
- [ ] Point users to [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [ ] Document any custom configurations

## ✅ Optional: Local Development Test

- [ ] Clone repo to a fresh directory
- [ ] Run `npm install`
- [ ] Create `.env` file:
  ```
  ADMIN_PASSWORD=your-test-password
  BLOB_READ_WRITE_TOKEN=your-token-from-vercel
  ```
- [ ] Run `npm run dev`
- [ ] Test admin panel at `http://localhost:3000/admin.html`

## 🚨 Rollback Plan (If Something Goes Wrong)

If you need to rollback:

1. Go to Vercel Dashboard → Deployments
2. Find the previous working deployment
3. Click "..." menu → "Promote to Production"
4. Previous version is restored

## 📊 Monitoring

After deployment, monitor:

- [ ] Vercel Dashboard → Functions → Check invocations
- [ ] Vercel Dashboard → Storage → Check blob usage
- [ ] Check for any error emails from Vercel
- [ ] Review function logs for errors

## 🎉 Success Criteria

You've successfully deployed when:

- ✅ Admin panel is accessible at `/admin.html`
- ✅ Login works with your password
- ✅ Templates can be downloaded
- ✅ Challenges can be uploaded
- ✅ Challenges appear in the game
- ✅ Challenge management (view, download, delete) works
- ✅ No errors in Vercel deployment logs
- ✅ Existing challenges still work

## 📝 Notes

Write any deployment-specific notes here:

```
Date deployed: _______________
Admin password stored: _______________
Deployed by: _______________
Issues encountered: _______________
```

---

**Ready to deploy?** Start from the top and check off each item as you go!
