# Testing Guide for FreeMarker Schema Mapper

## 📦 Test Files Overview

I've created 5 test files for you to use with the tool:

| File | Purpose | Use In Tool |
|------|---------|-------------|
| `input-schema.json` | Input data structure (schema only) | Upload as **Input Schema** |
| `output-schema.json` | Output data structure (schema only) | Upload as **Output Schema** |
| `sample-input-data.json` | Real input data example | Reference/Testing |
| `sample-output-data.json` | Expected output example | Reference/Testing |
| `expected-transform.ftl` | What the tool should generate | Comparison |

---

## 🧪 Testing Scenarios

### Scenario 1: Create FTL From Scratch (No Template)

**Goal:** Test that the tool can create a complete FTL template with just schemas.

**Steps:**
1. Open `freemarker-schema-mapper.html` in browser
2. Upload `input-schema.json` as **Input Schema**
3. Upload `output-schema.json` as **Output Schema**
4. **Do NOT upload any template** (skip step 3)
5. Click "Next: Edit Mappings"
6. Start mapping fields manually or use auto-map

**Expected Results:**
- Tool extracts 15+ input fields
- Tool extracts 18+ output fields
- Empty mapping table (start from scratch)
- Can add mappings one by one
- Generates valid FTL in step 3

---

### Scenario 2: Auto-Map Fields

**Goal:** Test the automatic field matching feature.

**Steps:**
1. Upload both schemas (same as Scenario 1)
2. Click "Auto-Map Fields" button in Step 1
3. Review which fields were auto-mapped

**Expected Auto-Matches:**
```
✓ clientReference ← customerId (exact match: "customerId")
✓ profile.dob ← personalInfo.dateOfBirth (fuzzy: "dob" vs "dateOfBirth")
✓ notifications.locale ← preferences.preferredLanguage (fuzzy: "language")
```

**Fields Needing Manual Mapping:**
```
✗ profile.fullName (needs firstName + lastName concatenation)
✗ profile.contact.primaryEmail (doesn't match "email" pattern)
✗ profile.contact.mobile (doesn't match "phoneNumber")
✗ financialAccounts.* (array transformation)
✗ totalBalance (needs calculation)
✗ metadata.* (computed fields)
```

---

### Scenario 3: Complex Mappings

**Goal:** Test different transformation types.

#### 3A. Simple Direct Mapping
```
Target: clientReference
Source: customerId
Transformation: Direct

Expected FTL:
"clientReference": "${customerId}"
```

#### 3B. Concatenation
```
Target: profile.fullName
Source: personalInfo.firstName + personalInfo.lastName
Transformation: Concatenate

Expected FTL:
"fullName": "${personalInfo.firstName} ${personalInfo.lastName}"
```

#### 3C. Conditional Mapping
```
Target: profile.contact.mobile
Source: personalInfo.phoneNumber
Transformation: Conditional (if exists)

Expected FTL:
"mobile": "<#if personalInfo.phoneNumber??>${personalInfo.phoneNumber}<#else>N/A</#if>"
```

#### 3D. Nested Object Mapping
```
Target: profile.contact.primaryEmail
Source: personalInfo.email
Transformation: Direct

Expected FTL (maintains nesting):
"contact": {
  "primaryEmail": "${personalInfo.email}"
}
```

---

## 📋 Field Mapping Reference

Here's a complete mapping guide based on your schemas:

### Simple Mappings (Direct)

| Output Field | Input Field | Notes |
|--------------|-------------|-------|
| `clientReference` | `customerId` | Direct copy |
| `profile.dob` | `personalInfo.dateOfBirth` | Direct copy |
| `profile.contact.primaryEmail` | `personalInfo.email` | Nested mapping |
| `profile.contact.mobile` | `personalInfo.phoneNumber` | Nested mapping |
| `notifications.locale` | `preferences.preferredLanguage` | Direct copy |

### Complex Mappings

| Output Field | Mapping Logic | Type |
|--------------|---------------|------|
| `profile.fullName` | `firstName + " " + lastName` | Concatenate |
| `financialAccounts[].accountId` | Loop: `accounts[].accountNumber` | Array iteration |
| `financialAccounts[].type` | Loop + Transform: `accounts[].accountType.toUpperCase()` | Array + function |
| `financialAccounts[].currentBalance.amount` | Loop: `accounts[].balance` | Nested array |
| `financialAccounts[].currentBalance.currencyCode` | Loop: `accounts[].currency` | Nested array |
| `financialAccounts[].isActive` | Conditional: `status == "ACTIVE"` | Boolean logic |
| `totalBalance.amount` | Calculate: Sum of all `accounts[].balance` | Calculation |
| `notifications.channels[]` | Conditional array: Based on preferences | Dynamic array |
| `metadata.transformedAt` | Function: Current timestamp | Built-in function |
| `metadata.accountCount` | Function: `accounts.length` | Built-in function |

---

## 🎯 Testing Checklist

