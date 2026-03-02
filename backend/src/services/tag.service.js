const mongoose = require("mongoose");
const Category = require("../models/category.model");
const Tag = require("../models/tag.model");
const AppError = require("../utils/appError");

/**
 * Create new category
 */
const createCategory = async (data) => {
  try {
    const category = await Category.create(data);
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
    const category = await Category.findByIdAndUpdate(categoryId, data, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    return category;
  } catch (error) {
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

    console.log("✅ Creating tag:", { categoryId, data });
    
    const tag = await Tag.create({
      ...data,
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
    const tag = await Tag.findByIdAndUpdate(tagId, data, {
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
