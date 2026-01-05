# Elavon API Review & Migration Analysis

**Date:** December 22, 2025  
**Current Setup:** MS Access VBA → CardPointe Bolt API → Ingenico iPP320  
**Target:** Elavon/Converge Payment Gateway API

---

## Executive Summary

### ✅ **ELAVON IS VIABLE FOR MIGRATION**

**Key Finding:** Ingenico iPP320 **IS SUPPORTED** through Elavon's Converge platform - this removes the primary blocker for switching.

**Migration Complexity:** **MODERATE** (2-4 hours estimated)
- Similar API structure to CardPointe
- JSON request/response format (same as CardPointe)
- Different authentication method (but still simple)
- iPP320 terminal support confirmed


---

## Detailed API Comparison

### 1. Authentication Method ⚠️ **DIFFERENT BUT SIMILAR**

**CardPointe (Current):**
- Basic Authentication (Base64 encoded username:password)
- Header: `Authorization: Basic <base64(username:password)>`
- Credentials: Username, Password

**Elavon/Converge:**
- Uses **Merchant ID + User ID + PIN** (not Basic Auth)
- Credentials: Merchant ID, User ID, PIN
- May use API keys or credential-based authentication

**Migration Impact:** ⚠️ **MODERATE**
- Need to update `GetCredentials()` function
- Different credential format (3 values vs. 2)
- Still simple HTTP-based authentication (not OAuth)
- **Estimated Change:** Update credential loading, update auth header format

**VBA Code Change Example:**
```vba
' Current (CardPointe)
sAuth = Base64EncodeString(UserName & ":" & Password)
.setRequestHeader "Authorization", "Basic " & sAuth

' Elavon (Example - verify exact format)
' May use: Merchant ID, User ID, PIN in request body or headers
' Check Elavon docs for exact authentication method
```

---

### 2. Terminal Integration (iPP320) ✅ **SUPPORTED**

**CardPointe (Current):**
- Uses Bolt API: `https://bolt.cardpointe.com/api/v2/connect`
- Connects via HSN (Hardware Serial Number)
- Terminal-specific API for card-present transactions

**Elavon/Converge:**
- ✅ **Ingenico iPP320 IS SUPPORTED** through Converge platform
- Uses Converge Peripheral Device integration
- EMV and NFC-enabled
- Supports: magstripe, chip cards, manual entry, contactless (Apple Pay)
- Requires: Converge Peripheral Device Installation and Setup Guide

**Migration Impact:** ✅ 
- iPP320 hardware can be kept (no new hardware needed)
- Different connection method (Converge Peripheral vs. Bolt)
- Need to update terminal connection function
- **Estimated Change:** Rewrite `Bolt_ping()` equivalent for Converge terminal connection

**Key Resources:**
- Converge Peripheral Device Installation and Setup Guide
- Converge Developer Guide
- Terminal configuration will be different from Bolt API


---

### 3. Request Format ✅ **SIMILAR (JSON)**

**CardPointe (Current):**
- Content-Type: `application/json`
- Request body: JSON format
- Example: `{"merchantId": "123", "amount": "10.00", ...}`

**Elavon/Converge:**
- ✅ **JSON format** (same as CardPointe)
- Content-Type: `application/json`
- Request structure includes: apiVersion, apiType, userName, userPassKey, merchantId, transactionType, amount, etc.

**Migration Impact:** ✅ **EASY**
- Same JSON format means minimal changes to request construction
- Field names will differ (merchantId vs. different field names)
- JSON parsing logic can be reused (with field name updates)
- **Estimated Change:** Update field names in JSON request construction

**Example Elavon Request Structure:**
```json
{
  "apiVersion": "1.0.1",
  "apiType": "pxyhpci",
  "userName": "your_api_username",
  "userPassKey": "your_api_passkey",
  "merchantId": "your_merchant_id",
  "transactionType": "sale",
  "amount": "100.00",
  "currency": "USD",
  ...
}
```

---

### 4. Response Format ✅ **SIMILAR (JSON)**

**CardPointe (Current):**
- Response: JSON
- Fields: `respcode`, `resptext`, `retref`, `amount`, etc.

**Elavon/Converge:**
- ✅ **JSON format** (same as CardPointe)
- Response structure will have different field names
- Success/error codes will differ

**Migration Impact:** ✅ **EASY**
- Same JSON format means `Parse_JSON()` function can be reused
- Need to update field name references (respcode vs. response_code, etc.)
- Need to update success/error code checks
- **Estimated Change:** Update field name references in JSON parsing

---

### 5. Transaction Endpoints ⚠️ **DIFFERENT URLs, SIMILAR STRUCTURE**

**CardPointe (Current):**
- Auth: `https://boltgw.cardconnect.com/cardconnect/rest/auth`
- Void: `https://boltgw.cardconnect.com/cardconnect/rest/void`
- Refund: `https://boltgw.cardconnect.com/cardconnect/rest/refund`

