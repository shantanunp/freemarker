# FreeMarker Mapping Logic Explanation

## How the Mapping Works (No AI Involved)

### 1. **PARSING THE TEMPLATE** (Reading Existing Mappings)

```javascript
const parseTemplate = (content) => {
    const mappingList = [];
    // This REGEX pattern finds all FreeMarker variable expressions
    const regex = /"([^"]+)":\s*"\$\{([^}]+)\}"/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const targetField = match[1];  // The JSON key (left side)
        const sourceField = match[2];  // The FreeMarker variable (right side)
        
        mappingList.push({
            id: Date.now() + Math.random(),
            target: targetField,
            source: sourceField,
            transformation: 'direct',
            description: '',
            isNew: false
        });
    }
}
```

**Example:**
```
Input Template:
"customerId": "${customer.id}"
"email": "${customer.email}"

Regex Matches:
Match 1: target = "customerId", source = "customer.id"
Match 2: target = "email", source = "customer.email"

Result Array:
[
  { target: "customerId", source: "customer.id", transformation: "direct" },
  { target: "email", source: "customer.email", transformation: "direct" }
]
```

---

### 2. **EDITING MAPPINGS** (User Changes in UI)

When you edit a field in the table, it simply updates the JavaScript object:

```javascript
const updateMapping = (index, field, value) => {
    const newMappings = [...mappings];  // Copy the array
    newMappings[index][field] = value;  // Update the specific field
    setMappings(newMappings);           // Save back to state
};
```

**Example:**
```
User changes source field from "customer.id" to "user.customerId"

Before:
{ target: "customerId", source: "customer.id" }

After:
{ target: "customerId", source: "user.customerId" }
```

---

### 3. **ADDING NEW MAPPINGS**

```javascript
const addNewMapping = () => {
    const newMapping = {
        id: Date.now(),          // Unique ID using timestamp
        target: '',              // Empty - user will fill
        source: '',              // Empty - user will fill
        transformation: 'direct',
        description: '',
        isNew: true              // Flag to highlight in green
    };
    setMappings([...mappings, newMapping]);
};
```

**Example:**
```
User clicks "Add Mapping" button

New row added:
{ target: "", source: "", transformation: "direct", isNew: true }

User fills in:
{ target: "phoneNumber", source: "customer.phone", transformation: "direct", isNew: true }
```

---

### 4. **TRACKING CHANGES** (Comparing Old vs New)

```javascript
const getChanges = () => {
    const changes = { modified: [], added: [], deleted: [] };

    // Find ADDED mappings
    mappings.forEach(mapping => {
        if (mapping.isNew) {
            changes.added.push(mapping);
        } else {
            // Find MODIFIED mappings
            const original = originalMappings.find(m => m.id === mapping.id);
            if (original && 
                (original.target !== mapping.target || 
                 original.source !== mapping.source)) {
                changes.modified.push({
                    original: original,
                    updated: mapping
                });
            }
        }
    });

    // Find DELETED mappings
    originalMappings.forEach(original => {
        if (!mappings.find(m => m.id === original.id)) {
            changes.deleted.push(original);
        }
    });

    return changes;
};
```

**Example:**
```
Original Template:
[
  { id: 1, target: "customerId", source: "customer.id" },
  { id: 2, target: "email", source: "customer.email" }
]

User's Changes:
[
  { id: 1, target: "userId", source: "user.id" },           // MODIFIED
  { id: 3, target: "phone", source: "user.phone", isNew: true }  // ADDED
]
// Note: id:2 is missing = DELETED

Result:
{
  modified: [{ original: {...}, updated: {...} }],  // customerId → userId
  added: [{ target: "phone", source: "user.phone" }],
  deleted: [{ target: "email", source: "customer.email" }]
}
```

---

### 5. **GENERATING V2 TEMPLATE** (Writing New FreeMarker Code)

