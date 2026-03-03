const mongoose = require("mongoose");
const Category = require("../models/category.model");
const Tag = require("../models/tag.model");
const AppError = require("../utils/appError");

/**
 * Create new category
 */
const createCategory = async (data) => {
  try {
    // Normalize name to lowercase
    const normalizedData = {
      ...data,
      name: data.name ? data.name.trim().toLowerCase() : data.name,
    };

    // Check if category exists (including inactive)
    const existingCategory = await Category.findOne({ name: normalizedData.name });

    if (existingCategory) {
      // If category was soft-deleted, reactivate it
      if (!existingCategory.isActive) {
        existingCategory.isActive = true;
        existingCategory.description = data.description || existingCategory.description;
        existingCategory.icon = data.icon || existingCategory.icon;
        existingCategory.color = data.color || existingCategory.color;
        existingCategory.order = data.order || existingCategory.order;
        await existingCategory.save();
        console.log("✅ Category reactivated:", existingCategory._id);
        return existingCategory;
      }
      // Active category with same name exists
      throw new AppError("Category name already exists", 400);
    }

    const category = await Category.create(normalizedData);
    return category;
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Category name already exists", 400);
    }
    throw error;
  }
};

/**
 * Get all categories with their tags
 */
const getAllCategories = async (active = true) => {
  try {
    const query = active ? { isActive: true } : {};
    const categories = await Category.find(query).sort({ order: 1 });

    // Populate tags for each category
    const categoriesWithTags = await Promise.all(
      categories.map(async (cat) => {
        const tags = await Tag.find({
          categoryId: cat._id,
          isActive: active,
        }).sort({ order: 1 });

        return {
          ...cat.toObject(),
          tags,
        };
      })
    );

    return categoriesWithTags;
  } catch (error) {
    throw error;
  }
};

/**
 * Get category by ID with tags
 */
