// Icon upload utility for handling both file uploads and icon library selection
import { getCategories, getIconsByCategory, searchIcons } from "../data/iconLibrary";

/**
 * Upload icon file to Cloudinary
 * @param {File} file - Image file to upload
 * @returns {Promise<{url: string, publicId: string}>} - Uploaded image URL and public ID
 */
export const uploadIconFile = async (file) => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Please upload JPEG, PNG, GIF, or WebP");
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File size exceeds 5MB limit");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "laca/interests");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error("Icon upload error:", error);
    throw new Error("Failed to upload icon. Please try again.");
  }
};

/**
 * Get all available icon categories from library
 * @returns {Array<string>} - List of category names
 */
export const getAvailableCategories = () => {
  return getCategories();
};

/**
 * Get icons by category from library
 * @param {string} category - Category name
 * @returns {Array<{id: string, emoji: string, name: string, category: string}>}
 */
export const getIconsByLib = (category) => {
  return getIconsByCategory(category);
};

/**
 * Search icons in library
 * @param {string} query - Search query
 * @returns {Array<{id: string, emoji: string, name: string, category: string}>}
 */
export const searchIconsLib = (query) => {
  return searchIcons(query);
};

/**
 * Validate icon data (either file URL or emoji)
 * @param {string} iconData - Icon URL or emoji
 * @returns {boolean} - True if valid
 */
export const isValidIcon = (iconData) => {
  if (!iconData) return false;

  // Check if it's a URL
  if (iconData.startsWith("http")) {
    try {
      new URL(iconData);
      return true;
    } catch {
      return false;
    }
  }

  // Check if it's an emoji (single character or emoji sequence)
  return iconData.length > 0 && iconData.length <= 2;
};

/**
 * Format icon for API submission
 * @param {string} iconData - Icon URL or emoji
 * @returns {{type: string, value: string}} - Formatted icon object
 */
export const formatIconForAPI = (iconData) => {
  if (!isValidIcon(iconData)) {
    throw new Error("Invalid icon data");
  }

  if (iconData.startsWith("http")) {
    return {
      type: "image",
      value: iconData,
    };
  }

  return {
    type: "emoji",
    value: iconData,
  };
};

/**
 * Get icon display value (URL or emoji)
 * @param {Object} icon - Icon object from API {type, value}
 * @returns {string} - Icon value for display
 */
export const getIconDisplay = (icon) => {
  if (!icon) return "📌";
  return icon.value || "📌";
};

export default {
  uploadIconFile,
  getAvailableCategories,
  getIconsByLib,
  searchIconsLib,
  isValidIcon,
  formatIconForAPI,
  getIconDisplay,
};
