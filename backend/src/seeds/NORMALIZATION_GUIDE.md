# Tag & Category Normalization - Fix Guide

## 📋 Problem Identified

Tags can have duplicate variations due to normalization issues:
- `"bóng đá"` vs `"Bóng Đá"` vs `"bóng  đá"` (with extra spaces)

These should be treated as **the same tag** (per category).

## ✅ Fixes Applied

### 1. **Backend Models Updated**

#### Tag Model (`src/models/tag.model.js`)
- ✅ Added pre-save hook to normalize name
  - `trim()` - remove leading/trailing spaces
  - `toLowerCase()` - convert to lowercase
  - `replace(/\s+/g, " ")` - remove extra spaces
- ✅ Changed unique index from **global** to **per-category**
  - From: `name: { unique: true }`
  - To: `{ categoryId: 1, name: 1 }, { unique: true }`

#### Category Model (`src/models/category.model.js`)
- ✅ Added pre-save hook with same normalization logic
- ✅ Keeps global unique constraint on name (categories are global)

### 2. **Cleanup Scripts Created**

#### `src/seeds/normalize-tags.js`
- Normalizes all existing tags & categories
- Removes duplicates within each category
- Drops old indexes and creates new ones
- **Usage**: `node src/seeds/normalize-tags.js`

#### `src/seeds/test-normalization.js`
- Tests normalization with sample data
- Verifies duplicate detection works
- **Usage**: `node src/seeds/test-normalization.js`

---

## 🚀 Setup Instructions

### Step 1: Apply Model Changes
Already done! Tag & Category models updated with normalization hooks.

### Step 2: Test Normalization (Optional)
```bash
cd backend
node src/seeds/test-normalization.js
```

Expected output:
```
✅ Testing Normalization:

✅ "Bóng Đá"
   Saved as: "bóng đá"
   Expected: "bóng đá"
   Match: ✅

⚠️  "bóng đá"
   Result: Duplicate detected (index violation) ✅
```

### Step 3: Cleanup Existing Data
```bash
cd backend
node src/seeds/normalize-tags.js
```

Expected output:
```
✅ Connected to MongoDB

🔄 Processing categories...
   Found X categories
   ✅ Categories: X kept, 0 removed

🔄 Processing tags...
   Found Y tags
   ✅ Tags: Y kept, 0 removed

✨ Normalization & cleanup complete!
```

### Step 4: Reseed Database (Fresh Start)
```bash
cd backend
node src/seeds/categories-tags.seed.js
```

---

## 🔍 Verification Checklist

After completing steps above:

- [ ] Test script runs without errors
- [ ] Normalization cleanup completes successfully
- [ ] Seed data loads properly
- [ ] Go to Admin → Tags/Categories
- [ ] Try creating duplicate tags (should fail with 11000 error)
- [ ] Try creating `"bóng đá"` after creating `"Bóng Đá"` (should fail gracefully)

---

## 📝 What Happens Now

### Before Creating a Tag:
```
User input: "Bóng  Đá " (capital B, extra spaces, trailing space)
          ↓
Pre-save hook normalizes
          ↓
Stored as: "bóng đá"
```

### Duplicate Prevention:
```
Category: "Thể Thao"

Existing: "bóng đá"

Try to add: "Bóng Đá"
          ↓
Normalized: "bóng đá"
          ↓
Unique index check: (categoryId: "abc", name: "bóng đá") already exists
          ↓
Error: E11000 duplicate key error
          ↓
Frontend shows: "Tag already exists in this category"
```

---

## 🎯 Result

✅ No more duplicate tags due to casing/spacing
✅ Global unique constraint on category names
✅ Per-category unique constraint on tag names
✅ All data normalized automatically on save
✅ Existing data cleaned up

---

## 🛠️ Quick Commands

```bash
# Test normalization
node src/seeds/test-normalization.js

# Cleanup existing data
node src/seeds/normalize-tags.js

# Reseed fresh data
node src/seeds/categories-tags.seed.js

# All in one (cleanup + reseed)
node src/seeds/normalize-tags.js && node src/seeds/categories-tags.seed.js
```

---

Last Updated: Feb 25, 2026
