# Firebase Entry Notification System - Gmail Setup Guide

## Overview

This system sends hourly email digests when new entries are added to Firebase Firestore `tripCompletions` collection. It uses Gmail SMTP for email delivery via Nodemailer.

## Configuration

- **Email Recipient:** sbschram@gmail.com
- **Frequency:** Hourly (batched digest)
- **Content:** Trip IDs only
- **Email Provider:** Gmail

## Setup Steps

### 1. Enable 2-Factor Authentication on Gmail

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already enabled
3. Complete the setup process

### 2. Generate App-Specific Password

1. Go to https://myaccount.google.com/apppasswords
2. Select **App:** Mail
3. Select **Device:** Other (Custom name)
4. Enter: `JetLagPro Notifications`
5. Click **Generate**
6. **Copy the 16-character password** (you'll only see it once!)
   - It looks like: `abcd efgh ijkl mnop`
   - **Remove spaces** when using it (use: `abcdefghijklmnop`)

### 3. Install Dependencies

```bash
cd functions
npm install
```

This will install the `nodemailer` package.

### 4. Set Firebase Environment Variables

Set your Gmail app password using Firebase Secrets (recommended):

```bash
# Set Gmail app password
firebase functions:secrets:set GMAIL_APP_PASSWORD
# Paste your 16-character app password when prompted (remove spaces)
```

**Optional:** Set Gmail user (defaults to sbschram@gmail.com if not set):

```bash
firebase functions:secrets:set GMAIL_USER
# Enter: sbschram@gmail.com
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

## Email Template Customization

To customize the email content, edit `functions/index.js` in the `hourlyDigestNotification` function:

```javascript
const emailBody = `New JetLagPro entries detected:

${tripIds}

Total: ${newTrips.length}} trip(s)

---
JetLagPro Research Analytics
Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}`;
```
