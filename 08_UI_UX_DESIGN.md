# UI/UX Design

## Design Philosophy
**Minimal, informative, non-intrusive overlay** - The UI is an overlay that sits directly on top of the League of Legends game window. It should provide valuable information without distracting from gameplay or blocking game interactions.

## Design System

### Color Palette
```css
/* Primary Colors */
--primary: #0ac8b9;           /* League Teal */
--primary-dark: #08a0a0;
--primary-light: #4cd9c4;

/* Secondary Colors */
--secondary: #c8aa6e;         /* Gold */
--secondary-dark: #a07f46;
--secondary-light: #e0c890;

/* Neutral Colors */
--background: #091428;       /* Dark Blue */
--surface: #0a323c;           /* Lighter Blue */
--surface-light: #1e282d;
--text-primary: #f0f0f0;
--text-secondary: #a0a0a0;
--text-muted: #606060;

/* Status Colors */
--success: #0ac8b9;
--warning: #f0b232;
--error: #ff4d4d;
--info: #4d9eff;
```

### Typography
```css
/* Font Family */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Fira Code', 'Consolas', monospace;

/* Font Sizes */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

## Overlay Architecture

### Overlay Positioning
- User-positionable (drag to desired location)
- Default positions: Top-right, Top-left, Bottom-right, Bottom-left
- Click-through for non-interactive areas
- Semi-transparent background to see game underneath
- Collapsible/expandable panels

### Overlay States
- **Champion Select Overlay**: Appears during champion select phase
- **In-Game Overlay**: Appears during active match
- **Post-Game Overlay**: Appears after match completion
- **Settings Window**: Separate window for configuration (when not in game)

## Screen Designs

### 1. Champion Select Overlay

**Purpose**: Provide recommendations during champion selection phase

**Design Principles**:
- Appears over champion select screen
- Click-through for champion selection
- Compact to avoid blocking champion grid
- Auto-dismiss when champion selected

**Layout**:
```
┌─────────────────────────────────────────┐
│  Team Comp Analysis      [−] [×]       │
├─────────────────────────────────────────┤
│  Your: [Top][Jg][Mid][Adc][Sup]        │
│  Enemy: [Top][Jg][Mid][Adc][Sup]        │
├─────────────────────────────────────────┤
│  Recommended Champions                  │
│  [Ahri] M5 54% WR  Fills: Magic, CC     │
│  [Ori]  M4  51% WR  Fills: Siege        │
└─────────────────────────────────────────┘
```

### 2. In-Game Overlay

**Purpose**: Real-time coaching during active match

**Design Principles**:
- Semi-transparent background (adjustable opacity)
- Compact information density
- Minimal animations to avoid distraction
- Positionable by user
- Collapsible panels
- Click-through for non-interactive areas

**Layout**:
```
┌─────────────────────────────────┐
│  Live Coach           [−] [×]   │
├─────────────────────────────────┤
│  Gold: +2.3k  |  KDA: 5/2/4    │
│  CS: 145 (7.5/min)             │
├─────────────────────────────────┤
│  Recommended Items             │
│  [Item] [Item] [Item]          │
├─────────────────────────────────┤
│  Tips                          │
│  • Power spike at 6           │
│  • Group for dragon           │
│  • Enemy ADC fed - focus       │
├─────────────────────────────────┤
│  Enemy Threats                 │
│  [⚠️] Zed - 6/0/2              │
│  [⚠️] Lee Sin - 4/1/8          │
└─────────────────────────────────┘
```

### 3. Post-Game Overlay

**Purpose**: Match performance review after match completion

**Design Principles**:
- Appears over end-of-game screen
- Auto-dismiss when user exits to lobby
- Compact summary with expandable details
- Click-through for honor/report buttons

**Layout**:
```
┌─────────────────────────────────────────┐
│  Match Analysis: Ahri vs Syndra (WIN)   │
├─────────────────────────────────────────┤
│  Performance: 8.5/10  KDA: 12/3/8       │
│  ✓ Early game  ✗ Vision  ✗ Positioning │
├─────────────────────────────────────────┤
│  [View Full Analysis in Settings]      │
└─────────────────────────────────────────┘
```

### 4. Settings Window

**Purpose**: Configure overlay behavior and preferences

**Note**: This is a separate window (not overlay) that opens when not in game or via hotkey

**Layout**:
```
┌─────────────────────────────────────────┐
│  Settings                               │
├─────────────────────────────────────────┤
│  Overlay Settings                       │
│  Position: [Top Right ▼]                │
│  Opacity: [80%]                         │
│  Size: [Medium ▼]                       │
│  Show in champion select: ☑             │
│  Show in game: ☑                        │
├─────────────────────────────────────────┤
│  Recommendations                        │
│  Detail level: [Detailed ▼]             │
│  Sound alerts: ☑                        │
├─────────────────────────────────────────┤
│  Data Management                         │
│  Clear cache                            │
│  Export data                            │
│  Delete all data                        │
├─────────────────────────────────────────┤
│  About                                  │
│  Version: 1.0.0                          │
│  [Check for updates]                    │
└─────────────────────────────────────────┘
```

### 5. Statistics View (Settings Window)

**Purpose**: View detailed statistics and match history

**Note**: This is part of the settings window, accessible when not in game

**Layout**:
```
┌─────────────────────────────────────────┐
│  Statistics                             │
├─────────────────────────────────────────┤
│  Win Rate: 52%  Matches: 156  KDA: 3.2   │
├─────────────────────────────────────────┤
│  Top Champions                          │
│  1. Ahri - 45 games - 54% WR           │
│  2. Orianna - 32 games - 51% WR        │
│  3. Syndra - 28 games - 49% WR         │
├─────────────────────────────────────────┤
│  [View Match History] [View Trends]     │
└─────────────────────────────────────────┘
```


## Component Library

### Buttons
```css
.btn-primary {
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: var(--radius-md);
}
```

### Cards
```css
.card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--surface-light);
}