### Basic Functionality
- [ ] Upload JSON schemas successfully
- [ ] Tool extracts all fields from input schema
- [ ] Tool extracts all fields from output schema
- [ ] Field browser (📋 button) shows all fields
- [ ] Can select fields by clicking
- [ ] Can type field names manually
- [ ] Can add new mappings
- [ ] Can delete mappings
- [ ] Can change transformation types

### Auto-Mapping
- [ ] "Auto-Map Fields" button works
- [ ] Exact matches are found (e.g., customerId)
- [ ] Fuzzy matches are found (e.g., dob vs dateOfBirth)
- [ ] Nested fields are matched
- [ ] Unmatched fields remain empty

### FTL Generation
- [ ] Step 3 shows preview of generated FTL
- [ ] Direct mappings generate `"key": "${value}"`
- [ ] Concatenation generates `"key": "${val1} ${val2}"`
- [ ] Conditional generates `<#if>` blocks
- [ ] Can download generated FTL file
- [ ] Downloaded file has `.ftl` extension

### Edge Cases
- [ ] Works with deeply nested fields (3+ levels)
- [ ] Handles array fields (accounts)
- [ ] Handles boolean values
- [ ] Handles numeric values
- [ ] Handles date/datetime types

---

## 🐛 Known Limitations

The current tool has these limitations for complex scenarios:

### 1. Array Transformations
**Problem:** Arrays like `accounts[]` need `<#list>` loops
```freemarker
<#list accounts as account>
  {
    "accountId": "${account.accountNumber}"
  }
</#list>
```

**Current Tool:** Only generates simple field mappings
**Workaround:** Manually edit the generated FTL to add loops

### 2. Calculated Fields
**Problem:** Fields like `totalBalance.amount` need calculations
```freemarker
<#assign total = 0>
<#list accounts as account>
  <#assign total = total + account.balance>
</#list>
${total}
```

**Current Tool:** Cannot generate calculation logic
**Workaround:** Add calculation manually after generation

### 3. Conditional Arrays
**Problem:** Dynamic arrays like `notifications.channels`
```freemarker
[
  <#if preferences.emailNotifications>"EMAIL"</#if>,
  <#if preferences.smsNotifications>"SMS"</#if>
]
```

**Current Tool:** Cannot generate array building logic
**Workaround:** Manually edit after generation

### 4. Built-in Functions
**Problem:** Functions like `.now`, `?upper_case`, `?size`
```freemarker
"transformedAt": "${.now?iso_utc}",
"type": "${accountType?upper_case}",
"count": ${accounts?size}
```

**Current Tool:** Basic transformations only
**Workaround:** Add function calls manually

---

## 💡 Best Practices for Testing

### 1. Start Simple
```
First test: Map just 3-5 simple fields
- clientReference ← customerId
- profile.dob ← personalInfo.dateOfBirth
- notifications.locale ← preferences.preferredLanguage

Verify: Generated FTL has correct syntax
```

### 2. Add Complexity Gradually
```
Second test: Add concatenation
- profile.fullName ← firstName + lastName

Third test: Add nested fields
- profile.contact.primaryEmail ← personalInfo.email
```

### 3. Test Edge Cases
```
- Deeply nested: profile.contact.mobile
- Arrays: financialAccounts (will need manual editing)
- Booleans: isActive conversion
- Numbers: balance, amount
```

### 4. Compare Output
```
1. Generate FTL with tool
2. Compare with expected-transform.ftl
3. Note differences
4. Manually add missing complex logic
```

---

## 🔍 Expected FTL Output

For the simple mappings, the tool should generate:

```freemarker
{
  "clientReference": "${customerId}",
  "profile": {
    "fullName": "${personalInfo.firstName} ${personalInfo.lastName}",
    "contact": {
      "primaryEmail": "${personalInfo.email}",
      "mobile": "${personalInfo.phoneNumber}"
    },
    "dob": "${personalInfo.dateOfBirth}"
  },
  "notifications": {
    "locale": "${preferences.preferredLanguage}"
  }
}
```

**Note:** Complex features (arrays, calculations, conditionals) will need manual additions.

---

## 📊 Test Results Template

Use this to track your testing:

```
Test Date: _______________
Tester: __________________

✅ PASSED / ❌ FAILED

[ ] Schema Upload (JSON)
[ ] Field Extraction (Input)
[ ] Field Extraction (Output)
[ ] Auto-Map Fields
[ ] Manual Field Selection
[ ] Direct Mapping
[ ] Concatenation Mapping
[ ] Conditional Mapping
[ ] FTL Generation
[ ] FTL Download

NOTES:
_________________________________
_________________________________
_________________________________

ISSUES FOUND:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 Quick Start Command

```bash
# 1. Open the tool
open freemarker-schema-mapper.html

# 2. Upload schemas
Input Schema: input-schema.json
Output Schema: output-schema.json
Template: [SKIP - we're testing from scratch]

# 3. Click "Auto-Map Fields"

# 4. Fill in remaining mappings using the field browser (📋)

# 5. Generate and compare with expected-transform.ftl
```

Happy Testing! 🎉
