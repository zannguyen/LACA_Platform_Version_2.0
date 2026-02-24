# Tag Hierarchy System - API Documentation

## Overview

The tag hierarchy system enables content categorization and personalized recommendations. Categories group related tags (e.g., "Thể Thao" category contains "Bóng Đá", "Cầu Lông" tags).

## Database Models

### Category Model
```
{
  _id: ObjectId,
  name: String (unique, lowercase),
  description: String,
  icon: String (emoji or icon URL),
  color: String (hex color),
  order: Number (sort order in UI),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Tag Model
```
{
  _id: ObjectId,
  name: String (unique within category),
  description: String,
  categoryId: ObjectId (ref: Category),
  icon: String,
  color: String,
  order: Number,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Post Model (Updated)
```
{
  ...existing fields,
  tags: [ObjectId] (ref: Tag) // Array of selected tags when posting
}
```

## API Endpoints

### Categories

#### GET /api/tags/categories
Get all categories with their tags
- **Query params**: `active=true/false` (default: true)
- **Response**: Array of categories with populated tags
- **Example**:
```bash
curl http://localhost:3000/api/tags/categories
curl http://localhost:3000/api/tags/categories?active=false
```

#### GET /api/tags/categories/:categoryId
Get specific category with its tags
- **Params**: categoryId (MongoDB ObjectId)
- **Response**: Single category object with tags array
- **Example**:
```bash
curl http://localhost:3000/api/tags/categories/65c1234567890abcdef12345
```

#### POST /api/tags/categories
Create new category (auth required, admin recommended)
- **Auth**: Required (Bearer token)
- **Body**:
```json
{
  "name": "Thể Thao",
  "description": "Các hoạt động thể thao",
  "icon": "⚽",
  "color": "#FF6B6B",
  "order": 1
}
```
- **Response**: Created category object

#### PUT /api/tags/categories/:categoryId
Update category (auth required, admin recommended)
- **Auth**: Required
- **Body**: Any fields to update (name, description, icon, color, order, isActive)
- **Response**: Updated category object

#### DELETE /api/tags/categories/:categoryId
Soft delete category (auth required, admin recommended)
- **Auth**: Required
- **Response**: Deleted category object (isActive=false)

---

### Tags

#### GET /api/tags/by-category/:categoryId
Get all tags for a category
- **Query params**: `active=true/false` (default: true)
- **Response**: Array of tags
- **Example**:
```bash
curl http://localhost:3000/api/tags/by-category/65c1234567890abcdef12345
```

#### GET /api/tags/:tagId
Get specific tag with category info
- **Params**: tagId (MongoDB ObjectId)
- **Response**: Single tag object with populated category
- **Example**:
```bash
curl http://localhost:3000/api/tags/65c1234567890abcdef12346
```

#### POST /api/tags/categories/:categoryId/tags
Create new tag under category (auth required, admin recommended)
- **Auth**: Required
- **Body**:
```json
{
  "name": "Bóng Đá",
  "description": "Bóng đá 5 người, 7 người, 11 người",
  "icon": "⚽",
  "color": "#FF6B6B",
  "order": 1
}
```
- **Response**: Created tag object

#### PUT /api/tags/:tagId
Update tag (auth required, admin recommended)
- **Auth**: Required
- **Body**: Any fields to update (name, description, icon, color, order, isActive)
- **Response**: Updated tag object

#### DELETE /api/tags/:tagId
Soft delete tag (auth required, admin recommended)
- **Auth**: Required
- **Response**: Deleted tag object (isActive=false)

#### GET /api/tags/search/all
Search tags by name
- **Query params**: `q=search_query` (required)
- **Response**: Array of matching tags with category info
- **Example**:
```bash
curl "http://localhost:3000/api/tags/search/all?q=bóng"
```

---

## Recommendation Endpoints

### GET /api/recommendations/feed
Get personalized feed for user
- **Auth**: Required
- **Query params**: `limit=20&skip=0`
- **Scoring**:
  - Tags: 50% (primary signal)
  - Interest: 25%
  - Location: 15%
  - Recency: 7%
  - Engagement: 3%
- **Response**: Array of ranked posts with `recommendationScore` and `scoreBreakdown`

### GET /api/recommendations/tag/:tagId
Get posts for specific tag
- **Query params**: `limit=20&skip=0`
- **Response**: Array of posts tagged with this tag

### GET /api/recommendations/trending
Get trending posts (no auth required)
- **Query params**: `limit=20&skip=0`
- **Response**: Array of posts sorted by reactions and recency

---

## Seeding Database

Run the seed script to populate database with sample categories and tags:

```bash
node src/seeds/categories-tags.seed.js
```

**Includes 8 categories with 45+ tags:**
- Thể Thao (Sports) - 8 tags
- Ẩm Thực (Food) - 7 tags
- Du Lịch (Travel) - 6 tags
- Sức Khỏe & Wellness (Health) - 5 tags
- Nghệ Thuật & Sáng Tạo (Arts) - 6 tags
- Công Nghệ (Tech) - 5 tags
- Xã Hội & Cộng Đồng (Community) - 5 tags
- Giáo Dục & Học Tập (Education) - 4 tags

---

## Frontend Integration

### 1. Tag Selection When Posting
When creating a post, users select tags from the category/tag hierarchy:
```javascript
// Get all categories with tags
GET /api/tags/categories

// Response structure:
{
  "status": "success",
  "data": [
    {
      "_id": "...",
      "name": "Thể Thao",
      "icon": "⚽",
      "tags": [
        { "_id": "...", "name": "Bóng Đá", "icon": "⚽" },
        { "_id": "...", "name": "Cầu Lông", "icon": "🏸" }
      ]
    }
  ]
}
```

### 2. Personalized Feed
Fetch personalized posts based on user's interests and tag selections:
```javascript
GET /api/recommendations/feed?limit=20&skip=0
```

### 3. Tag-Based Browsing
Show posts for a specific tag:
```javascript
GET /api/recommendations/tag/:tagId?limit=20
```

---

## Usage Examples

### Create Category and Tags via API

```bash
# Create category
curl -X POST http://localhost:3000/api/tags/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thể Thao",
    "description": "Các hoạt động thể thao",
    "icon": "⚽",
    "color": "#FF6B6B",
    "order": 1
  }'

# Create tag under category
curl -X POST http://localhost:3000/api/tags/categories/CATEGORY_ID/tags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bóng Đá",
    "description": "Bóng đá 5 người",
    "icon": "⚽",
    "color": "#FF6B6B",
    "order": 1
  }'
```

### Get and Use Tags

```bash
# Get all categories
curl http://localhost:3000/api/tags/categories

# Get tags in a category
curl http://localhost:3000/api/tags/by-category/CATEGORY_ID

# Search for tags
curl "http://localhost:3000/api/tags/search/all?q=bóng"

# Get posts with a tag
curl http://localhost:3000/api/recommendations/tag/TAG_ID?limit=20
```

---

## Notes

1. **Hierarchy**: Categories → Tags (one-to-many relationship)
2. **Soft Delete**: Deleting categories/tags sets `isActive=false`, preserves data
3. **Indexing**: Queries optimized with indexes on `categoryId`, `isActive`, and text search
4. **Unique Names**: Category names are globally unique; tag names are unique within category
5. **Recommendation Score**: Posts with matching tags get 50% weight in recommendation algorithm
6. **Admin Control**: Consider adding role check for create/update/delete operations (currently commented)

