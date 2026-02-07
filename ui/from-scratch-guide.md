# Creating FreeMarker Templates From Scratch

## Scenario: No Existing FTL File

### What Happens When You Don't Upload a Template

```
Step 1: Upload Schemas
├── Input Schema (JSON/XML)    ✓ Required
├── Output Schema (JSON/XML)   ✓ Required
└── FreeMarker Template (.ftl) ✗ OPTIONAL - Skip this!
```

## How It Works From Scratch

### 1. **Upload Only Schemas**

```json
// Input Schema (customer-input.json)
{
  "customer": {
    "id": "C12345",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }
}

// Output Schema (order-output.json)
{
  "orderId": "string",
  "customerName": "string",
  "contactEmail": "string",
  "phoneNumber": "string",
  "shippingAddress": {
    "streetAddress": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string"
  }
}
```

### 2. **Tool Extracts All Fields**

**Input Fields Detected:**
```
✓ customer.id
✓ customer.firstName
✓ customer.lastName
✓ customer.email
✓ customer.phone
✓ customer.address.street
✓ customer.address.city
✓ customer.address.state
✓ customer.address.zip
```

**Output Fields Detected:**
```
✓ orderId
✓ customerName
✓ contactEmail
✓ phoneNumber
✓ shippingAddress.streetAddress
✓ shippingAddress.city
✓ shippingAddress.state
✓ shippingAddress.zipCode
```

### 3. **Click "Auto-Map Fields" (Optional)**

The tool will try to match fields automatically:

```javascript
Automatic Matches Found:
✓ contactEmail      ← customer.email         (exact match)
✓ phoneNumber       ← customer.phone         (fuzzy match: "phone")
✓ shippingAddress.city    ← customer.address.city    (exact match)
✓ shippingAddress.state   ← customer.address.state   (exact match)

Unmatched (Need Manual Mapping):
✗ orderId           (no matching input field)
✗ customerName      (could be firstName + lastName)
✗ shippingAddress.streetAddress ← ??? (fuzzy match failed)
✗ shippingAddress.zipCode       ← ??? (doesn't match "zip")
```

### 4. **Manually Map Remaining Fields**

In Step 2, you click the 📋 button to browse and select:

```
Target Field: orderId
Source Field: [Click 📋] → Select "customer.id"

Target Field: customerName
Source Field: [Type manually] → "customer.firstName customer.lastName"
Transformation: [Select] → "Concatenate"

Target Field: shippingAddress.streetAddress
Source Field: [Click 📋] → Select "customer.address.street"

Target Field: shippingAddress.zipCode
Source Field: [Click 📋] → Select "customer.address.zip"
```

### 5. **Generated FTL Template (From Scratch)**

```freemarker
{
  "orderId": "${customer.id}",
  "customerName": "${customer.firstName} ${customer.lastName}",
  "contactEmail": "${customer.email}",
  "phoneNumber": "${customer.phone}",
  "shippingAddress": {
    "streetAddress": "${customer.address.street}",
    "city": "${customer.address.city}",
    "state": "${customer.address.state}",
    "zipCode": "${customer.address.zip}"
  }
}
```

**This is a brand new FTL file created entirely from your schema mappings!**

---

## Complete Walkthrough: Zero to FTL

### Example Use Case: XML to JSON Transformation

#### Input Schema (XML format)
```xml
<!-- legacy-customer.xml -->
<Customer>
  <CustomerId>12345</CustomerId>
  <PersonalInfo>
    <FirstName>Jane</FirstName>
    <LastName>Smith</LastName>
    <ContactDetails>
      <Email>jane@example.com</Email>
      <Mobile>555-9876</Mobile>
    </ContactDetails>
  </PersonalInfo>
  <BillingAddress>
    <Street>456 Oak Ave</Street>
    <City>Boston</City>
    <State>MA</State>
    <PostalCode>02101</PostalCode>
  </BillingAddress>
</Customer>
```

#### Output Schema (JSON format)
```json
{
  "userId": "string",
  "profile": {
    "fullName": "string",
    "email": "string",
    "mobile": "string"
  },
  "address": {
    "line1": "string",
    "city": "string",
    "state": "string",
    "postal": "string"
  }
}
```

#### Step-by-Step Process

**1. Upload Files**
```
✓ Upload legacy-customer.xml as Input Schema
✓ Upload modern-user.json as Output Schema
✗ No FTL template (we're creating from scratch!)
```

**2. Tool Parses Fields**

Input Fields (from XML):
```
- Customer.CustomerId
- Customer.PersonalInfo.FirstName
- Customer.PersonalInfo.LastName
- Customer.PersonalInfo.ContactDetails.Email
- Customer.PersonalInfo.ContactDetails.Mobile
- Customer.BillingAddress.Street
- Customer.BillingAddress.City
- Customer.BillingAddress.State
- Customer.BillingAddress.PostalCode
```

Output Fields (from JSON):
```
- userId
- profile.fullName
- profile.email
- profile.mobile
- address.line1
- address.city
- address.state
- address.postal
```

**3. Map Fields Manually**

| Output Field | Mapping | Input Field | Transformation |
|-------------|---------|-------------|----------------|
| userId | → | Customer.CustomerId | Direct |
| profile.fullName | → | Customer.PersonalInfo.FirstName + LastName | Concatenate |
| profile.email | → | Customer.PersonalInfo.ContactDetails.Email | Direct |
| profile.mobile | → | Customer.PersonalInfo.ContactDetails.Mobile | Direct |
| address.line1 | → | Customer.BillingAddress.Street | Direct |
| address.city | → | Customer.BillingAddress.City | Direct |
| address.state | → | Customer.BillingAddress.State | Direct |
| address.postal | → | Customer.BillingAddress.PostalCode | Direct |

