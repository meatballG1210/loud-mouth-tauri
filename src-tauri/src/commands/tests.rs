#[cfg(test)]
mod tests {
    use crate::commands::upload_video;

    #[tokio::test]
    async fn test_upload_video_with_valid_file() {
        let file_path = "test_video.txt".to_string();
        let title = "Test Video".to_string();
        let user_id = 1;

        let result = upload_video(file_path, title, user_id).await;
        assert!(result.is_ok());

        let metadata = result.unwrap();
        assert_eq!(metadata.title, "Test Video");
        assert_eq!(metadata.user_id, 1);
        assert_eq!(metadata.original_name, "test_video.txt");
        assert!(!metadata.id.is_empty());
    }

    #[tokio::test]
    async fn test_upload_video_with_empty_file_path() {
        let file_path = "".to_string();
        let title = "Test Video".to_string();
        let user_id = 1;

        let result = upload_video(file_path, title, user_id).await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "INVALID_INPUT");
        assert!(error.message.contains("File path cannot be empty"));
    }

    #[tokio::test]
    async fn test_upload_video_with_empty_title() {
        let file_path = "test_video.txt".to_string();
        let title = "".to_string();
        let user_id = 1;

        let result = upload_video(file_path, title, user_id).await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "INVALID_INPUT");
        assert!(error.message.contains("Title cannot be empty"));
    }

    #[tokio::test]
    async fn test_upload_video_with_invalid_user_id() {
        let file_path = "test_video.txt".to_string();
        let title = "Test Video".to_string();
        let user_id = 0;

        let result = upload_video(file_path, title, user_id).await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "INVALID_INPUT");
        assert!(error.message.contains("User ID must be positive"));
    }

    #[tokio::test]
    async fn test_upload_video_with_nonexistent_file() {
        let file_path = "nonexistent_file.mp4".to_string();
        let title = "Test Video".to_string();
        let user_id = 1;

        let result = upload_video(file_path, title, user_id).await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "FILE_NOT_FOUND");
        assert!(error.message.contains("The specified file does not exist"));
    }
}