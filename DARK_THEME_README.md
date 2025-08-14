# MCQ Portal - Dark Theme Implementation

## Overview
This project has been enhanced with a comprehensive dark theme featuring a red and purple color scheme. The implementation includes:

## Features Added

### 🎨 Dark Theme System
- **Toggle Switch**: Theme toggle component with sun/moon icons
- **System Preference Detection**: Automatically detects user's system dark mode preference
- **Persistent Settings**: Theme preference saved in localStorage
- **Smooth Transitions**: Animated transitions between light and dark modes

### 🎨 Color Scheme
- **Primary Colors**: 
  - Red accents: `#ef4444` to `#7f1d1d` (accent-red-500 to accent-red-900)
  - Purple accents: `#a855f7` to `#581c87` (accent-purple-500 to accent-purple-900)
- **Dark Background Colors**:
  - Primary: `#0f0f0f` (dark-bg-primary)
  - Secondary: `#1a1a1a` (dark-bg-secondary)
  - Tertiary: `#262626` (dark-bg-tertiary)
- **Dark Text Colors**:
  - Primary: `#ffffff` (dark-text-primary)
  - Secondary: `#d1d5db` (dark-text-secondary)
  - Tertiary: `#9ca3af` (dark-text-tertiary)

### 🛠️ Implementation Details

#### Files Modified:
1. **`tailwind.config.js`** - Extended color palette and enabled dark mode
2. **`src/index.css`** - Added custom CSS classes and dark theme utilities
3. **`src/contexts/ThemeContext.tsx`** - Theme management context
4. **`src/components/ThemeToggle.tsx`** - Theme toggle component
5. **`src/App.tsx`** - Integrated theme provider
6. **`src/pages/LoginPage.tsx`** - Updated with dark theme styling
7. **`src/pages/TeacherDashboard.tsx`** - Updated with dark theme styling
8. **`src/pages/StudentDashboard.tsx`** - Updated with dark theme styling
9. **`src/components/LoadingSpinner.tsx`** - Enhanced loading spinner

#### Key CSS Classes Added:
- `.btn-primary` - Gradient button with red to purple colors
- `.btn-secondary` - Secondary button style for dark theme
- `.btn-ghost` - Minimal button style
- `.card` - Enhanced card component with dark theme support
- `.input` - Form input styling with dark theme
- `.gradient-bg` - Background gradient for both themes
- `.gradient-text` - Gradient text effect

### 🎯 Features:
- **Responsive Design**: Works seamlessly across all screen sizes
- **Accessible**: Proper contrast ratios and ARIA labels
- **Animated**: Smooth hover effects and transitions
- **Modern UI**: Contemporary design with gradient effects and shadows

### 🚀 Usage

#### Toggle Theme:
The theme toggle button is available in the top-right corner of:
- Login page
- Teacher dashboard
- Student dashboard

#### Automatic Detection:
The theme automatically detects the user's system preference on first visit.

#### Manual Control:
Users can manually toggle between light and dark modes using the toggle button.

### 🎨 Color Usage Guidelines:
- **Red gradients**: Used for primary actions and student-related elements
- **Purple gradients**: Used for teacher-related elements and secondary actions
- **Green**: Used for success states and positive metrics
- **Gradient text**: Applied to statistics and important numbers

### 🔧 Development:
To run the development server:
```bash
npm install
npm run dev
```

The dark theme is automatically active and ready to use!