.card-header {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-3);
}
```

### Badges
```css
.badge {
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.badge-success { background: var(--success); color: white; }
.badge-warning { background: var(--warning); color: white; }
.badge-error { background: var(--error); color: white; }
```

### Tooltips
- Dark background
- White text
- Small arrow
- Fade in/out animation
- 200ms delay before showing

### Modals
- Semi-transparent backdrop
- Centered content
- Escape to close
- Click outside to close
- Smooth scale animation

### Loading States
- Skeleton screens for data loading
- Spinner for async operations
- Progress bars for long operations

## Accessibility

### Keyboard Navigation
- Tab through interactive elements
- Enter/Space to activate
- Escape to close modals
- Arrow keys for lists
- Shortcut keys for common actions

### Screen Reader Support
- ARIA labels for all interactive elements
- Semantic HTML structure
- Alt text for images
- Live regions for dynamic content

### Visual Accessibility
- High contrast mode support
- Scalable font sizes
- Colorblind-friendly indicators (not just color)
- Focus indicators

## Resolution Support

### Desktop (Primary Target)
- 1920x1080 (standard gaming resolution)
- 2560x1440 (QHD)
- 3840x2160 (4K)
- Overlay scales proportionally
- Font sizes adjust based on resolution

### Laptop
- 1366x768 and above
- Compact mode available
- Reduced padding for smaller screens
- Optional minimal overlay mode

## Animation Guidelines

### Principles
- Purposeful and functional
- Subtle and smooth
- **No distracting animations during gameplay**\- Respect user's animation preferences
- Fade in/out for overlay appearance

### Duration
- Overlay appearance: 200-300ms fade
- Panel collapse/expand: 150-200ms
- Data updates: No animation (instant)
- Hover effects: 100-150ms

### Easing
- Standard: cubic-bezier(0.4, 0, 0.2, 1)\- Fade in: ease-out
- Fade out: ease-in
- No bounce or elastic effects (too distracting)

## Iconography

### Icon Library
- Lucide Icons (lightweight, consistent)
- Custom League-inspired icons where needed

### Icon Guidelines
- 24x24px standard size
- Stroke width: 2px
- Consistent corner radius
- Clear visual hierarchy

## Notifications

### Types
- Success (green)
- Warning (yellow)
- Error (red)
- Info (blue)

### Behavior
- Top-right position
- Auto-dismiss after 5s
- Stack multiple notifications
- Manual dismiss option
- Sound notification (optional)

## Error States

### Error Handling
- Clear error messages
- Suggested actions
- Retry mechanisms
- Graceful degradation
- Error logging for debugging

### Empty States
- Friendly illustrations
- Clear messaging
- Call to action
- Helpful suggestions

## Performance

### Overlay Performance
- **Minimal CPU usage** to avoid affecting game FPS
- Efficient React rendering with memoization
- Virtual scrolling for long champion/item lists
- Lazy loading of images and icons
- Debounced API calls to reduce overhead

### Memory Management
- Cache static data (champions, items) in memory
- Clear live match data after match ends
- Limit history data (e.g., last 100 matches)\- Periodic cleanup of old recommendations

### Rendering Optimization
- Use CSS transforms instead of layout changes
- Avoid expensive calculations during render
- Batch DOM updates
- Use requestAnimationFrame for animations

## User Onboarding

### First Run Experience
1. Welcome screen
2. Feature overview
3. API key setup
4. Region selection
5. Tutorial (optional)
6. Ready to use

### Tooltips
- Contextual help
- Feature explanations
- Keyboard shortcuts
- Tips and tricks
