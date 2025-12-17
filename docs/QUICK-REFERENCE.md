# Quick Reference

## State

```javascript
// Read
const { user, view } = store.getState();

// Write
store.setState({ view: 'main' });

// Subscribe
store.subscribe(state => render(state));

// Derived (computed values)
const level = derived(store, s => Math.floor(s.points / 100));
level.get(); // current value
```

## Router

```javascript
// Define route
route('/path', (params) => { /* handler */ });

// Navigate
navigate('/path');

// Current path
getCurrentPath(); // '/path'

// Route params
route('/user/:id', ({ id }) => { /* ... */ });
```

## Events

```javascript
// Delegate clicks
delegate(container, 'click', '.selector', (event, element) => {
    const id = element.dataset.id;
});

// In HTML
<button data-action="save" data-id="123">Save</button>
```

## Components

```javascript
// Use component
UserCard({ username: 'Niko', streak: 5 })

// Render list
renderList(items, ItemComponent)

// Available: UserCard, NotificationItem, PointsBadge, 
// EmptyState, LoadingSpinner, Button, Card, Toast
```

## Escape

```javascript
escapeHtml(str)      // For HTML content
escapeAttr(str)      // For attributes
sanitizeUrl(url)     // For URLs
```

## Validation

```javascript
// Rules
rules.required
rules.minLength(3)
rules.maxLength(20)
rules.username
rules.email
rules.pattern(/regex/, 'error message')

// Validate
validate(value, rules.required, rules.username)
// { valid: boolean, error?: string }

validateForm({ field: value }, { field: [rules...] })
// { valid: boolean, errors: { field: string } }
```

## DOM Helpers

```javascript
byId('id')           // getElementById
$('.selector')       // querySelector
$$('.selector')      // querySelectorAll
show(el)             // remove .hidden
hide(el)             // add .hidden
setText(el, 'text')  // set textContent
setHtml(el, '<div>') // set innerHTML
addClass(el, 'cls')
removeClass(el, 'cls')
getInputValue('id')  // get trimmed input value
```

## API

```javascript
api.checkUsername(username)
api.saveUser({ userId, username, deviceId, recoveryAnswer })
api.recoverAccount({ username, recoveryAnswer, deviceId })
api.getUsers()
api.recordSquat({ userId, date })
```

## Storage

```javascript
storage.getUser()     // { userId, username }
storage.setUser(data)
storage.clearUser()
storage.getTheme()
storage.setTheme('dark')
storage.getDeviceId()
```
