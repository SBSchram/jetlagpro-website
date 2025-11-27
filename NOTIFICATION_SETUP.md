# Firebase Entry Notification System - Gmail Setup Guide

## Overview

This system sends **real-time email notifications** when entries are added or updated in Firebase Firestore `tripCompletions` collection. It uses Gmail SMTP for email delivery via Nodemailer.

## Configuration

- **Email Recipient:** sbschram@gmail.com
- **Frequency:** Real-time (immediate notification per event)
- **Content:** Trip details for new trips AND survey completions/edits
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

Example (replace with your actual password):
```bash
firebase functions:config:set gmail.password="your-16-char-password-here"
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

### 5. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

Or deploy specific notification functions:

```bash
firebase deploy --only functions:realtimeTripNotification,realtimeSurveyNotification
```

### 6. Verify Deployment

1. Check Firebase Console → Functions
2. Confirm both functions are deployed:
   - `realtimeTripNotification` - Triggers on new trip creation
   - `realtimeSurveyNotification` - Triggers on survey completion/edit

## Testing

### Test Email Delivery

**For New Trip Notification:**
1. Complete a trip in the JetLagPro app (creates new document in `tripCompletions`)
2. Email should arrive immediately at sbschram@gmail.com
3. Subject: `JetLagPro: New Trip - [DESTINATION]`

**For Survey Notification:**
1. Complete or edit a survey via survey.html
2. Email should arrive immediately at sbschram@gmail.com
3. Subject: `JetLagPro: Survey Completed - [TRIP_ID]` or `Survey Edited - [TRIP_ID]`

## Monitoring

### Check Function Logs

```bash
firebase functions:log --only realtimeTripNotification
firebase functions:log --only realtimeSurveyNotification
```

Or view in Firebase Console → Functions → [function name] → Logs

### Monitor Activity

Check the `auditLog` collection in Firestore to see all CREATE and UPDATE operations that trigger notifications.

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
   - Verify `gmail.password` config is set correctly
   - Verify app password is valid (try generating a new one)

2. **Check function logs:**
   ```bash
   firebase functions:log --only realtimeTripNotification
   firebase functions:log --only realtimeSurveyNotification
   ```
   Look for error messages

3. **Test Gmail connection:**
   - Try logging in with app password at https://mail.google.com
   - Verify app password still works

### No Notifications Received

1. **Check auditLog Collection:**
   - Ensure `auditLoggerCreate` and `auditLoggerUpdate` functions are working
   - Verify CREATE and UPDATE operations are being logged

2. **Check Function Status:**
   - Firebase Console → Functions
   - Verify both notification functions are deployed and active
   - Check function execution logs for errors

3. **Test trigger:**
   - Create a new trip or edit a survey
   - Check auditLog to verify the operation was logged
   - Check function logs to see if trigger fired

## Gmail Limits

- **Daily sending limit:** ~500 emails/day
- **Rate limit:** ~100 emails/hour per user
- **For research data volume:** Real-time notifications should stay well within limits

## Cost Considerations

- **Gmail:** Free
- **Firebase Cloud Functions:** Free tier includes 2 million invocations/month
- **Real-time triggers:** 2 function invocations per trip (create + survey) = ~1,000 trips/month within free tier
- **Estimated Cost:** $0/month (within free tiers for typical research volume)

## Email Template Examples

### New Trip Notification

```
Subject: JetLagPro: New Trip - MXPE

New trip created:

Trip ID: 67CC2497-MXPE-251029-1622-A7F3C9E2
Destination: MXPE
Direction: Eastbound
Points Completed: 8/12
Timezone Count: 3
Survey: No

---
JetLagPro Research Analytics
11/25/2025, 3:15:42 PM
```

### Survey Completion Notification

```
Subject: JetLagPro: Survey Completed - 2AEB770E

Survey completed:

Trip ID: 2AEB770E-LAXW-251106-1332-11ad2ccf
Destination: LAXW
Direction: Westbound
Action: First-time submission

Changed fields: surveyCompleted, postFatigueSeverity, postIndigestionSeverity, ageRange, userComment

---
JetLagPro Research Analytics
11/25/2025, 4:22:18 PM
```

### Survey Edit Notification

```
Subject: JetLagPro: Survey Edited - 2330B376

Survey edited:

Trip ID: 2330B376-ISTE-251123-1544-7f579858
Destination: ISTE
Direction: Eastbound
Action: Survey edited/retaken

Changed fields: userComment, _surveyMetadata, generalAnticipated, surveySubmittedAt

---
JetLagPro Research Analytics
11/25/2025, 2:37:29 PM
```