```javascript
const generateV2Template = () => {
    let template = '{\n';
    
    mappings.forEach((mapping, index) => {
        const indent = '  ';
        const isLast = index === mappings.length - 1;
        
        if (mapping.transformation === 'direct') {
            // Simple variable substitution
            template += `${indent}"${mapping.target}": "\${${mapping.source}}"${isLast ? '' : ','}\n`;
        } 
        else if (mapping.transformation === 'conditional') {
            // Add FreeMarker if-else logic
            template += `${indent}"${mapping.target}": "<#if ${mapping.source}??>\${${mapping.source}}<#else>N/A</#if>"${isLast ? '' : ','}\n`;
        }
    });
    
    template += '}';
    return template;
};
```

**Example:**
```
Input Mappings:
[
  { target: "userId", source: "user.id", transformation: "direct" },
  { target: "email", source: "user.email", transformation: "conditional" },
  { target: "phone", source: "user.phone", transformation: "direct" }
]

Generated V2 Template:
{
  "userId": "${user.id}",
  "email": "<#if user.email??>${user.email}<#else>N/A</#if>",
  "phone": "${user.phone}"
}
```

---

## Why This is NOT AI

### ❌ What AI Would Do:
- Analyze semantic meaning of field names
- "Understand" that `customer.firstName` probably maps to `user.fname`
- Suggest intelligent transformations based on data types
- Auto-detect patterns like "concatenate firstName + lastName → fullName"

### ✅ What This Tool Actually Does:
1. **Regex Pattern Matching** - Finds `"key": "${value}"` patterns
2. **String Manipulation** - Builds new template strings
3. **Array Operations** - Compare, add, remove objects
4. **Text Generation** - Concatenate strings to build FreeMarker syntax

---

## Complete Flow Example

### Original Template:
```freemarker
{
  "customerId": "${customer.id}",
  "name": "${customer.firstName} ${customer.lastName}",
  "email": "${customer.email}"
}
```

### Step 1: Parse
```javascript
Extracted Mappings:
[
  { id: 1, target: "customerId", source: "customer.id" },
  { id: 2, target: "name", source: "customer.firstName} ${customer.lastName" },
  { id: 3, target: "email", source: "customer.email" }
]
```

### Step 2: User Edits
```javascript
Changes:
- Delete mapping id:2 (name)
- Modify id:1: source "customer.id" → "user.userId"
- Add new: { target: "phone", source: "user.phoneNumber", isNew: true }
```

### Step 3: Generate V2
```freemarker
{
  "customerId": "${user.userId}",
  "email": "${customer.email}",
  "phone": "${user.phoneNumber}"
}
```

---

## Limitations (Because It's Not AI)

1. **Cannot auto-suggest mappings** - You must manually enter field names
2. **No semantic understanding** - Doesn't know `firstName` + `lastName` = `fullName`
3. **No data type validation** - Doesn't check if `customer.age` is a number
4. **Regex-based parsing** - Complex FreeMarker logic might not parse perfectly
5. **No intelligent field matching** - Can't guess that `cust.email` maps to `user.emailAddress`

---

## What You Could Add for Intelligence

If you wanted AI-powered features, you could:

### Option 1: Use Claude API (Simple)
```javascript
async function suggestMapping(sourceSchema, targetSchema) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{
                role: "user",
                content: `Given source: ${sourceSchema} and target: ${targetSchema}, 
                         suggest field mappings in JSON format.`
            }]
        })
    });
    return await response.json();
}
```

### Option 2: Pattern Recognition (ML-like but not AI)
```javascript
function fuzzyMatch(sourceField, targetFields) {
    // Calculate string similarity (Levenshtein distance)
    // Return closest matches
    // Example: "custId" matches "customerId" with 85% confidence
}
```

### Option 3: Schema Analysis
```javascript
function analyzeSchemas(inputJSON, outputJSON) {
    // Parse both JSON schemas
    // Match by data types, nested structure
    // Suggest mappings where structure is similar
}
```

---

## Summary

**Current Implementation:**
- Pure JavaScript string/regex manipulation
- No AI, no ML, no semantic understanding
- User manually defines all mappings
- Tool helps visualize, edit, and generate code

**To Make it "AI-Powered" you would need:**
- Call Claude API to analyze schemas
- Implement field name similarity matching
- Add data type inference and validation
- Auto-suggest transformations based on patterns

The current tool is a **visual code generator** - it makes the tedious work of editing FreeMarker templates easier, but doesn't "think" about the mappings for you.
