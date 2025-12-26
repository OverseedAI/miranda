# Component Usage Guide

All components are located in `/Users/hal/overseed/playground/langchain-test/src/frontend/components/`

## Import

```typescript
import { StatusBar, SearchBar, ViewToggle, Filters } from "./components";
```

## StatusBar

Displays system status information in a horizontal bar.

```tsx
<StatusBar
  status={{
    scheduler: { isRunning: true, intervalMs: 3600000 },
    config: { model: "gpt-4", videoWorthyThreshold: 70 }
  }}
  articleCount={42}
  lastCrawl="2025-12-25 10:00"
/>
```

**Features:**
- Green/gray indicator for running/idle scheduler
- Automatic conversion of intervalMs to hours
- Subtle gray background with small text
- Optional lastCrawl timestamp

---

## SearchBar

Search input with button and loading state.

```tsx
const [query, setQuery] = useState("");
const [loading, setLoading] = useState(false);

const handleSearch = async () => {
  setLoading(true);
  // Perform search...
  setLoading(false);
};

<SearchBar
  value={query}
  onChange={setQuery}
  onSearch={handleSearch}
  loading={loading}
/>
```

**Features:**
- Search icon in input field
- Enter key triggers search
- Loading spinner in button when searching
- Button disabled during loading

---

## ViewToggle

Toggle between grid and table view modes.

```tsx
const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

<ViewToggle mode={viewMode} onChange={setViewMode} />
```

**Features:**
- Grid and table icons
- Active state with blue background
- Smooth transitions
- Inline SVG icons

---

## Filters

Multi-select category and urgency filters with score slider.

```tsx
const [filters, setFilters] = useState({
  categories: [],
  urgencies: [],
  minScore: 0,
});

<Filters filters={filters} onChange={setFilters} />
```

**Features:**
- Multi-select category pills
- Color-coded urgency pills:
  - Breaking: Red
  - Timely: Yellow
  - Evergreen: Green
- Score slider (0-100)
- Active state shows blue for categories, colored for urgencies

**Available Categories:**
- major_product_launch
- industry_impact
- trending_viral
- developer_tools
- research_breakthrough
- pricing_change
- api_update
- not_video_worthy

**Available Urgencies:**
- breaking
- timely
- evergreen

---

## Testing

All components have comprehensive test coverage:

```bash
bun test src/frontend/components/*.test.tsx
```

**Test Coverage:**
- Component rendering
- User interactions (clicks, typing, keyboard events)
- State updates
- Loading states
- Edge cases (null values, empty states)

---

## Styling

All components use Tailwind CSS classes. Ensure Tailwind is configured in your project.

**Color Palette:**
- Primary: Blue (blue-600)
- Success: Green (green-500/600)
- Warning: Yellow (yellow-600)
- Danger: Red (red-600)
- Neutral: Gray (gray-100-700)

---

## TypeScript

All components are fully typed with TypeScript. Props are validated at compile time.

**Type Safety:**
- Strict mode enabled
- All props have explicit types
- No implicit any types
- Optional props clearly marked
