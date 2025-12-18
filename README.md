# 🐦 BirdHub Profile

Your personal birding profile that syncs automatically from eBird.

**[🌍 Explore the Flock →](https://jacobjameson.github.io/birdhub)**

---

## ⚡ Setup (5 minutes)

### 1. Use this template

Click the green **"Use this template"** button above → **"Create a new repository"**

Name it whatever you want (e.g., `birdhub`, `my-birds`, `birding`)

### 2. Edit your profile

Edit `data.json` and fill in your info:

```json
{
  "profile": {
    "name": "Your Name",
    "username": "your-github-username",
    "location": "City, State"
  }
}
```

### 3. Add eBird credentials

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these two secrets:

| Name | Value |
|------|-------|
| `EBIRD_USERNAME` | Your eBird email |
| `EBIRD_PASSWORD` | Your eBird password |

> 🔒 These are encrypted and never visible to anyone

### 4. Enable GitHub Pages

Go to **Settings** → **Pages**

- Source: **Deploy from a branch**
- Branch: **main** / **(root)**
- Click **Save**

### 5. Run the first sync

Go to **Actions** → **Sync eBird Life List** → **Run workflow**

Wait ~1 minute for it to complete.

### 6. Done! 🎉

Your profile is live at: `https://YOUR-USERNAME.github.io/REPO-NAME`

---

## 🔄 How it works

| What | When |
|------|------|
| **eBird sync** | Daily at 7am UTC |
| **Feature updates** | Weekly on Sundays |

Your bird data updates automatically. New features (themes, badges, etc.) sync weekly from the main template.

---

## 🌍 Join the Flock

Want to appear in the [BirdHub directory](https://jacobjameson.github.io/birdhub)?

1. Make sure your profile is working
2. Go to [jacobjameson/birdhub](https://github.com/jacobjameson/birdhub)
3. Edit `scripts/sync-directory.js`
4. Add yourself to `BIRDER_REGISTRY`
5. Submit a Pull Request!

---

## 📁 Files

```
├── index.html          # Your profile page
├── embed.html          # Embeddable widget
├── data.json           # Your bird data (auto-updated)
├── fetch-ebird.js      # eBird sync script
└── .github/workflows/
    ├── sync-ebird.yml      # Daily eBird sync
    └── sync-upstream.yml   # Weekly feature updates
```

---

## 📊 Embed Your Graph

Want to show your birding contributions on another website? Use the embed widget!

### Basic embed (current year):
```html
<iframe 
  src="https://YOUR-USERNAME.github.io/REPO-NAME/embed.html" 
  width="100%" 
  height="200" 
  frameborder="0">
</iframe>
```

### Specific year:
```html
<iframe 
  src="https://YOUR-USERNAME.github.io/REPO-NAME/embed.html?year=2024" 
  width="100%" 
  height="200" 
  frameborder="0">
</iframe>
```

The embed includes:
- 🗓️ Full year contribution graph
- 🐦 Hover to see species spotted each day
- 🔗 Links back to your full profile

---

Made with 💚 by [BirdHub](https://github.com/jacobjameson/birdhub)