**Elavon/Converge:**
- Base URL: Likely `https://api.convergepay.com/` or `https://www.myvirtualmerchant.com/VirtualMerchant/api/`
- Sale endpoint: Different URL structure
- Void endpoint: Different URL structure
- Refund endpoint: Different URL structure

**Migration Impact:** ⚠️ **MODERATE**
- Need to update all endpoint URLs
- REST API structure appears similar
- **Estimated Change:** Update all API endpoint URLs in code

---

### 6. Void/Refund Functionality ✅ **SUPPORTED**

**CardPointe (Current):**
- Uses `VOID()` function
- Endpoint: `/void/`
- Requires `retref` (retrieval reference)
- Voids must be same-day

**Elavon/Converge:**
- ✅ **Void supported** (same-day transactions)
- ✅ **Refund supported** (after settlement)
- Different endpoint structure
- Different field names (transactionId vs. retref)

**Migration Impact:** ⚠️ **MODERATE**
- Similar functionality (void same-day, refund after settlement)
- Different endpoint and field names
- **Estimated Change:** Update `VOID()` function with new endpoint and field names

**Key Differences:**
- **Void:** Cancels transaction before settlement (same-day only)
- **Refund:** Returns funds after settlement
- Timing rules are similar to CardPointe

---

### 7. Tokenization (Saved Cards) ✅ **LIKELY SUPPORTED**

**CardPointe (Current):**
- Supports tokenization 
- Tokens stored and reused

**Elavon/Converge:**
- ✅ **Tokenization typically supported** (verify in API docs)
- Converge platform usually supports saved payment methods
- Token format/structure will differ

**Migration Impact:** ⚠️ **MODERATE**
- Need to verify token creation/usage endpoints
- Token format will be different
- **Estimated Change:** Update token handling logic

**Action Required:** Verify tokenization support in Elavon API documentation

---

## Migration Complexity Assessment

### Overall Rating: **MODERATE** (2-4 hours)

**Breakdown:**
- ✅ **Easy (Low Risk):** JSON format, similar API structure, iPP320 supported
- ⚠️ **Moderate (Manageable):** Different auth method, different endpoints, different field names


### Estimated Time by Component:

| Component | Current Complexity | Estimated Time |
|-----------|-------------------|----------------|
| **Authentication** | Moderate | 30-60 min |
| **Terminal Connection** | Moderate | 45-90 min |
| **Sale Transaction** | Easy-Moderate | 30-60 min |
| **Void Function** | Moderate | 30-60 min |
| **Token Handling** | Moderate | 30-60 min |
| **Testing & Debugging** | Moderate | 30-60 min |
| **Total** | **Moderate** | **2-4 hours** |

---

## Code Migration Checklist

### Functions to Update:

1. **`GetCredentials()`** ⚠️
   - [ ] Update to load Merchant ID, User ID, PIN (instead of Username, Password)
   - [ ] Update credential file format (Bolt.txt → Elavon.txt)
   - [ ] Update authentication header/request format

2. **`Bolt_ping()` → `Elavon_Connect()`** ⚠️
   - [ ] Rewrite terminal connection function
   - [ ] Update to use Converge Peripheral Device method
   - [ ] Update endpoint URL
   - [ ] Update request format for terminal connection

3. **Sale/Charge Function** ⚠️
   - [ ] Update endpoint URL
   - [ ] Update request field names (merchantId, amount, etc.)
   - [ ] Update JSON request structure
   - [ ] Update response parsing (field names)

4. **`VOID()` Function** ⚠️
   - [ ] Update endpoint URL
   - [ ] Update field names (transactionId vs. retref)
   - [ ] Update request format
   - [ ] Update response parsing

5. **Token Handling** ⚠️
   - [ ] Verify tokenization endpoints in Elavon docs
   - [ ] Update token creation logic
   - [ ] Update token usage in transactions
   - [ ] Update token storage/retrieval

6. **`Parse_JSON()` Function** ⚠️
   - [ ] Update field name references
   - [ ] Update success/error code checks
   - [ ] Test with Elavon response format

---

## Critical Questions to Resolve

Before finalizing migration decision, verify:

1. **✅ iPP320 Support:** CONFIRMED - Supported through Converge
2. **⚠️ Exact Authentication Method:** Need to verify - Merchant ID + User ID + PIN format
3. **⚠️ API Base URL:** Need exact Converge API endpoint URLs
4. **⚠️ Terminal Connection Method:** Need Converge Peripheral Device setup details
5. **⚠️ Tokenization Support:** Verify token creation/usage endpoints
6. **⚠️ Test Environment:** Need test/sandbox credentials for development

---

## Comparison: CardPointe Offer vs. Elavon Switch

