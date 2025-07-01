# Error Handling Framework Testing Guide

## 1. Run Unit Tests

```bash
cd src-tauri
cargo test error_tests
```

This will run all unit tests for the error types, including:
- Error creation and builder pattern
- Error display formatting
- Diesel error conversions
- Error serialization
- Macro functionality

## 2. Frontend Integration Testing

1. Start the application:
```bash
npm run tauri dev
```

2. Navigate to `/error-test` in the app

3. Test each error scenario:
   - **Test Not Found**: Triggers a NOT_FOUND error
   - **Test Validation Error**: Shows error with details
   - **Test DB Error**: Triggers database query error
   - **Test Duplicate User**: Tests unique constraint violation
   - **Test Success**: Verifies successful calls still work

## 3. Manual Testing Commands

You can also test via the browser console:

```javascript
// Test not found error
await window.__TAURI__.core.invoke('test_error_not_found')
  .catch(err => console.error('Expected error:', err));

// Test validation error with details
await window.__TAURI__.core.invoke('test_error_with_details')
  .catch(err => console.error('Expected error:', err));

// Test database error
await window.__TAURI__.core.invoke('test_database_error')
  .catch(err => console.error('Expected error:', err));

// Test successful call
await window.__TAURI__.core.invoke('get_user_count')
  .then(count => console.log('User count:', count))
  .catch(err => console.error('Unexpected error:', err));
```

## 4. Expected Error Format

All errors should be returned in this format:
```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Optional additional details"
}
```

## 5. Verifying Error Handling

✅ **Successful Test Criteria:**
- Errors are properly serialized to JSON
- Error codes are consistent and meaningful
- Details field is included when provided
- Frontend can catch and display errors properly
- Successful calls return data without wrapping

❌ **Common Issues:**
- If errors return as strings instead of objects, serialization is broken
- If the app crashes on errors, the conversion might be failing
- If errors are too generic, the From traits might not be working