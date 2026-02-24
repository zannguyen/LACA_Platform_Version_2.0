const express = require("express");
const router = express.Router();
const tagService = require("../services/tag.service");
const authMiddleware = require("../middlewares/auth.middleware");
const AppError = require("../utils/appError");

// ============ CATEGORY ROUTES ============

/**
 * GET /api/tags/categories
 * Get all categories with their tags
 * Query params: active=true/false (default: true for only active)
 */
router.get("/categories", async (req, res, next) => {
  try {
    const active = req.query.active !== "false"; // Default true
    const categories = await tagService.getAllCategories(active);
    res.json({
      status: "success",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tags/categories/:categoryId
 * Get specific category with its tags
 */
router.get("/categories/:categoryId", async (req, res, next) => {
  try {
    const category = await tagService.getCategoryById(req.params.categoryId);
    res.json({
      status: "success",
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tags/categories
 * Create new category (admin only)
 * Body: { name, description, icon, color, order }
 */
router.post(
  "/categories",
  authMiddleware,
  async (req, res, next) => {
    try {
      // Check if user is admin (optional - depends on your user model)
      // if (!req.user.isAdmin) {
      //   throw new AppError("Only admins can create categories", 403);
      // }

      const { name, description, icon, color, order } = req.body;

      if (!name) {
        throw new AppError("Category name is required", 400);
      }

      const category = await tagService.createCategory({
        name,
        description,
        icon,
        color,
        order: order || 0,
      });

      res.status(201).json({
        status: "success",
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/tags/categories/:categoryId
 * Update category (admin only)
 * Body: { name, description, icon, color, order, isActive }
 */
router.put(
  "/categories/:categoryId",
  authMiddleware,
  async (req, res, next) => {
    try {
      // if (!req.user.isAdmin) {
      //   throw new AppError("Only admins can update categories", 403);
      // }

      const { name, description, icon, color, order, isActive } = req.body;

      const category = await tagService.updateCategory(
        req.params.categoryId,
        {
          name,
          description,
          icon,
          color,
          order,
          isActive,
        }
      );

      res.json({
        status: "success",
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/tags/categories/:categoryId
 * Soft delete category (admin only)
 */
router.delete(
  "/categories/:categoryId",
  authMiddleware,
  async (req, res, next) => {
    try {
      // if (!req.user.isAdmin) {
      //   throw new AppError("Only admins can delete categories", 403);
      // }

      const category = await tagService.deleteCategory(req.params.categoryId);

      res.json({
        status: "success",
        message: "Category deleted successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ TAG ROUTES ============

/**
 * GET /api/tags/by-category/:categoryId
 * Get all tags for a specific category
 * Query params: active=true/false (default: true)
 */
router.get("/by-category/:categoryId", async (req, res, next) => {
  try {
    const active = req.query.active !== "false";
    const tags = await tagService.getTagsByCategory(
      req.params.categoryId,
      active
    );

    res.json({
      status: "success",
      data: tags,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tags/:tagId
 * Get specific tag with category info
 */
router.get("/:tagId", async (req, res, next) => {
  try {
    const tag = await tagService.getTagById(req.params.tagId);

    res.json({
      status: "success",
      data: tag,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tags/categories/:categoryId/tags
 * Create new tag under category (admin only)
 * Body: { name, description, icon, color, order }
 */
router.post(
  "/categories/:categoryId/tags",
  authMiddleware,
  async (req, res, next) => {
    try {
      // if (!req.user.isAdmin) {
      //   throw new AppError("Only admins can create tags", 403);
      // }

      const { name, description, icon, color, order } = req.body;

      if (!name) {
        throw new AppError("Tag name is required", 400);
      }

      const tag = await tagService.createTag(req.params.categoryId, {
        name,
        description,
        icon,
        color,
        order: order || 0,
      });

      res.status(201).json({
        status: "success",
        message: "Tag created successfully",
        data: tag,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/tags/:tagId
 * Update tag (admin only)
 * Body: { name, description, icon, color, order, isActive }
 */
router.put("/:tagId", authMiddleware, async (req, res, next) => {
  try {
    // if (!req.user.isAdmin) {
    //   throw new AppError("Only admins can update tags", 403);
    // }

    const { name, description, icon, color, order, isActive } = req.body;

    const tag = await tagService.updateTag(req.params.tagId, {
      name,
      description,
      icon,
      color,
      order,
      isActive,
    });

    res.json({
      status: "success",
      message: "Tag updated successfully",
      data: tag,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tags/:tagId
 * Soft delete tag (admin only)
 */
router.delete("/:tagId", authMiddleware, async (req, res, next) => {
  try {
    // if (!req.user.isAdmin) {
    //   throw new AppError("Only admins can delete tags", 403);
    // }

    const tag = await tagService.deleteTag(req.params.tagId);

    res.json({
      status: "success",
      message: "Tag deleted successfully",
      data: tag,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tags/search
 * Search tags by name
 * Query params: q=search_query
 */
router.get("/search/all", async (req, res, next) => {
  try {
    const query = req.query.q;

    if (!query) {
      throw new AppError("Search query is required", 400);
    }

    const tags = await tagService.searchTags(query);

    res.json({
      status: "success",
      data: tags,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