const getCategoryById = async (categoryId) => {
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const tags = await Tag.find({
      categoryId: category._id,
      isActive: true,
    }).sort({ order: 1 });

    return {
      ...category.toObject(),
      tags,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update category
 */
const updateCategory = async (categoryId, data) => {
  try {
    console.log("[updateCategory] Input:", { categoryId, data });

    // Get current category
    const currentCategory = await Category.findById(categoryId);
    if (!currentCategory) {
      throw new AppError("Category not found", 404);
    }
    console.log("[updateCategory] Current:", currentCategory.name);

    // Normalize name to lowercase if provided
    const normalizedData = { ...data };
    if (normalizedData.name) {
      normalizedData.name = normalizedData.name.trim().toLowerCase();
    }
    console.log("[updateCategory] Normalized:", normalizedData);

    // If name is provided and different from current, check for duplicates
    if (normalizedData.name && normalizedData.name !== currentCategory.name) {
      console.log("[updateCategory] Name changed, checking duplicates...");
      const existingCategory = await Category.findOne({
        name: normalizedData.name,
        _id: { $ne: categoryId },
        isActive: true,
      });

      if (existingCategory) {
        throw new AppError("Category name already exists", 400);
      }
    }

    // If name is same as current, remove it from update data (to force update other fields)
    if (normalizedData.name === currentCategory.name) {
      console.log("[updateCategory] Name same, removing from update");
      delete normalizedData.name;
    }

    // If no data to update, return current category
    if (Object.keys(normalizedData).length === 0) {
      console.log("[updateCategory] No data to update, returning current");
      return currentCategory;
    }

    console.log("[updateCategory] Performing update with:", normalizedData);
    const category = await Category.findByIdAndUpdate(categoryId, normalizedData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    console.log("[updateCategory] Updated category:", category.name);
    return category;
  } catch (error) {
    console.error("[updateCategory] Error:", error.message);
    if (error.code === 11000) {
      throw new AppError("Category name already exists", 400);
    }
    throw error;
  }
};

/**
 * Delete category (soft delete - set isActive to false)
 */
const deleteCategory = async (categoryId) => {
  try {
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    return category;
  } catch (error) {
    throw error;
  }
};

/**
 * Create tag under category
 */
const createTag = async (categoryId, data) => {
  try {
    // Validate categoryId is a valid ObjectId
    if (!categoryId) {
      throw new AppError("Category ID is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Invalid Category ID format", 400);
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Normalize name to lowercase before creating
    const normalizedName = data.name ? data.name.trim().toLowerCase() : data.name;

    // Check if tag with same name exists (including inactive)
    const existingTag = await Tag.findOne({
      categoryId,
      name: normalizedName,
    });

    if (existingTag) {
      // If tag was soft-deleted, reactivate it instead of creating new
      if (!existingTag.isActive) {
        existingTag.isActive = true;
        existingTag.description = data.description || existingTag.description;
        existingTag.icon = data.icon || existingTag.icon;
        existingTag.color = data.color || existingTag.color;
        existingTag.order = data.order || existingTag.order;
        await existingTag.save();
        console.log("✅ Tag reactivated:", existingTag._id);
        return existingTag;
      }
      // Active tag with same name exists
      throw new AppError("Tag name already exists in this category", 400);
    }

    console.log("✅ Creating tag:", { categoryId, name: normalizedName });

    const tag = await Tag.create({
      ...data,
      name: normalizedName,
      categoryId,
    });

    console.log("✅ Tag created successfully:", tag._id);
    return tag;
  } catch (error) {
    console.error("❌ Error creating tag:", error.message, error.code);

    if (error.code === 11000) {
      throw new AppError("Tag name already exists in this category", 400);
    }
    throw error;
  }
};

/**
 * Get all tags for a category
 */
const getTagsByCategory = async (categoryId, active = true) => {
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const query = { categoryId };
    if (active) query.isActive = true;

    const tags = await Tag.find(query).sort({ order: 1 });
    return tags;
  } catch (error) {
    throw error;
  }
};

/**
 * Get tag by ID
 */
const getTagById = async (tagId) => {
  try {
    const tag = await Tag.findById(tagId).populate("categoryId");
    if (!tag) {
      throw new AppError("Tag not found", 404);
    }
    return tag;
  } catch (error) {
    throw error;
  }
};

/**
 * Update tag
 */
const updateTag = async (tagId, data) => {
  try {
    // Get current tag
    const currentTag = await Tag.findById(tagId);
    if (!currentTag) {
      throw new AppError("Tag not found", 404);
    }

    // Normalize name to lowercase if provided
    const normalizedData = { ...data };
    if (normalizedData.name) {
      normalizedData.name = normalizedData.name.trim().toLowerCase();
    }

    // If name is provided and different from current, check for duplicates
    if (normalizedData.name && normalizedData.name !== currentTag.name) {
      const existingTag = await Tag.findOne({
        categoryId: currentTag.categoryId,
        name: normalizedData.name,
        _id: { $ne: tagId },
        isActive: true,
      });

      if (existingTag) {
        throw new AppError("Tag name already exists in this category", 400);
      }
    }

    // If name is same as current, remove it to force update other fields
    if (normalizedData.name === currentTag.name) {
      delete normalizedData.name;
    }

    // If no data to update, return current tag
    if (Object.keys(normalizedData).length === 0) {
      return currentTag;
    }

    const tag = await Tag.findByIdAndUpdate(tagId, normalizedData, {
      new: true,
      runValidators: true,
    });

    if (!tag) {
      throw new AppError("Tag not found", 404);
    }

    return tag;
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Tag name already exists", 400);
    }
    throw error;
  }
};

/**
 * Delete tag (soft delete)
 */
const deleteTag = async (tagId) => {
  try {
    const tag = await Tag.findByIdAndUpdate(
      tagId,
      { isActive: false },
      { new: true }
    );

    if (!tag) {
      throw new AppError("Tag not found", 404);
    }

    return tag;
  } catch (error) {
    throw error;
  }
};

/**
 * Search tags by name
 */
const searchTags = async (query) => {
  try {
    const tags = await Tag.find(
      { $text: { $search: query }, isActive: true },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .populate("categoryId");

    return tags;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createTag,
  getTagsByCategory,
  getTagById,
  updateTag,
  deleteTag,
  searchTags,
};
