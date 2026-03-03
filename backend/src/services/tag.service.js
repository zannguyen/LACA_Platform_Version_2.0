const mongoose = require("mongoose");
const Category = require("../models/category.model");
const Tag = require("../models/tag.model");
const AppError = require("../utils/appError");

/**
 * Create new category
 */
const createCategory = async (data) => {
  try {
    const trimmedName = data.name ? data.name.trim() : data.name;

    // Check if category exists (case-insensitive, including inactive)
    const lowerName = trimmedName.toLowerCase();
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${lowerName}$`, 'i') }
    });

    if (existingCategory) {
      // If category was soft-deleted, reactivate it
      if (!existingCategory.isActive) {
        existingCategory.isActive = true;
        existingCategory.description = data.description || existingCategory.description;
        existingCategory.icon = data.icon || existingCategory.icon;
        existingCategory.color = data.color || existingCategory.color;
        existingCategory.order = data.order || existingCategory.order;
        await existingCategory.save();
        return existingCategory;
      }
      // Active category with same name exists
      throw new AppError("Category name already exists", 400);
    }

    const category = await Category.create({ ...data, name: trimmedName });
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
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  // If updating name, check for duplicates case-insensitively
  if (data.name) {
    const trimmedName = data.name.trim();
    const lowerName = trimmedName.toLowerCase();
    const lowerCurrentName = category.name.toLowerCase();

    // Only check if the case-insensitive name is different from current
    if (lowerName !== lowerCurrentName) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${lowerName}$`, 'i') },
        _id: { $ne: categoryId },
        isActive: true,
      });

      if (existingCategory) {
        throw new AppError("Category name already exists", 400);
      }
    }

    // Use the trimmed name (preserve original casing)
    data.name = trimmedName;
  }

  const updatedCategory = await Category.findByIdAndUpdate(categoryId, data, {
    new: true,
    runValidators: true,
  });

  if (!updatedCategory) {
    throw new AppError("Category not found", 404);
  }

  return updatedCategory;
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

    const trimmedName = data.name ? data.name.trim() : data.name;

    // Check if tag with same name exists (case-insensitive, including inactive)
    const lowerName = trimmedName.toLowerCase();
    const existingTag = await Tag.findOne({
      categoryId,
      name: { $regex: new RegExp(`^${lowerName}$`, 'i') },
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
        return existingTag;
      }
      // Active tag with same name exists
      throw new AppError("Tag name already exists in this category", 400);
    }

    const tag = await Tag.create({
      ...data,
      name: trimmedName,
      categoryId,
    });

    return tag;
  } catch (error) {
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
  const tag = await Tag.findById(tagId);
  if (!tag) {
    throw new AppError("Tag not found", 404);
  }

  // If updating name, check for duplicates case-insensitively
  if (data.name) {
    const trimmedName = data.name.trim();
    const lowerName = trimmedName.toLowerCase();
    const lowerCurrentName = tag.name.toLowerCase();

    // Only check if the case-insensitive name is different from current
    if (lowerName !== lowerCurrentName) {
      const existingTag = await Tag.findOne({
        categoryId: tag.categoryId,
        name: { $regex: new RegExp(`^${lowerName}$`, 'i') },
        _id: { $ne: tagId },
        isActive: true,
      });

      if (existingTag) {
        throw new AppError("Tag name already exists in this category", 400);
      }
    }

    // Use the trimmed name (preserve original casing)
    data.name = trimmedName;
  }

  const updatedTag = await Tag.findByIdAndUpdate(tagId, data, {
    new: true,
    runValidators: true,
  });

  if (!updatedTag) {
    throw new AppError("Tag not found", 404);
  }

  return updatedTag;
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
