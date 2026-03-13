# Shared Components for GravityJS Website

This directory contains reusable components that can be included across all HTML pages in the GravityJS website.

## Available Components

### 1. Navigation (`navigation.html`)
- Common navigation menu with links to all pages
- Automatically sets active state based on current page
- Includes JavaScript for dynamic active link highlighting

**Usage:** Add a `<div class="nav-container"></div>` element in your HTML body where you want the navigation to appear.

### 2. Footer (`footer.html`)
- Standard footer with copyright and links
- Includes GitHub, Documentation, and License links
- Consistent styling across all pages

**Usage:** Add a `<div class="footer-container"></div>` element before the closing `</body>` tag where you want the footer to appear.

### 3. Common Styles (`common-styles.css`)
Shared CSS styles used across all pages:
- Body and layout styles
- Navigation styles
- Button styles
- Demo section styles
- Physics box and area styles
- Controls panel styles
- Info panel styles
- Attributes list styles

**Usage:** Include in your HTML head:
```html
<link rel="stylesheet" href="includes/common-styles.css">
```

### 4. Component Loader (`includes.js`)
JavaScript that automatically loads navigation and footer components when DOM is ready.

**Usage:** Include at the end of your body:
```html
<script src="includes/includes.js"></script>
```

## Quick Start Guide

To add shared components to a new HTML page, follow these steps:

### 1. Add Navigation Container
Place this near the top of your `<body>`:
```html
<div class="nav-container"></div>
```

### 2. Include Common Styles
In your `<head>` section:
```html
<link rel="stylesheet" href="includes/common-styles.css">
```

### 3. Add Footer Container
Place this before the closing `</body>` tag:
```html
<div class="footer-container"></div>
```

### 4. Include Component Loader Script
Before your page-specific scripts, include:
```html
<script src="includes/includes.js"></script>
```

## Example HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <link rel="stylesheet" href="src/gravity.css">
  <link rel="stylesheet" href="includes/common-styles.css">
</head>
<body>
  <!-- Navigation Container -->
  <div class="nav-container"></div>

  <!-- Your page content here -->
  <div class="container">
    <h1>My Page Title</h1>
    <!-- ... -->
  </div>

  <!-- Footer Container -->
  <div class="footer-container"></div>

  <script src="dist/gravityjs.umd.js"></script>
  <script src="includes/includes.js"></script>
  <script>
    // Your page-specific JavaScript here
  </script>
</body>
</html>
```

## Customization

### Adding Page-Specific Styles
You can add custom styles for individual pages by including a `<style>` tag in the head:
```html
<style>
  /* Your page-specific styles */
</style>
```

### Modifying Navigation Links
Edit `includes/navigation.html` to change links or text.

### Modifying Footer Content
Edit `includes/footer.html` to change footer content or add new links.

## Best Practices

1. **Keep components DRY**: When you need to update navigation or footer, make changes in one place.
2. **Use common styles first**: Always include `common-styles.css` before page-specific styles.
3. **Test on multiple pages**: After modifying shared components, verify they work correctly across all pages.
4. **Page-specific overrides**: Use page-specific CSS for unique requirements that shouldn't affect other pages.

## Troubleshooting

### Navigation not appearing
- Ensure the `nav-container` div exists in your HTML
- Check that `includes.js` is loaded before DOM ready event fires

### Styles not applying
- Verify `common-styles.css` path is correct
- Check browser console for any CSS loading errors
- Ensure other styles don't override common styles (check specificity)

### Active navigation link wrong
- The system automatically detects current page based on URL
- Clear browser cache if changes aren't reflecting