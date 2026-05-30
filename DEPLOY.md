# PosterAgent Deployment Guide

## Quick Deploy to Railway.app (Recommended)

Railway offers a generous free tier and stays awake (unlike Render).

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/posteragent.git
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `posteragent` repository
4. Railway will auto-detect the `railway.json` config
5. Add your environment variables (see below)
6. Deploy!

### Step 3: Set Environment Variables

In Railway dashboard, add these variables:

```
TELEGRAM_BOT_TOKEN=7700881961:AAEQwmAdSfkzZrHrpNaMIl2ZY4oeotdJdqw
OPENAI_API_KEY=your_openai_key
CLOUDINARY_CLOUD_NAME=ddh8wccyg
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
CLOUDINARY_UPLOAD_PRESET=ml_default
ZENROWS_API_KEY=your_zenrows_key
JWT_SECRET=your_random_secret
```

### Step 4: Update Telegram Bot Webhook (Optional)

If you want to use webhook mode instead of polling:

```
https://api.telegram.org/bot7700881961:AAEQwmAdSfkzZrHrpNaMIl2ZY4oeotdJdqw/setWebhook?url=https://your-railway-url.up.railway.app/telegram/webhook
```

---

## Alternative: Deploy to Render.com

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New Web Service"
4. Connect your GitHub repo
5. Render will read `render.yaml` automatically
6. Add environment variables in dashboard
7. Deploy!

**Note:** Render free tier sleeps after 15 min inactivity. First request may take 30s to wake up.

---

## Alternative: Deploy to Fly.io

```bash
# Install flyctl
winget install Fly-io.flyctl

# Login
fly auth login

# Launch
fly launch

# Set secrets
fly secrets set TELEGRAM_BOT_TOKEN=xxx OPENAI_API_KEY=xxx ...

# Deploy
fly deploy
```

---

## Environment Variables Required

| Variable                   | Description                           |
| -------------------------- | ------------------------------------- |
| `TELEGRAM_BOT_TOKEN`       | Your bot token from @BotFather        |
| `OPENAI_API_KEY`           | OpenAI API key for content generation |
| `CLOUDINARY_CLOUD_NAME`    | Cloudinary cloud name                 |
| `CLOUDINARY_API_KEY`       | Cloudinary API key                    |
| `CLOUDINARY_API_SECRET`    | Cloudinary API secret                 |
| `CLOUDINARY_UPLOAD_PRESET` | Cloudinary upload preset              |
| `ZENROWS_API_KEY`          | ZenRows API key for web scraping      |
| `JWT_SECRET`               | Random string for JWT signing         |

---

## Using the Bot from Your Phone

Once deployed:

1. Open Telegram on your phone
2. Find **@aramex_86_bot**
3. Send `/generate https://any-url.com`
4. The bot will:
   - Show progress (6 steps)
   - Send post preview with approve/rewrite buttons
   - Generate ray.so code snippet image
   - Upload to Cloudinary
   - Send final approval with image
   - Simulate LinkedIn post

The bot runs 24/7 on Railway, so you can use it anytime from anywhere!
