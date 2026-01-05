# Elavon API vs CardPointe API Comparison Checklist

**Purpose:** Evaluate Elavon's API documentation to assess migration complexity from CardPointe  
**Date:** December 22, 2025  
**Current Setup:** MS Access VBA → CardPointe Bolt API → Ingenico iPP320

---

## Your Current CardPointe Integration

### Current Architecture:
- **API Endpoints:**
  - CardConnect REST: `https://boltgw.cardconnect.com/cardconnect/rest/`
  - Bolt API: `https://bolt.cardpointe.com/api/`
- **Authentication:** Basic Auth (username:password base64 encoded)
- **Request Format:** JSON
- **Response Format:** JSON
- **Terminal Connection:** Bolt API connects to iPP320 via HSN (Hardware Serial Number)
- **Key Functions:**
  - `Bolt_ping()` - Connect to terminal
  - `VOID()` - Void transactions
  - `GetCredentials()` - Load credentials from Bolt.txt
  - `Parse_JSON()` - Parse API responses

### Current Code Pattern (from your VBA):
```vba
' Authentication
sAuth = Base64EncodeString(UserName & ":" & Password)
.setRequestHeader "Authorization", bAuth

' Request
.setRequestHeader "Content-Type", "application/json"
json = "{" & Quotes("merchantId") & ": " & Quotes(Bolt_MerchantID) & ","
json = json & Quotes("hsn") & ": " & Quotes(Bolt_HSN) & ","
.Send (json)

' Response
Parse_JSON(.responseText)
```

---

## What to Check in Elavon's API Documentation

### 1. Authentication Method ✅ **CRITICAL**

**Check:** How does Elavon authenticate API requests?

**Current (CardPointe):**
- Basic Authentication (Base64 encoded username:password)
- Header: `Authorization: Basic <base64(username:password)>`

**What to Look For in Elavon Docs:**
- [ ] Does Elavon use Basic Auth? (Similar to CardPointe = Easy migration)
- [ ] Does Elavon use API keys? (Different format, but still manageable)
- [ ] Does Elavon use OAuth 2.0? (More complex, but doable)
- [ ] Does Elavon use merchant ID + user ID + PIN? (Common for Elavon/Converge)

**Migration Impact:**
- **Basic Auth:** ✅ Easy - just change credentials
- **API Keys:** ⚠️ Moderate - update header format
- **OAuth 2.0:** ⚠️ More complex - need token refresh logic

---

### 2. Request Format ✅ **CRITICAL**

**Check:** What format does Elavon use for API requests?

**Current (CardPointe):**
- Content-Type: `application/json`
- Request body: JSON format
- Example: `{"merchantId": "123", "amount": "10.00", ...}`

**What to Look For in Elavon Docs:**
- [ ] Does Elavon accept JSON? (Similar to CardPointe = Easy)
- [ ] Does Elavon use form-encoded? (Different format, but manageable)
- [ ] Does Elavon use XML? (Different, but doable)
- [ ] What are the required fields for a sale transaction?

**Migration Impact:**
- **JSON:** ✅ Easy - just update field names
- **Form-encoded:** ⚠️ Moderate - change request format
- **XML:** ⚠️ More complex - different parsing

---

### 3. Response Format ✅ **CRITICAL**

**Check:** What format does Elavon return?

**Current (CardPointe):**
- Response: JSON
- Fields: `respcode`, `resptext`, `retref`, `amount`, etc.

**What to Look For in Elavon Docs:**
- [ ] Does Elavon return JSON? (Similar = Easy)
- [ ] What are the field names? (respcode vs response_code?)
- [ ] What are the success/error codes?
- [ ] How are errors structured?

**Migration Impact:**
- **JSON with similar structure:** ✅ Easy - update field names
- **JSON with different structure:** ⚠️ Moderate - rewrite parsing
- **XML or other format:** ⚠️ More complex - new parser needed

---

### 4. Terminal Integration (iPP320) ⭐ **MOST CRITICAL**

**Check:** How does Elavon connect to payment terminals?

**Current (CardPointe):**
- Uses Bolt API: `https://bolt.cardpointe.com/api/v2/connect`
- Connects via HSN (Hardware Serial Number)
- Terminal-specific API for card-present transactions