### CardPointe Offer (After Negotiation):
- **Effective Rate:** 3.59%
- **Annual Cost:** ~$8,762
- **Annual Savings vs. Current:** $2,028
- **Migration Time:** 0 hours (no changes)
- **Risk:** None
- **Hardware:** Keep iPP320 ✅

### Elavon/Converge:
- **Effective Rate:** ~3.01% (estimated)
- **Annual Cost:** ~$7,350
- **Annual Savings vs. Current:** $3,440
- **Additional Savings vs. CardPointe Offer:** **$1,412/year**
- **Migration Time:** 2-4 hours
- **Risk:** Low (similar API structure, iPP320 supported)
- **Hardware:** Keep iPP320 ✅

### Net Benefit Analysis:

**If You Switch to Elavon:**
- **Additional Savings:** $1,412/year
- **Migration Cost:** 2-4 hours of your time
- **ROI:** $1,412 ÷ 4 hours = **$353/hour** (very high ROI)
- **Payback Period:** Immediate (savings start after migration)

**Decision Factors:**
- ✅ **Switch if:** $1,412/year is worth 2-4 hours of work
- ✅ **Switch if:** You're comfortable with code changes
- ⚠️ **Stay with CardPointe if:** You value zero risk/hassle over additional savings
- ⚠️ **Stay with CardPointe if:** Your time is worth more than $353/hour

---

## Recommendation

### **Elavon is a Viable Alternative - Consider Switching**

**Why:**
1. ✅ **iPP320 supported** - Removes primary blocker
2. ✅ **Similar API structure** - Moderate migration complexity (2-4 hours)
3. ✅ **JSON format** - Same as CardPointe, easy to adapt
4. ✅ **Additional $1,412/year savings** - Worth the migration effort
5. ✅ **No hardware investment** - Keep existing iPP320

**Migration Strategy:**
1. **Get Elavon API credentials** (test and live)
2. **Review Converge Developer Guide** for exact API details
3. **Get Converge Peripheral Device Setup Guide** for iPP320 configuration
4. **Test in sandbox** before going live
5. **Plan 2-4 hour migration window** for code updates

**Risk Assessment:**
- **Technical Risk:** Low (similar API structure)
- **Hardware Risk:** None (iPP320 supported)
- **Business Risk:** Low (can test thoroughly before switching)
- **Timeline Risk:** Low (2-4 hours is manageable)

---

## Next Steps

### Immediate Actions:

1. **Contact Elavon/Converge Support:**
   - Request API documentation
   - Request Converge Peripheral Device Setup Guide
   - Request test/sandbox credentials
   - Confirm iPP320 setup process
   - Ask about tokenization support

2. **Get Pricing Quote:**
   - Request specific rates for your volume ($20K/month)
   - Verify effective rate estimate (3.01%)
   - Check for any additional fees
   - Compare to CardPointe's 3.59% offer

3. **Review API Documentation:**
   - Check exact authentication method
   - Verify endpoint URLs
   - Review request/response examples
   - Check terminal integration details

4. **Make Decision:**
   - If Elavon rate is ~3.01% or better → Switch is worthwhile
   - If Elavon rate is >3.2% → CardPointe offer may be better
   - Factor in migration time vs. savings

---

## Updated Decision Framework

### Accept CardPointe Offer If:
- Elavon's actual rate is >3.2% (not much better than CardPointe)
- You prefer zero risk/hassle
- Migration looks more complex than 2-4 hours
- Your time is worth more than $353/hour

### Switch to Elavon If:
- Elavon's rate is ≤3.1% (significant savings)
- iPP320 setup is straightforward
- API documentation is clear
- You're comfortable with 2-4 hour migration
- Additional $1,412/year savings is worth the effort

### Counter-Offer CardPointe If:
- Elavon confirms ~3.01% rate
- Use Elavon quote as leverage
- Ask CardPointe to match or beat Elavon
- Best of both worlds: Better rates + no migration

---

## Key Findings Summary

✅ **iPP320 IS SUPPORTED** - This is the critical finding that makes Elavon viable

✅ **JSON API** - Same format as CardPointe, easier migration

⚠️ **Different Auth Method** - Merchant ID + User ID + PIN (not Basic Auth), but still simple

⚠️ **Different Endpoints** - Need to update URLs, but similar REST structure

✅ **Similar Functionality** - Sale, void, refund all supported

**Bottom Line:** Elavon is a viable alternative. The 2-4 hour migration effort is reasonable for an additional $1,412/year in savings. The decision comes down to:
1. Elavon's actual quoted rate
2. Your comfort level with code migration
3. Whether $1,412/year is worth 2-4 hours of work

---

**Next Step:** Contact Elavon/Converge to get:
1. Exact pricing quote
2. API documentation
3. iPP320 setup guide
4. Test credentials

Then compare to CardPointe's offer and make final decision.
