# Vanta Cold Blog Design Guidelines

## Design Approach: Reference-Based (Music & Lifestyle Editorial)

**Primary Inspiration Sources:**
- **Instagram/Spotify**: Visual-first content presentation with grid systems
- **Medium**: Clean, distraction-free reading experience with excellent typography
- **Modern Music Brands**: Bold, trendy aesthetics with strong visual identity

**Core Design Principles:**
1. Photography-first: Images drive the experience
2. Editorial quality: High-end magazine-style layouts
3. Contemporary edge: Bold, confident, trend-aware design
4. Immersive reading: Distraction-free blog experience

---

## Typography System

**Font Selection:**
- **Headlines**: "Space Grotesk" (Bold, 700) - Modern geometric sans with strong personality
- **Body Text**: "Inter" (Regular 400, Medium 500) - Exceptional readability for long-form content
- **Accents**: "Space Grotesk" (Medium, 500) for labels and metadata

**Type Scale:**
- Hero/Display: text-6xl to text-8xl (60-96px)
- Page Titles: text-4xl to text-5xl (36-48px)
- Article Headlines: text-3xl to text-4xl (30-36px)
- Section Headers: text-2xl (24px)
- Body Text: text-base to text-lg (16-18px)
- Metadata/Labels: text-sm (14px)
- Captions: text-xs (12px)

**Line Heights:**
- Headlines: leading-tight (1.25)
- Body copy: leading-relaxed (1.625)
- Captions: leading-normal (1.5)

---

## Layout System

**Spacing Primitives:**
Primary units: **2, 4, 6, 8, 12, 16, 24** (Tailwind scale)

**Container Strategy:**
- Max-width content: `max-w-7xl` (1280px) for main layouts
- Article reading width: `max-w-3xl` (768px) for optimal readability
- Full-bleed sections: `w-full` for image galleries and hero areas

**Grid Systems:**
- **Homepage Feed**: 3-column masonry grid (lg), 2-column (md), 1-column (mobile)
- **Photo Galleries**: 2-4 column flexible grids with varying aspect ratios
- **Related Posts**: 3-card horizontal scroll on mobile, grid on desktop

**Vertical Rhythm:**
- Section spacing: py-16 to py-24 (desktop), py-12 (mobile)
- Component spacing: gap-8 to gap-12 between major elements
- Card internal padding: p-6 to p-8

---

## Component Library

### Navigation
**Header**: Fixed/sticky top navigation with blur backdrop
- Logo left-aligned (text-2xl, font-bold)
- Navigation links right-aligned (text-sm, uppercase, tracking-wide)
- Search icon and user/admin menu
- Height: h-20, backdrop-blur-md

### Homepage Components

**Hero Section** (if featured post exists):
- Full-viewport height (min-h-screen or h-[85vh])
- Large hero image with gradient overlay (bottom-to-top)
- Content positioned bottom-left with generous padding (p-12 to p-16)
- Title: text-5xl to text-7xl, font-bold, max-w-3xl
- Excerpt: text-xl, mt-4, max-w-2xl
- CTA: Large pill button with blur backdrop, mt-8

**Post Grid/Feed**:
- Masonry layout with varied card heights based on image aspect ratios
- Card structure: Image (aspect-[4/5] or aspect-[3/4]) + content overlay on hover OR content below
- Metadata bar: Category tag, date, read time (text-sm, flex gap-4)
- Title: text-2xl, font-bold, line-clamp-2
- Excerpt: text-base, line-clamp-3, mt-2
- Smooth hover transitions (transition-all duration-300)

**Featured/Highlighted Posts**:
- Larger card spanning 2 columns in grid
- More prominent imagery and typography
- "Featured" label badge (text-xs, uppercase, px-3 py-1, rounded-full)

### Individual Post Page

**Post Hero**:
- Full-width hero image (h-[60vh] to h-[70vh])
- Gradient overlay for text readability
- Metadata centered over image: Category, date, read time
- Title: text-5xl to text-6xl, font-bold, centered, max-w-4xl mx-auto
- Author info with small circular avatar