**What to Look For in Elavon Docs:**
- [ ] Does Elavon support Ingenico iPP320 terminals?
- [ ] What is the terminal connection method?
- [ ] Is there a separate terminal API or endpoint?
- [ ] How do you send card-present transactions?
- [ ] Do they use HSN or a different identifier?

**Migration Impact:**
- **iPP320 supported with similar connection:** ✅ Easy - update endpoint
- **iPP320 supported with different method:** ⚠️ Moderate - rewrite connection logic
- **iPP320 NOT supported:** ❌ **BLOCKER** - Would need new hardware

**This is the MOST IMPORTANT check** - if iPP320 isn't supported, Elavon may not be viable for your 75% card-present transactions.

---

### 5. Transaction Endpoints

**Check:** What endpoints does Elavon provide?

**Current (CardPointe):**
- Auth: `https://boltgw.cardconnect.com/cardconnect/rest/auth`
- Void: `https://boltgw.cardconnect.com/cardconnect/rest/void`
- Refund: `https://boltgw.cardconnect.com/cardconnect/rest/refund`

**What to Look For in Elavon Docs:**
- [ ] Sale/Auth endpoint URL
- [ ] Void endpoint URL
- [ ] Refund endpoint URL
- [ ] Query/Status endpoint (if needed)

**Migration Impact:**
- **Similar REST endpoints:** ✅ Easy - just update URLs
- **Different structure:** ⚠️ Moderate - update all endpoint calls

---

### 6. Void/Refund Functionality

**Check:** How does Elavon handle transaction reversals?

**Current (CardPointe):**
- Uses `VOID()` function
- Endpoint: `/void/`
- Requires `retref` (retrieval reference)

**What to Look For in Elavon Docs:**
- [ ] Does Elavon have a void endpoint?
- [ ] What field name do they use? (retref, transactionId, orderId?)
- [ ] Can you void same-day transactions?
- [ ] What's the refund process?

**Migration Impact:**
- **Similar void structure:** ✅ Easy - update field names
- **Different void method:** ⚠️ Moderate - rewrite void logic

---

### 7. Error Handling

**Check:** How does Elavon structure error responses?

**Current (CardPointe):**
- JSON response with `respcode` and `resptext`
- Example: `{"respcode": "00", "resptext": "Approval"}`

**What to Look For in Elavon Docs:**
- [ ] What are success codes? (00, 200, "approved"?)
- [ ] What are error codes?
- [ ] How are errors structured in response?
- [ ] Are there HTTP status codes or just response body codes?

**Migration Impact:**
- **Similar error structure:** ✅ Easy - update code checks
- **Different error format:** ⚠️ Moderate - rewrite error handling

---

### 8. Saved Token Support

**Check:** How does Elavon handle saved payment methods?

**Current (CardPointe):**
- You use saved tokens for 25% of transactions
- Tokens stored and reused

**What to Look For in Elavon Docs:**
- [ ] Does Elavon support tokenization?
- [ ] How do you create tokens?
- [ ] How do you use tokens for subsequent transactions?
- [ ] What's the token format/structure?

**Migration Impact:**
- **Token support:** ✅ Essential for your 25% tokenized transactions
- **No token support:** ❌ **BLOCKER** - Would need different approach

---

## Quick Comparison Checklist

When reviewing Elavon's API docs, check these specific items:

### ✅ **Easy Migration Indicators:**
- [ ] Basic Auth or API key authentication (not OAuth)
- [ ] JSON request/response format
- [ ] REST API structure (similar to CardPointe)
- [ ] iPP320 terminal support confirmed
- [ ] Tokenization support for saved cards
- [ ] Similar endpoint structure (auth, void, refund)

### ⚠️ **Moderate Complexity Indicators:**
- [ ] Different authentication method (but still HTTP-based)
- [ ] Form-encoded requests (instead of JSON)
- [ ] Different field names (but same concepts)
- [ ] Different terminal connection method (but iPP320 still supported)

