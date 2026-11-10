# My Website Tracker

**Version:** 1.0  
**Project Type:** Personal Website Management Dashboard  
**Database & Auth:** 100% Google Sheets (`profiles` & `websites` tabs via Google Apps Script)  
**Access Model:** Private — Single Owner Only

My Website Tracker is a minimal, lightweight, private web application built with **React**, **Vite**, **Tailwind CSS**, **Lucide React**, and **Google Sheets**. All authentication records (`profiles` tab) and project records (`websites` tab) are stored strictly in a private Google Sheet.

---

## Project Structure

```text
my-website-tracker/
├── google-sheets/
│   └── Code.gs              # Google Apps Script backend & single-owner auth bound to your Google Sheet
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── WebsiteCard.jsx
│   │   ├── WebsiteForm.jsx
│   │   └── StatusBadge.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Websites.jsx
│   │   ├── WebsiteDetails.jsx
│   │   └── Settings.jsx
│   ├── lib/
│   │   └── sheets.js        # Google Sheets API client, session manager & validators
│   ├── hooks/
│   │   └── useAuth.js       # Single-owner authentication hook
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vercel.json
├── vite.config.js
└── README.md
```

---

## 1. Google Sheets Database Structure

When you run `setupDatabaseAndOwner()` in [`google-sheets/Code.gs`](./google-sheets/Code.gs), two tabs are automatically created in your private Google Sheet:

### Tab 1: `profiles` (Single Owner Only)
| Column | Description |
|---|---|
| `id` | Unique UUID for the single authorized owner |
| `email` | Owner email address |
| `password_hash` | SHA-256 salted password hash (plaintext passwords are never stored) |
| `salt` | Per-owner cryptographic salt |
| `session_token` | Active session token |
| `token_expires_at` | ISO-8601 session expiration timestamp |
| `created_at` | ISO-8601 account creation timestamp |

> Only **Row 2** is ever read or permitted as the owner account, enforcing a strict single-owner model.

### Tab 2: `websites` (All Website Projects)
| Column | Description |
|---|---|
| `id` | Unique UUID for the website project |
| `owner_id` | Owner UUID (must match the single owner in `profiles`) |
| `name` | Website project name |
| `description` | Short project description |
| `website_url` | Live deployed website URL (optional while in development) |
| `repository_url` | GitHub repository URL (optional while in development) |
| `tech_stack` | Comma-separated technologies used |
| `status` | One of: `Planning`, `In Development`, `Testing`, `Deployed / Live`, `Maintenance`, `Archived` |
| `notes` | Personal project notes |
| `created_at` | Automatically recorded creation timestamp |
| `updated_at` | Automatically updated timestamp on edits |

---

## 2. Google Sheets & Initial Owner Setup Instructions

1. **Create a Private Google Sheet**:
   - Visit [https://sheets.new](https://sheets.new) and name your spreadsheet `My Website Tracker DB`.
   - Keep the spreadsheet **Private (Restricted to Only You)** in Google Drive.
2. **Add the Apps Script Backend**:
   - Inside your Google Sheet, click **Extensions → Apps Script**.
   - Replace the default code in `Code.gs` with the full contents of [`google-sheets/Code.gs`](./google-sheets/Code.gs).
3. **Configure Your Single-Owner Credentials**:
   - At the top of `Code.gs`, set your desired owner email and initial password:
     ```javascript
     const INITIAL_OWNER_EMAIL = 'your-email@example.com';
     const INITIAL_OWNER_PASSWORD = 'YourStrongPassword123!';
     ```
   - Click **Save** (disk icon).
4. **Initialize the Sheets & Owner Row**:
   - In the Apps Script toolbar dropdown at the top, select **`setupDatabaseAndOwner`** and click **Run**.
   - Approve the Google permissions prompt for your script to access your spreadsheet.
   - Verify in your Google Sheet that the **`profiles`** and **`websites`** tabs were created and Row 2 of `profiles` contains your owner email and SHA-256 password hash.
5. **Deploy as a Web App**:
   - In Apps Script, click **Deploy → New deployment**.
   - Click the gear icon next to **Select type** and choose **Web app**.
   - Set **Execute as:** `Me`.
   - Set **Who has access:** `Anyone` (Required so browser `fetch` requests can reach the script endpoint; the script itself enforces strict password & session-token authentication on every request, while your Google Sheet remains private).
   - Click **Deploy** and copy the generated **Web app URL** (`https://script.google.com/macros/s/.../exec`).

---

## 3. Environment Variable Instructions

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Set your Google Sheets Web App URL (and optional frontend email guard):

```env
GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
OWNER_EMAIL=your-email@example.com
```

---

## 4. Local Development Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the development server:**
   ```bash
   npm run dev
   ```
3. **Build for production:**
   ```bash
   npm run build
   ```

---

## 5. Vercel Deployment Instructions

1. Push this project to a private **GitHub** repository.
2. Import the repository into [Vercel](https://vercel.com).
3. Add the environment variables in **Vercel Project Settings → Environment Variables**:
   - `GOOGLE_SHEETS_WEBAPP_URL`
   - `OWNER_EMAIL`
4. Click **Deploy**.
