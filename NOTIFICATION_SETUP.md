# Firebase Entry Notification System - Gmail Setup Guide

## Overview

This system sends hourly email digests when new entries are added to Firebase Firestore `tripCompletions` collection. It uses Gmail SMTP for email delivery via Nodemailer.

## Configuration

- **Email Recipient:** sbschram@gmail.com
- **Frequency:** Hourly (batched digest)
- **Content:** Trip IDs for new trips AND survey completions
- **Email Provider:** Gmail

## Setup Steps

### 1. Enable 2-Factor Authentication on Gmail

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already enabled
3. Complete the setup process

### 2. Generate App-Specific Password

1. Go to https://myaccount.google.com/apppasswords
2. In the **App name** field, type: `JetLagPro Notifications`
3. Click **Create**
4. Google will show you a 16-character password like this:

   ```
   ┌─────────────────────────────────────┐
   │  Your app password for your device  │
   │                                     │
   │      abcd efgh ijkl mnop            │
   │                                     │
   │  You won't be able to see this     │
   │  password again, so make sure      │
   │  to save it now.                   │
   └─────────────────────────────────────┘
   ```

5. **Copy this password** - you'll only see it once!
6. **Remove the spaces** when using it in Step 4:
   - Displayed: `abcd efgh ijkl mnop`
   - Use: `abcdefghijklmnop`

### 3. Install Dependencies

```bash
cd functions
npm install
```

This will install the `nodemailer` package.

### 4. Set Firebase Environment Variables

Set your Gmail app password using Firebase config:

```bash
firebase functions:config:set gmail.password="abcdefghijklmnop"
```

**Note:** Replace `abcdefghijklmnop` with your actual 16-character password **without spaces**

Example with your password:
```bash
firebase functions:config:set gmail.password="cqtdvgvglfqutiru"
```

You should see:
```
✔ Functions config updated.
Please deploy your functions for the change to take effect
```

---

**Optional:** Set Gmail user (defaults to sbschram@gmail.com if not set):

```bash
firebase functions:config:set gmail.user="sbschram@gmail.com"
```

### 5. Deploy Cloud Function

```bash
firebase deploy --only functions:hourlyDigestNotification
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

### 6. Verify Deployment

1. Check Firebase Console → Functions
2. Confirm `hourlyDigestNotification` is deployed
3. Check Cloud Scheduler (Google Cloud Console) - it should create the schedule automatically

## Testing

### Test Email Delivery

1. Create a test entry in Firebase `tripCompletions` collection
2. Wait for the next hourly run (or manually trigger)
3. Check sbschram@gmail.com for the digest email

## Monitoring

### Check Function Logs

```bash
firebase functions:log --only hourlyDigestNotification
```

Or view in Firebase Console → Functions → hourlyDigestNotification → Logs

### Check Notification Settings

The function stores last notification time in:
- Collection: `_system`
- Document: `notificationSettings`

View in Firebase Console → Firestore to see:
- `lastNotificationTime`: Timestamp of last notification
- `lastCheckTime`: Timestamp of last check
- `lastCheckCount`: Number of trips found in last check

## Troubleshooting

### "Authentication failed" or "Invalid login"

1. **Ensure 2FA is enabled:**
   - Go to https://myaccount.google.com/security
   - Verify 2-Step Verification is ON

2. **Use app-specific password (not regular password):**
   - Regular Gmail password won't work
   - Must generate app-specific password: https://myaccount.google.com/apppasswords

3. **Check password format:**
   - Remove spaces from app password
   - Should be 16 characters: `abcdefghijklmnop`

4. **Verify environment variable:**
   ```bash
   firebase functions:config:get
   ```
   Or check secrets in Firebase Console → Functions → Secrets

### Emails Not Sending

1. **Check Gmail credentials:**
   - Verify `GMAIL_APP_PASSWORD` secret is set correctly
   - Verify app password is valid (try generating a new one)

2. **Check function logs:**
   ```bash
   firebase functions:log --only hourlyDigestNotification
   ```
   Look for error messages

3. **Test Gmail connection:**
   - Try logging in with app password at https://mail.google.com
   - Verify app password still works

### No New Trips Detected

1. **Check auditLog Collection:**
   - Ensure `auditLoggerCreate` function is working
   - Verify CREATE operations are being logged

2. **Check Notification Settings:**
   - View `_system/notificationSettings` in Firestore
   - Verify `lastNotificationTime` is set correctly

3. **Check Function Schedule:**
   - Verify Cloud Scheduler job exists
   - Check schedule: `0 * * * *` (every hour)

### Function Not Running

1. **Check Cloud Scheduler:**
   - Go to Google Cloud Console → Cloud Scheduler
   - Verify job exists and is enabled
   - Check last execution time

2. **Check Function Status:**
   - Firebase Console → Functions
   - Verify function is deployed and active

## Gmail Limits

- **Daily sending limit:** ~500 emails/day
- **Rate limit:** ~100 emails/hour per user
- **For research data volume:** Free tier is sufficient

## Cost Considerations

- **Gmail:** Free
- **Firebase Cloud Functions:** Free tier includes 2 million invocations/month
- **Cloud Scheduler:** Free tier includes 3 jobs
- **Estimated Cost:** $0/month (within free tiers)

## Email Template Example

You'll receive emails in this format:

```
Subject: JetLagPro: 2 Trips, 3 Surveys Added

New JetLagPro entries detected:

NEW TRIPS (2):
67CC2497-MXPE-251029-1622-A7F3C9E2
8A3B5C9D-LFGE-251124-1045-B2D4E6F8

SURVEY COMPLETIONS (3):
2AEB770E-LAXW-251106-1332-11ad2ccf
E7F4A825-FCOE-251009-2315-5b7c8d9e
9B2C4D6E-JFKE-251115-0845-3a5c7e9f

Total: 2 trip(s), 3 survey(s)

---
JetLagPro Research Analytics
Generated: 11/25/2025, 3:00:00 PM
```