**Article Content Area**:
- Centered column: max-w-3xl mx-auto
- Generous top margin after hero: mt-16
- Prose styling with proper spacing:
  - Paragraphs: mb-6, text-lg, leading-relaxed
  - Headings: H2 (text-3xl, mt-12, mb-4), H3 (text-2xl, mt-8, mb-3)
  - Blockquotes: border-l-4, pl-6, italic, text-xl
  - Lists: ml-6, mb-6, space-y-2

**In-Article Photo Galleries**:
- Full-bleed breakout from content column (break out to max-w-7xl)
- 2-3 column grids with gap-4
- Lightbox functionality on click
- Captions: text-sm, text-center, mt-2

**Post Footer**:
- Share buttons: Horizontal pill-shaped buttons with icons
- Tags: Rounded-full badges with gap-2 spacing
- Author bio card: Flex layout with avatar, name, description

**Related Posts Section**:
- 3-card grid below article
- Smaller card format: Image (aspect-[16/9]) + title + metadata
- "More from Vanta Cold" heading (text-3xl, mb-8)

### About/Journey Page

**About Hero**:
- Split layout: Large image (60% width) + content (40% width) on desktop
- Stack on mobile
- Content includes: Brand story, mission, text-lg to text-xl

**Journey Timeline** (if applicable):
- Vertical timeline with milestone cards
- Alternating left/right layout (desktop)
- Year markers, event cards with images and descriptions

### Common UI Elements

**Buttons**:
- Primary CTA: Rounded-full, px-8 py-4, text-base font-medium
- Secondary: Rounded-full, border-2, px-6 py-3
- Icon buttons: Circular, w-12 h-12, centered content
- Buttons over images: backdrop-blur-md with semi-transparent background

**Cards**:
- Rounded-2xl corners for modern feel
- Subtle shadow on hover: shadow-lg transition
- Padding: p-6 to p-8 for content areas
- Overflow hidden for image containment

**Forms** (for comments/contact if needed):
- Input fields: Rounded-lg, px-4 py-3, border-2, focus:border transition
- Textarea: Rounded-lg, min-h-[120px]
- Labels: text-sm, font-medium, mb-2

**Category/Tag Badges**:
- Rounded-full, px-4 py-1.5, text-xs uppercase, font-medium, tracking-wide

**Loading States**:
- Skeleton screens with shimmer animation
- Smooth fade-in for images (opacity transition)

### Footer
- Three-column layout (desktop): About, Quick Links, Social
- Newsletter signup: Large input with inline button
- Social icons: Circle icons, w-10 h-10
- Copyright and brand info
- Padding: pt-16 pb-8

---

## Animation Guidelines

**Use Sparingly - Key Moments Only:**
1. **Image Loading**: Subtle fade-in (opacity: 0 to 1, duration-500)
2. **Card Hovers**: Transform scale-105 on hover with smooth transition
3. **Page Transitions**: Gentle fade-in for content appearance
4. **Scroll Reveals**: Optional subtle fade-up for section entries (use framer-motion or similar)

**Avoid**: Complex scroll-triggered animations, parallax effects (unless specific section), carousel auto-play

---

## Accessibility Standards

- All images include descriptive alt text
- Proper heading hierarchy (H1 → H2 → H3)
- Focus states for all interactive elements (ring-2 ring-offset-2)
- Sufficient contrast ratios throughout
- Keyboard navigation support
- ARIA labels for icon-only buttons

---

## Images Section

**Hero Images:**
- Homepage Hero: Large lifestyle/music production photo, high-quality, 1920x1080 minimum
- Individual Post Heroes: Full-width editorial-style images relevant to each post topic

**Blog Post Images:**
- In-article photos showcasing lifestyle, studio sessions, behind-the-scenes
- Gallery images in various aspect ratios (portrait, landscape, square)
- Placeholder: Use high-quality stock images from Unsplash (music, lifestyle, creative categories)

**About Page:**
- Brand/artist photo for hero split section
- Optional milestone photos for journey timeline

All images should maintain a consistent editorial quality and moody, contemporary aesthetic aligned with music/lifestyle branding.