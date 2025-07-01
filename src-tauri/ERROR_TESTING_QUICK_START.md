# Quick Start: Testing Error Handling

## 1. Run Unit Tests (Backend)
```bash
cd src-tauri
cargo test error_tests
```
✅ All 6 tests should pass

## 2. Test in the Application (Frontend)

Start the app:
```bash
npm run tauri dev
```

Then navigate to: http://localhost:1420/error-test

Click the buttons to test different error scenarios:
- 🔴 **Test Not Found** - Returns error with code "NOT_FOUND"
- 🟠 **Test Validation Error** - Returns error with details field
- 🟡 **Test DB Error** - Database query failure
- 🟣 **Test Duplicate User** - Unique constraint violation
- 🟢 **Test Success** - Successful call (no error)

## 3. Browser Console Testing

Open DevTools (F12) and test directly:

```javascript
// Should fail with NOT_FOUND error
await window.__TAURI__.core.invoke('test_error_not_found')

// Should fail with validation error + details
await window.__TAURI__.core.invoke('test_error_with_details')

// Should succeed
await window.__TAURI__.core.invoke('get_user_count')
```

## Expected Error Format
```json
{
  "message": "User not found",
  "code": "NOT_FOUND",
  "details": "Optional additional context"
}
```

The error handling framework is working if:
- ✅ Errors are JSON objects (not strings)
- ✅ Each error has a `code` and `message`
- ✅ Optional `details` field appears when provided
- ✅ Frontend can catch and display errors
- ✅ App doesn't crash on errors