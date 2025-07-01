#[cfg(test)]
mod tests {
    use super::super::error::*;
    use crate::app_error;
    
    #[test]
    fn test_app_error_creation() {
        let error = AppError::new("TEST_ERROR", "Test message");
        assert_eq!(error.code, "TEST_ERROR");
        assert_eq!(error.message, "Test message");
        assert_eq!(error.details, None);
    }
    
    #[test]
    fn test_app_error_with_details() {
        let error = AppError::new("TEST_ERROR", "Test message")
            .with_details("Additional details");
        assert_eq!(error.code, "TEST_ERROR");
        assert_eq!(error.message, "Test message");
        assert_eq!(error.details, Some("Additional details".to_string()));
    }
    
    #[test]
    fn test_app_error_display() {
        let error = AppError::new("TEST_ERROR", "Test message");
        assert_eq!(format!("{}", error), "[TEST_ERROR] Test message");
        
        let error_with_details = AppError::new("TEST_ERROR", "Test message")
            .with_details("Details");
        assert_eq!(format!("{}", error_with_details), "[TEST_ERROR] Test message - Details");
    }
    
    #[test]
    fn test_diesel_not_found_conversion() {
        let diesel_error = diesel::result::Error::NotFound;
        let app_error: AppError = diesel_error.into();
        assert_eq!(app_error.code, "NOT_FOUND");
        assert_eq!(app_error.message, "The requested resource was not found");
    }
    
    #[test]
    fn test_app_error_macro() {
        let error = app_error!("CODE", "Message");
        assert_eq!(error.code, "CODE");
        assert_eq!(error.message, "Message");
        assert_eq!(error.details, None);
        
        let error_with_details = app_error!("CODE", "Message", "Details");
        assert_eq!(error_with_details.code, "CODE");
        assert_eq!(error_with_details.message, "Message");
        assert_eq!(error_with_details.details, Some("Details".to_string()));
    }
    
    #[test]
    fn test_error_serialization() {
        let error = AppError::new("TEST_ERROR", "Test message")
            .with_details("Test details");
        
        let json = serde_json::to_string(&error).unwrap();
        let expected = r#"{"message":"Test message","code":"TEST_ERROR","details":"Test details"}"#;
        assert_eq!(json, expected);
        
        let error_no_details = AppError::new("TEST_ERROR", "Test message");
        let json_no_details = serde_json::to_string(&error_no_details).unwrap();
        let expected_no_details = r#"{"message":"Test message","code":"TEST_ERROR"}"#;
        assert_eq!(json_no_details, expected_no_details);
    }
}