# AgriStock Pro — Inventory Management for Ahrhoff Futtergut

A PWA (Progressive Web App) for managing agricultural feed product inventory,
with lot-based tracking, expiry alerts, demand forecasting, and automated reorder planning.

Works **100% offline** — all data is stored in your browser's IndexedDB.

---

## How to Run (Step-by-Step for Beginners)

### Step 1: Install Node.js

Go to **https://nodejs.org** and download the **LTS** version (big green button).  
Install it like any normal program — just keep clicking Next / Continue.

To check it installed correctly, open a terminal and type:

```
node --version
```

You should see something like `v20.x.x` or `v22.x.x`. Any version 18+ is fine.

### Step 2: Download this project

If you received this as a `.zip` file, unzip it to a folder on your computer.  
For example, put it on your **Desktop** so the path is:

- **Windows:** `C:\Users\YourName\Desktop\agristock-pro`
- **Mac:** `/Users/YourName/Desktop/agristock-pro`

### Step 3: Open a Terminal

- **Windows:** Press `Win + R`, type `cmd`, press Enter  
  (Or search for "Command Prompt" in the Start menu)
- **Mac:** Press `Cmd + Space`, type `Terminal`, press Enter

### Step 4: Navigate to the Project Folder

Type this command (adjust the path to where you saved the folder):

**Windows:**
```
cd Desktop\agristock-pro
```

**Mac:**
```
cd ~/Desktop/agristock-pro
```

### Step 5: Install Dependencies

This downloads all the libraries the app needs. Run:

```
npm install
```

Wait for it to finish (might take 1–2 minutes). You'll see a `node_modules` folder appear.

### Step 6: Start the App

```
npm run dev
```

You'll see output like:

```
  VITE v6.x.x  ready in 500ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### Step 7: Open in Your Browser

Open your browser (Chrome recommended) and go to:

**http://localhost:3000**

That's it! The app is running. 🎉

### To Stop the App

Go back to the terminal and press `Ctrl + C`.

---

## Project Structure

```
agristock-pro/
├── index.html             ← Entry HTML page
├── package.json           ← Dependencies & scripts
├── vite.config.ts         ← Build tool config
├── tsconfig.json          ← TypeScript config
├── CHANGELOG.md           ← List of all bug fixes applied
├── README.md              ← You are here!
└── src/
    ├── index.tsx           ← React entry point
    ├── App.tsx             ← Main app shell + navigation
    ├── db.ts               ← IndexedDB database layer
    ├── types.ts            ← TypeScript interfaces
    ├── constants.ts        ← Default settings
    ├── calculations.ts     ← Forecasting & reorder logic
    └── pages/
        ├── Dashboard.tsx   ← Overview cards & risk summary
        ├── Alerts.tsx      ← Alert center + WhatsApp integration
        ├── Inventory.tsx   ← Lot management (receive stock)
        ├── Items.tsx       ← Product master catalog
        ├── OrderPlan.tsx   ← Auto-generated reorder plan
        ├── SalesEntry.tsx  ← Monthly demand input
        ├── SettingsPage.tsx← Config, backup, restore
        └── StockTake.tsx   ← Physical stock count page
```

---

## Key Features

- **Lot-Based Tracking:** Every batch has its own expiry date and quantity
- **Expiry Alerts:** Automatic warnings when stock is approaching expiry
- **Low Stock Alerts:** Triggered when days-cover falls below threshold
- **Demand Forecasting:** Simple 6-month average (configurable)
- **Reorder Calculator:** Suggests order quantities with freshness caps
- **WhatsApp Alerts:** Send inventory alerts via WhatsApp
- **Offline-First:** Works without internet — data stored in browser
- **Backup/Restore:** Export and import your full database as JSON

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm: command not found` | Node.js isn't installed. Go to https://nodejs.org |
| `npm install` fails | Try deleting `node_modules` folder and `package-lock.json`, then run `npm install` again |
| Port 3000 already in use | The app (or something else) is already running on that port. Close it, or change the port in `vite.config.ts` |
| Blank page in browser | Open browser console (F12) and check for errors. Make sure the URL is `http://localhost:3000` |
| Data disappeared | Data is stored per-browser. If you switched browsers or cleared data, it's gone. Use the Backup feature in Settings! |