**4. Generated FTL (Created from Nothing!)**

```freemarker
{
  "userId": "${Customer.CustomerId}",
  "profile": {
    "fullName": "${Customer.PersonalInfo.FirstName} ${Customer.PersonalInfo.LastName}",
    "email": "${Customer.PersonalInfo.ContactDetails.Email}",
    "mobile": "${Customer.PersonalInfo.ContactDetails.Mobile}"
  },
  "address": {
    "line1": "${Customer.BillingAddress.Street}",
    "city": "${Customer.BillingAddress.City}",
    "state": "${Customer.BillingAddress.State}",
    "postal": "${Customer.BillingAddress.PostalCode}"
  }
}
```

**5. Download Your New Template**
```
✓ transform-v2.ftl downloaded
✓ Ready to use in your FreeMarker engine!
```

---

## Advanced Mappings You Can Create

### 1. **Concatenation**
```
Mapping:
  fullName ← firstName + " " + lastName

Generated FTL:
  "fullName": "${customer.firstName} ${customer.lastName}"
```

### 2. **Conditional (Null-Safe)**
```
Mapping:
  middleName ← customer.middleName (conditional)

Generated FTL:
  "middleName": "<#if customer.middleName??>${customer.middleName}<#else>N/A</#if>"
```

### 3. **Direct Mapping**
```
Mapping:
  email ← customer.email (direct)

Generated FTL:
  "email": "${customer.email}"
```

### 4. **Nested Object Mapping**
```
Mapping:
  address.city ← customer.location.city

Generated FTL:
  "address": {
    "city": "${customer.location.city}"
  }
```

---

## Workflow Summary

```
┌─────────────────────────────────────────────────┐
│  NO FTL FILE EXISTS                             │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  STEP 1: Upload Input & Output Schemas          │
│  - JSON or XML format                           │
│  - Tool extracts all fields automatically       │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  OPTIONAL: Click "Auto-Map Fields"              │
│  - Matches fields by name similarity            │
│  - Saves manual work                            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  STEP 2: Manually Map Remaining Fields          │
│  - Browse fields with 📋 button                 │
│  - Select transformation type                   │
│  - Add new mappings as needed                   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  STEP 3: Review & Generate                      │
│  - Preview generated FTL template               │
│  - Download transform-v2.ftl                    │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  ✓ BRAND NEW FTL CREATED FROM SCRATCH!          │
└─────────────────────────────────────────────────┘
```

---

## Benefits of Creating From Scratch

### ✅ Advantages

1. **No Legacy Code** - Start with clean, modern FTL syntax
2. **Schema-Driven** - Mappings based on actual data structures
3. **Visual Mapping** - See all fields before creating template
4. **Type Safety** - Know field types from schema
5. **Auto-Suggestions** - Tool can suggest matches
6. **No Typos** - Select from dropdown instead of typing

### ❌ Without This Tool (Manual FTL Creation)

```freemarker
// Manual process - error prone!
{
  "userId": "${custmer.id}",          // ❌ Typo: "custmer"
  "email": "${customer.emial}",        // ❌ Typo: "emial"
  "address": "${customer.adress.city}" // ❌ Typo: "adress"
}
```

### ✅ With This Tool (Visual Mapping)

```
1. Click target field dropdown → See all output fields
2. Click source field 📋 → See all input fields
3. Click to select → No typing = No typos!
4. Generate FTL → Perfect syntax guaranteed
```

---

## Real-World Example: E-Commerce Order

**Input: Legacy XML Order**
```xml
<Order>
  <OrderNumber>ORD-2024-001</OrderNumber>
  <Customer>
    <Name>Alice Johnson</Name>
    <Email>alice@shop.com</Email>
  </Customer>
  <Items>
    <Item>
      <ProductCode>PROD-123</ProductCode>
      <Quantity>2</Quantity>
      <Price>29.99</Price>
    </Item>
  </Items>
  <Total>59.98</Total>
</Order>
```

**Output: Modern JSON API**
```json
{
  "id": "string",
  "customerInfo": {
    "name": "string",
    "contact": "string"
  },
  "orderDetails": {
    "items": [],
    "totalAmount": "number"
  }
}
```

**Generated FTL (From Scratch)**
```freemarker
{
  "id": "${Order.OrderNumber}",
  "customerInfo": {
    "name": "${Order.Customer.Name}",
    "contact": "${Order.Customer.Email}"
  },
  "orderDetails": {
    "items": [
      <#list Order.Items.Item as item>
      {
        "code": "${item.ProductCode}",
        "qty": ${item.Quantity},
        "price": ${item.Price}
      }<#sep>,</#sep>
      </#list>
    ],
    "totalAmount": ${Order.Total}
  }
}
```

---

## Summary

**YES - The tool absolutely creates FTL files from scratch!**

You only need:
1. Input schema (JSON or XML)
2. Output schema (JSON or XML)

The FTL template is **completely optional**. If you don't have one, the tool will:
- Extract all fields from both schemas
- Let you visually map them
- Auto-suggest matches
- Generate a brand new FTL file

**No coding required. No FreeMarker knowledge needed. Just point and click!**