### ❌ **High Complexity/Blockers:**
- [ ] iPP320 NOT supported (would need new hardware)
- [ ] No tokenization support (would need different approach for 25% of transactions)
- [ ] OAuth 2.0 with complex token refresh (more code changes)
- [ ] XML-only API (different parsing needed)

---

## Questions to Ask Elavon Support

When you contact Elavon, ask these specific questions:

1. **"Do you support Ingenico iPP320 payment terminals?"**
   - If NO → Ask what terminals they support
   - If YES → Ask about connection method

2. **"What authentication method does your API use?"**
   - Basic Auth, API keys, or OAuth?

3. **"What format are API requests/responses?"**
   - JSON, form-encoded, or XML?

4. **"Do you have a terminal-specific API for card-present transactions?"**
   - Similar to CardPointe's Bolt API?

5. **"How do you handle tokenization for saved payment methods?"**
   - Can you store and reuse tokens?

6. **"Can you provide sample API requests/responses?"**
   - For sale, void, and tokenized transactions

7. **"What's the typical integration time for MS Access VBA?"**
   - They may have experience with similar integrations

---

## Expected Migration Complexity

Based on typical Elavon/Converge APIs:

### **Best Case Scenario (Similar to CardPointe):**
- ✅ Basic Auth or API keys
- ✅ JSON requests/responses
- ✅ iPP320 supported
- ✅ Similar REST endpoints
- **Estimated Time:** 2-4 hours
- **Complexity:** Low-Moderate

### **Moderate Scenario (Some Differences):**
- ⚠️ Different auth method (but HTTP-based)
- ⚠️ Form-encoded requests
- ✅ iPP320 supported
- ⚠️ Different field names
- **Estimated Time:** 4-6 hours
- **Complexity:** Moderate

### **Worst Case Scenario (Significant Differences):**
- ❌ iPP320 NOT supported → **BLOCKER**
- ⚠️ OAuth 2.0 authentication
- ⚠️ XML-only API
- ⚠️ Completely different structure
- **Estimated Time:** 8-16 hours (if even possible)
- **Complexity:** High

---

## API Review Results ✅ **COMPLETE**

**Review Date:** December 22, 2025

### Key Findings:

1. **✅ iPP320 Terminal Support:** **CONFIRMED** - Ingenico iPP320 IS supported through Elavon's Converge platform
2. **✅ Request Format:** JSON (same as CardPointe)
3. **✅ Response Format:** JSON (same as CardPointe)
4. **⚠️ Authentication:** Merchant ID + User ID + PIN (different from Basic Auth, but still simple)
5. **✅ Void/Refund:** Supported (similar to CardPointe)
6. **⚠️ Tokenization:** Likely supported (verify in API docs)

**Migration Complexity:** **MODERATE** (2-4 hours estimated)

**See:** `Elavon_API_Review_Analysis.md` for complete analysis

---

## Next Steps

1. **Contact Elavon/Converge Support:**
   - Request exact pricing quote for your volume
   - Request API documentation
   - Request Converge Peripheral Device Setup Guide for iPP320
   - Request test/sandbox credentials
   - Verify tokenization support

2. **Compare to CardPointe Offer:**
   - CardPointe offer: 3.59% effective rate, $2,028/year savings, zero migration
   - Elavon potential: ~3.01% effective rate, $3,440/year savings, 2-4 hours migration
   - **Net benefit of switching:** ~$1,412/year additional savings

3. **Make Final Decision:**
   - If Elavon rate ≤3.1%: Switch is worthwhile
   - If Elavon rate >3.2%: CardPointe offer may be better
   - Factor in migration time vs. savings

---

## Decision Framework

**Accept CardPointe Offer If:**
- Elavon migration looks complex (>6 hours)
- iPP320 support unclear or problematic
- Your time is worth more than $1,412/year savings
- You prefer zero risk/hassle

**Switch to Elavon If:**
- iPP320 is confirmed supported
- Migration looks straightforward (2-4 hours)
- API structure is similar to CardPointe
- Additional $1,412/year savings is worth the effort

**Counter-Offer CardPointe If:**
- Elavon looks viable but you prefer staying
- You can use Elavon quote as leverage
- CardPointe might match or get closer to Elavon rates

---

