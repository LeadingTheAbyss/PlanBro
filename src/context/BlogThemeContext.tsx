'use client';

import React, { createContext, useContext, useState } from 'react';

interface BlogThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

export const BlogThemeContext = createContext<BlogThemeContextType>({
  isDark: false,
  toggleDark: () => {},
});

export const useBlogTheme = () => useContext(BlogThemeContext);
