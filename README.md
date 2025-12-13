# 🤖 Automating Connections Bot

**Never lose touch. Automate your relationship follow-ups with this Telegram + Google Sheets bot.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pipedream](https://img.shields.io/badge/Built%20on-Pipedream-46AEF7)](https://pipedream.com)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4)](https://core.telegram.org/bots)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-API-34A853)](https://developers.google.com/sheets)

Automated contact management system that sends weekly Telegram reminders and updates Google Sheets with one click. Perfect for salespeople, networkers, and busy professionals.

## 🎥 Video Tutorials

**Full setup walkthroughs available in my public Loom folder:**

[👉 **Access All Video Tutorials Here**](https://loom.com/share/folder/e03d7706f93545f98f70654e86fed37e) 

## ✨ Features

- ✅ **Weekly check-ins** via Telegram
- ✅ **Smart overdue detection** with 3-day buffer
- ✅ **One-click contact updates** from Telegram
- ✅ **Google Sheets integration** - Your data stays with you
- ✅ **Timezone-aware** - Always uses your local time
- ✅ **Zero hosting costs** - Runs entirely on Pipedream
- ✅ **Error-resistant** - Handles failures gracefully

## 🚀 Quick Start

### 1. **Prerequisites**
- [Pipedream Account](https://pipedream.com) (free tier)
- Google Account (for Google Sheets)
- Telegram Account (for bot interactions)

### 2. Setup Google Sheets
1. Create a new Google Sheet
2. Add this header row (A1 to E1):

   `Name | Type | LastContactDate | TargetFrequency | PhoneNumber`

4. Add contacts:

    `Mom | Family | 2025-12-11 | 2 | xxx-xxx-xxxx`

6. Get your Spreadsheet ID from the URL:

    ``https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SPREADSHEET_ID/edit``

### 3. **Setup Telegram Bot**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create new bot with `/newbot`
3. Save your **Bot Token** (you'll need this later)

### 4. **Get Your Telegram Chat ID**
To get your Chat ID for sending messages:

```bash
# Replace <YOUR_BOT_TOKEN> with your actual bot token
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

Copy-paste ready (replace token):
https://api.telegram.org/botYOUR_BOT_TOKEN_HERE/getUpdates

1. Visit the URL in your browser
2. Send a message to your bot
3. Refresh the page
4. Look for `"chat":{"id":123456789}`
5. Save this Chat ID

### 5. Deploy to Pipedream
## Weekly Check-in Workflow
1. Create new Pipedream workflow
2. Add Schedule Trigger (weekly)
3. Add Node.js code step
4. Copy contents from `scripts/weekly-checkin.js`
5. Fill in variables:
- `spreadsheetId:` Your Google Sheets ID
- `telegramBotToken:` Your Telegram bot token
- `chatId:` Your Telegram Chat ID
6. Deploy workflow

## Button Handler Workflow
1. Create new Pipedream workflow
2. Add HTTP API Trigger
3. Add Node.js code step
4. Copy contents from `scripts/button-handler.js`
5. Fill in variables:
- `spreadsheetId:` Your Google Sheets ID
- `telegramBotToken:` Your Telegram bot token
6. Copy your Pipedream webhook URL from the HTTP trigger
7. Set Telegram Webhook (CRITICAL STEP):

```bash
# Replace {YOUR_BOT_TOKEN} and {YOUR_PIPEDREAM_WEBHOOK_URL}
https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook?url={YOUR_PIPEDREAM_WEBHOOK_URL}
```

Copy-paste ready (replace both placeholders):

```bash
https://api.telegram.org/botYOUR_BOT_TOKEN_HERE/setWebhook?url=YOUR_PIPEDREAM_WEBHOOK_URL_HERE
```

8. Visit this URL once to connect Telegram to your webhook
9. Deploy workflow

### 6. Test Your Setup
1. Trigger your weekly check-in workflow manually
2. Check Telegram for the message
3. Click a contact button
4. Verify Google Sheets updates automatically

