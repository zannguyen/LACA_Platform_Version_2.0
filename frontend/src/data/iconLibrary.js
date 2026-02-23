// Icon library for interest management
// Contains predefined icons organized by category

const iconLibrary = [
  // Food & Dining
  {
    id: "food-1",
    emoji: "🍕",
    name: "Pizza",
    category: "Food",
  },
  {
    id: "food-2",
    emoji: "🍔",
    name: "Burger",
    category: "Food",
  },
  {
    id: "food-3",
    emoji: "🍜",
    name: "Noodles",
    category: "Food",
  },
  {
    id: "food-4",
    emoji: "🍱",
    name: "Bento",
    category: "Food",
  },
  {
    id: "food-5",
    emoji: "☕",
    name: "Coffee",
    category: "Food",
  },
  {
    id: "food-6",
    emoji: "🍰",
    name: "Cake",
    category: "Food",
  },

  // Travel & Adventure
  {
    id: "travel-1",
    emoji: "✈️",
    name: "Flight",
    category: "Travel",
  },
  {
    id: "travel-2",
    emoji: "🏖️",
    name: "Beach",
    category: "Travel",
  },
  {
    id: "travel-3",
    emoji: "🏔️",
    name: "Mountain",
    category: "Travel",
  },
  {
    id: "travel-4",
    emoji: "🗼",
    name: "Landmark",
    category: "Travel",
  },
  {
    id: "travel-5",
    emoji: "🧳",
    name: "Luggage",
    category: "Travel",
  },
  {
    id: "travel-6",
    emoji: "🚗",
    name: "Road Trip",
    category: "Travel",
  },

  // Sports & Fitness
  {
    id: "sports-1",
    emoji: "⚽",
    name: "Football",
    category: "Sports",
  },
  {
    id: "sports-2",
    emoji: "🏀",
    name: "Basketball",
    category: "Sports",
  },
  {
    id: "sports-3",
    emoji: "🎾",
    name: "Tennis",
    category: "Sports",
  },
  {
    id: "sports-4",
    emoji: "🏋️",
    name: "Gym",
    category: "Sports",
  },
  {
    id: "sports-5",
    emoji: "🚴",
    name: "Cycling",
    category: "Sports",
  },
  {
    id: "sports-6",
    emoji: "🏊",
    name: "Swimming",
    category: "Sports",
  },

  // Shopping & Fashion
  {
    id: "shopping-1",
    emoji: "👗",
    name: "Fashion",
    category: "Shopping",
  },
  {
    id: "shopping-2",
    emoji: "👠",
    name: "Shoes",
    category: "Shopping",
  },
  {
    id: "shopping-3",
    emoji: "💄",
    name: "Beauty",
    category: "Shopping",
  },
  {
    id: "shopping-4",
    emoji: "🛍️",
    name: "Shopping",
    category: "Shopping",
  },
  {
    id: "shopping-5",
    emoji: "💍",
    name: "Jewelry",
    category: "Shopping",
  },
  {
    id: "shopping-6",
    emoji: "👜",
    name: "Bags",
    category: "Shopping",
  },

  // Entertainment & Culture
  {
    id: "entertainment-1",
    emoji: "🎬",
    name: "Movies",
    category: "Entertainment",
  },
  {
    id: "entertainment-2",
    emoji: "🎵",
    name: "Music",
    category: "Entertainment",
  },
  {
    id: "entertainment-3",
    emoji: "🎮",
    name: "Gaming",
    category: "Entertainment",
  },
  {
    id: "entertainment-4",
    emoji: "📚",
    name: "Books",
    category: "Entertainment",
  },
  {
    id: "entertainment-5",
    emoji: "🎨",
    name: "Art",
    category: "Entertainment",
  },
  {
    id: "entertainment-6",
    emoji: "🎭",
    name: "Theater",
    category: "Entertainment",
  },

  // Nature & Outdoors
  {
    id: "nature-1",
    emoji: "🌲",
    name: "Forest",
    category: "Nature",
  },
  {
    id: "nature-2",
    emoji: "🌸",
    name: "Flowers",
    category: "Nature",
  },
  {
    id: "nature-3",
    emoji: "🦋",
    name: "Wildlife",
    category: "Nature",
  },
  {
    id: "nature-4",
    emoji: "🌊",
    name: "Ocean",
    category: "Nature",
  },
  {
    id: "nature-5",
    emoji: "🌅",
    name: "Sunrise",
    category: "Nature",
  },
  {
    id: "nature-6",
    emoji: "🌿",
    name: "Plants",
    category: "Nature",
  },

  // Technology & Innovation
  {
    id: "tech-1",
    emoji: "💻",
    name: "Computer",
    category: "Technology",
  },
  {
    id: "tech-2",
    emoji: "📱",
    name: "Mobile",
    category: "Technology",
  },
  {
    id: "tech-3",
    emoji: "🤖",
    name: "AI",
    category: "Technology",
  },
  {
    id: "tech-4",
    emoji: "⚡",
    name: "Energy",
    category: "Technology",
  },
  {
    id: "tech-5",
    emoji: "🔬",
    name: "Science",
    category: "Technology",
  },
  {
    id: "tech-6",
    emoji: "🛸",
    name: "Innovation",
    category: "Technology",
  },

  // Health & Wellness
  {
    id: "health-1",
    emoji: "🧘",
    name: "Yoga",
    category: "Health",
  },
  {
    id: "health-2",
    emoji: "🥗",
    name: "Healthy Food",
    category: "Health",
  },
  {
    id: "health-3",
    emoji: "💪",
    name: "Strength",
    category: "Health",
  },
  {
    id: "health-4",
    emoji: "😴",
    name: "Sleep",
    category: "Health",
  },
  {
    id: "health-5",
    emoji: "🧠",
    name: "Mental Health",
    category: "Health",
  },
  {
    id: "health-6",
    emoji: "❤️",
    name: "Wellness",
    category: "Health",
  },

  // Education & Learning
  {
    id: "education-1",
    emoji: "📖",
    name: "Learning",
    category: "Education",
  },
  {
    id: "education-2",
    emoji: "🎓",
    name: "Graduation",
    category: "Education",
  },
  {
    id: "education-3",
    emoji: "✏️",
    name: "Writing",
    category: "Education",
  },
  {
    id: "education-4",
    emoji: "🔭",
    name: "Research",
    category: "Education",
  },
  {
    id: "education-5",
    emoji: "💡",
    name: "Ideas",
    category: "Education",
  },
  {
    id: "education-6",
    emoji: "🎯",
    name: "Goals",
    category: "Education",
  },
];

// Get unique categories
export const getCategories = () => {
  const categories = [...new Set(iconLibrary.map((icon) => icon.category))];
  return categories.sort();
};

// Get icons by category
export const getIconsByCategory = (category) => {
  return iconLibrary.filter((icon) => icon.category === category);
};

// Get all icons
export const getAllIcons = () => {
  return iconLibrary;
};

// Search icons
export const searchIcons = (query) => {
  const lowerQuery = query.toLowerCase();
  return iconLibrary.filter(
    (icon) =>
      icon.name.toLowerCase().includes(lowerQuery) ||
      icon.category.toLowerCase().includes(lowerQuery)
  );
};

export default iconLibrary;
