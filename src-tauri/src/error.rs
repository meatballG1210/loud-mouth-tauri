use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppError {
    pub message: String,
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl AppError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            code: code.into(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)?;
        if let Some(details) = &self.details {
            write!(f, " - {}", details)?;
        }
        Ok(())
    }
}

impl std::error::Error for AppError {}


pub type Result<T> = std::result::Result<T, AppError>;

impl From<diesel::result::Error> for AppError {
    fn from(err: diesel::result::Error) -> Self {
        match err {
            diesel::result::Error::NotFound => {
                AppError::new("NOT_FOUND", "The requested resource was not found")
            }
            diesel::result::Error::DatabaseError(kind, info) => {
                let message = match kind {
                    diesel::result::DatabaseErrorKind::UniqueViolation => {
                        "A unique constraint was violated"
                    }
                    diesel::result::DatabaseErrorKind::ForeignKeyViolation => {
                        "A foreign key constraint was violated"
                    }
                    _ => "A database error occurred",
                };
                AppError::new("DATABASE_ERROR", message)
                    .with_details(info.message())
            }
            _ => AppError::new("DATABASE_ERROR", "An unexpected database error occurred")
                .with_details(err.to_string()),
        }
    }
}


#[macro_export]
macro_rules! app_error {
    ($code:expr, $message:expr) => {
        crate::error::AppError::new($code, $message)
    };
    ($code:expr, $message:expr, $details:expr) => {
        crate::error::AppError::new($code, $message).with_details($details)
    };
}