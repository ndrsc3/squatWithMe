# Architecture Overview

A vanilla JavaScript single-page application with no framework dependencies.

## Project Structure

```
src/
├── main.js           # App entry point
├── state.js          # Reactive state management
├── router.js         # Hash-based routing
├── modules/          # Business logic
│   ├── api.js        # API client
│   ├── auth.js       # Authentication
│   ├── squats.js     # Squat domain logic
│   ├── storage.js    # localStorage wrapper
│   ├── utils.js      # Date helpers, logging
│   └── validation.js # Form validation
└── ui/               # UI layer
    ├── render.js     # View rendering
    ├── components.js # Reusable templates
    ├── dom.js        # DOM helpers
    ├── events.js     # Event delegation
    ├── escape.js     # XSS prevention
    ├── grid.js       # Squat grid
    └── theme.js      # Theme toggle
```

## Data Flow

```
User Action → Router/Events → State → Render → DOM
```

1. **User clicks** or navigates
2. **Router** handles URL changes, **Events** handle clicks
3. **State** updates via `store.setState()`
4. **Render** subscribes to state, updates UI
5. **DOM** reflects new state

## Key Concepts

### State (`state.js`)

Single source of truth. All app data lives here.

```javascript
import { createStore } from './state.js';

const store = createStore({ user: null, view: 'setup' });

// Update
store.setState({ user: { name: 'Niko' } });

// Read
const { user } = store.getState();

// React to changes
store.subscribe(state => render(state));
```

### Router (`router.js`)

Hash-based URLs (`#/path`). No server config needed.

```javascript
import { route, navigate, initRouter } from './router.js';

// Register routes
route('/', () => store.setState({ view: 'main' }));
route('/profile', () => store.setState({ view: 'profile' }));

// Navigate
navigate('/profile');  // Changes URL to #/profile

// Start listening
initRouter();
```

### Event Delegation (`ui/events.js`)

One listener handles many elements. Works with dynamic content.

```javascript
import { delegate } from './ui/events.js';

// Instead of adding listeners to each button:
delegate(document.body, 'click', '[data-action="delete"]', (e, el) => {
    const id = el.dataset.id;
    deleteItem(id);
});
```

### Components (`ui/components.js`)

Functions that return HTML strings.

```javascript
import { UserCard, renderList } from './ui/components.js';

// Single component
const html = UserCard({ username: 'Niko', streak: 5 });

// List of components
const listHtml = renderList(users, UserCard);
```

### Escape (`ui/escape.js`)

Prevents XSS when rendering user content.

```javascript
import { escapeHtml } from './ui/escape.js';

// UNSAFE: element.innerHTML = userInput;
// SAFE:   element.innerHTML = escapeHtml(userInput);
// SAFEST: element.textContent = userInput;
```

### Validation (`modules/validation.js`)

Reusable validation rules.

```javascript
import { rules, validate, validateForm } from './modules/validation.js';

// Single field
const result = validate(username, rules.required, rules.username);
// { valid: false, error: 'Username must be at least 2 characters' }

// Entire form
const { valid, errors } = validateForm(
    { username: 'jo', email: '' },
    { username: [rules.required, rules.username] }
);
```

## Adding a New Feature

### 1. Add Route (if new page)

```javascript
// main.js
route('/newpage', () => store.setState({ view: 'newpage' }));
```

### 2. Add View Render

```javascript
// ui/render.js
case 'newpage':
    renderNewPageView(state);
    break;
```

### 3. Add State (if needed)

```javascript
// state.js - add to initialState
export const initialState = {
    // ...existing
    newFeatureData: null,
};
```

### 4. Add Module (if complex logic)

```javascript
// modules/newfeature.js
export function doSomething() { /* ... */ }
```

## File Responsibilities

| File | Does | Doesn't |
|------|------|---------|
| `main.js` | Init, event handlers, orchestration | DOM manipulation |
| `state.js` | Hold data, notify subscribers | Know about UI |
| `router.js` | URL ↔ state mapping | Rendering |
| `modules/*` | Business logic, API calls | Touch DOM |
| `ui/render.js` | Update DOM from state | Handle events |
| `ui/components.js` | Generate HTML strings | Add event listeners |

## Patterns

### Always escape user content

```javascript
// In components.js
import { escapeHtml } from './escape.js';
return `<div>${escapeHtml(username)}</div>`;
```

### Use textContent when possible

```javascript
// Safe (no escaping needed)
element.textContent = userInput;

// Needs escaping
element.innerHTML = `<span>${escapeHtml(userInput)}</span>`;
```

### Keep modules pure

```javascript
// Good: returns data
export function calculateStreak(squats) {
    return /* number */;
}

// Avoid: manipulates DOM
export function calculateStreak(squats) {
    document.getElementById('streak').textContent = /* ... */;
}
```

### State drives UI

```javascript
// Good: update state, let render handle UI
store.setState({ isLoading: true });

// Avoid: direct DOM manipulation scattered everywhere
document.getElementById('button').classList.add('loading');
```
