# Minimal Step-by-Step Implementation Plan with Checkpoints

## Important Note on Database Migrations

Due to foreign key constraints in SQLite, migrations must be run in the correct order. Each step builds upon the previous tables, so ensure migrations are numbered sequentially and run in order.

---

## Step 1A: Basic Database Foundation (Checkpoint 1)




**Checkpoint Test**:
Frontend can call `get_user_count()` and receive a response
- User profile and settings tables are created successfully

---

## Step 1B: Error Handling Framework (Checkpoint 2)

**Goal**: Establish proper error handling patterns

- Create custom error types in `src/error.rs`
- Implement `From` traits for database errors
- Update `get_user_count()` to use proper error handling
- Add error serialization for Tauri responses

**Checkpoint Test**:
Intentionally cause a database error, verify frontend receives proper error message

---

## Step 2A: Enhanced Video Upload (Checkpoint 3)

**Goal**: Upload and store video files locally with full processing

### 2A.1: Database Migrations
- Create `videos` table migration with fields:
  - id (TEXT PRIMARY KEY)
  - user_id (TEXT NOT NULL, FK to users)
  - title (TEXT NOT NULL)
  - filename (TEXT NOT NULL)
  - original_name (TEXT NOT NULL)
  - path (TEXT NOT NULL)
  - size (INTEGER NOT NULL)
  - mtime (TEXT NOT NULL)
  - duration (INTEGER DEFAULT 0)
  - thumbnail_path (TEXT)
  - has_english_subtitles (BOOLEAN DEFAULT 0)
  - has_chinese_subtitles (BOOLEAN DEFAULT 0)
  - fast_hash (TEXT)
  - full_hash (TEXT)
  - upload_date (TEXT DEFAULT CURRENT_TIMESTAMP)
- Create `file_integrity_checks` table migration:
  - id (TEXT PRIMARY KEY)
  - video_id (TEXT NOT NULL, FK to videos)
  - check_date (TEXT NOT NULL)
  - size_match (BOOLEAN NOT NULL)
  - mtime_match (BOOLEAN NOT NULL)
  - fast_hash_match (BOOLEAN)
  - full_hash_match (BOOLEAN)
  - status (TEXT NOT NULL) -- 'valid', 'invalid', 'missing'

### 2A.2: Video Upload Command Implementation
- Create `upload_video()` Tauri command in `src/commands/video.rs`
- Accept parameters: file_path, title, user_id
- Return Result<VideoMetadata, AppError>

### 2A.3: File Validation Module
- Create `src/services/file_validator.rs`
- Implement file size validation (max 4GB)
- Implement file format validation (MP4, AVI, MKV, MOV)
- Create magic number checking for file type verification
- Add virus scanning hook point (for future integration)

### 2A.4: Video Processing with FFmpeg
- Create `src/services/video_processor.rs`
- Implement duration extraction using ffmpeg-next crate
- Implement thumbnail generation at 10% of video duration
- Handle FFmpeg errors gracefully
- Store thumbnail as JPEG in thumbnails directory

### 2A.5: File Storage Management
- Create `src/services/file_storage.rs`
- Design directory structure: `/videos/{user_id}/{year}/{month}/{video_id}/`
- Implement file copying with progress callback
- Create cleanup on failure mechanism
- Ensure proper file permissions (read-only after save)

### 2A.6: Hash Calculation Service
- Create `src/services/hash_calculator.rs`
- Implement fast hash: SHA-256 of first 1MB
- Implement progress callback for large files
- Add async/concurrent hash calculation
- Cache hash results in database

### 2A.7: Metadata Storage
- Create `src/models/video.rs` with Diesel model
- Implement database insertion with transaction
- Add rollback on any failure
- Return complete video metadata to frontend

**Checkpoint Test**:
Upload a 100MB MP4 file, verify:
- File saved to `/videos/{user_id}/2025/01/{video_id}/video.mp4`
- Thumbnail exists at `/videos/{user_id}/2025/01/{video_id}/thumbnail.jpg`
- Duration correctly extracted (e.g., 300 seconds)
- Size/mtime match file system values
- Fast hash calculated and stored
- All database fields populated correctly
- Frontend receives complete metadata response

---

## Step 2B: Enhanced Video Listing (Checkpoint 4)

**Goal**: Retrieve and display uploaded videos with integrity checking

### 2B.1: Get Videos Command
- Create `get_videos()` command in `src/commands/video.rs`
- Accept parameters: user_id, page, per_page, sort_by, filter
- Return Result<VideoListResponse, AppError>

### 2B.2: Database Query Implementation
- Create efficient query with Diesel
- Add indexes on user_id, upload_date
- Implement sorting options: newest, oldest, title, duration
- Add filtering by subtitle availability

### 2B.3: Integrity Validation Service
- Create `validate_on_access()` in `src/services/file_validator.rs`
- Check current file size/mtime against stored values
- If mismatch detected:
  - Log integrity check failure
  - Calculate fast hash for comparison
  - Update file_integrity_checks table
  - Mark video as needs_validation if hash differs

### 2B.4: Pagination Implementation
- Implement offset-based pagination
- Calculate total pages from count query
- Return metadata: current_page, total_pages, total_items
- Optimize with lazy loading of thumbnails

### 2B.5: Video Integrity Command
- Create `validate_video_integrity()` command
- Accept video_id parameter
- Perform full validation sequence:
  - Check file existence
  - Validate size/mtime
  - Recalculate fast hash if needed
  - Optionally calculate full hash
- Return detailed validation report

### 2B.6: Frontend Integration
- Update video list API calls
- Add loading states for integrity checks
- Display validation warnings in UI
- Add retry mechanism for failed validations

**Checkpoint Test**:
With 25 videos uploaded:
- Request page 2 with 10 items per page
- Verify correct 10 videos returned (items 11-20)
- Modify a video file externally
- Refresh list and verify integrity warning appears
- Run validate_video_integrity on modified video
- Confirm validation report shows size/mtime mismatch

---

## Step 3A: Basic Subtitle Support (Checkpoint 5)

**Goal**: Parse and store subtitle files

### 3A.1: Subtitle Database Schema
- Create `subtitles` table migration:
  - id (TEXT PRIMARY KEY)
  - video_id (TEXT NOT NULL, FK to videos)
  - language (TEXT NOT NULL) -- 'english' or 'chinese'
  - filename (TEXT NOT NULL)
  - upload_date (TEXT DEFAULT CURRENT_TIMESTAMP)
  - entry_count (INTEGER DEFAULT 0)
  - UNIQUE(video_id, language)
- Create `subtitle_entries` table migration:
  - id (TEXT PRIMARY KEY)
  - subtitle_id (TEXT NOT NULL, FK to subtitles)
  - index_number (INTEGER NOT NULL)
  - start_time (INTEGER NOT NULL) -- milliseconds
  - end_time (INTEGER NOT NULL) -- milliseconds
  - text (TEXT NOT NULL)
  - INDEX on (subtitle_id, start_time)

### 3A.2: Subtitle Parser Module
- Create `src/services/subtitle_parser.rs`
- Implement SRT format parser:
  - Parse index, timestamps, and text
  - Convert timestamps to milliseconds
  - Handle multi-line subtitles
  - Validate timing sequences
- Add VTT format support:
  - Handle WEBVTT header
  - Parse VTT-specific features
  - Convert to common format

### 3A.3: Upload Subtitle Command
- Create `upload_subtitle()` in `src/commands/subtitle.rs`
- Accept parameters: video_id, language, file_path
- Validate file format (SRT/VTT)
- Check video ownership before upload

### 3A.4: Subtitle Processing Pipeline
- Parse subtitle file into memory
- Validate all entries have valid timestamps
- Check for overlapping time ranges
- Normalize text (trim whitespace, fix encoding)
- Count total entries for metadata

### 3A.5: Database Storage with Transaction
- Begin database transaction
- Delete existing subtitles for same video/language
- Insert subtitle metadata record
- Batch insert all subtitle entries
- Update video record (has_english_subtitles or has_chinese_subtitles)
- Commit transaction or rollback on error

### 3A.6: Error Handling
- Handle malformed subtitle files
- Provide specific error messages:
  - Invalid timestamp format
  - Missing required fields
  - Encoding issues
  - File too large (>5MB)

**Checkpoint Test**:
Upload a 500-entry SRT file for English:
- Verify subtitles table has one record with entry_count=500
- Verify subtitle_entries table has 500 records
- Check all timestamps are in milliseconds
- Verify video record has has_english_subtitles=true
- Upload Chinese subtitles for same video
- Confirm both subtitle sets coexist

---

## Step 3B: Subtitle-Video Association (Checkpoint 6)

**Goal**: Link subtitles to videos and retrieve them

### 3B.1: Get Subtitles Command
- Create `get_subtitles()` in `src/commands/subtitle.rs`
- Accept parameters: video_id, language (optional)
- Return Result<SubtitleData, AppError>

### 3B.2: Efficient Subtitle Query
- Join subtitles and subtitle_entries tables
- Order by index_number for correct sequence
- Implement caching for frequently accessed subtitles
- Return structured data:
  ```rust
  struct SubtitleData {
      subtitle_id: String,
      language: String,
      entries: Vec<SubtitleEntry>,
      total_duration: i32,
  }
  ```

### 3B.3: Subtitle Synchronization Check
- Create `check_subtitle_sync()` helper
- Compare subtitle duration with video duration
- Flag potential sync issues (>5 second difference)
- Return sync quality score

### 3B.4: Multi-Language Support
- If language not specified, return all available
- Structure response for dual-subtitle display
- Ensure consistent timing alignment

### 3B.5: Subtitle Validation
- Verify subtitle ownership matches video
- Check subtitle file still exists
- Validate entry count matches database
- Handle missing or corrupted data gracefully

### 3B.6: Performance Optimization
- Add database indexes for fast retrieval
- Implement subtitle entry pagination for large files
- Cache parsed subtitles in memory (LRU cache)

**Checkpoint Test**:
With video containing both EN and CN subtitles:
- Call get_subtitles(video_id) without language
- Verify both subtitle sets returned
- Check entries are in correct time order
- Call get_subtitles(video_id, "english")
- Verify only English subtitles returned
- Measure query time (<50ms for 1000 entries)

---

## Step 4A: Basic Vocabulary Creation (Checkpoint 7)

**Goal**: Create vocabulary items from subtitle clicks

### 4A.1: Vocabulary Database Schema
- Create `vocabulary` table migration:
  - id (TEXT PRIMARY KEY)
  - user_id (TEXT NOT NULL, FK to users)
  - video_id (TEXT NOT NULL, FK to videos)
  - word (TEXT NOT NULL) -- the Chinese word/phrase clicked
  - timestamp (INTEGER NOT NULL) -- position in video (ms)
  - context_before (TEXT) -- previous sentence
  - context_target (TEXT NOT NULL) -- sentence containing word
  - context_after (TEXT) -- next sentence
  - answer (TEXT NOT NULL) -- matching English subtitle
  - dictionary_response (TEXT) -- optional API response
  - created_at (TEXT DEFAULT CURRENT_TIMESTAMP)
  - INDEX on (user_id, created_at)
  - INDEX on (video_id)

### 4A.2: Add Vocabulary Command
- Create `add_vocabulary_item()` in `src/commands/vocabulary.rs`
- Accept parameters:
  - video_id
  - timestamp (click position)
  - subtitle_id (Chinese subtitle clicked)
  - entry_index (specific entry clicked)

### 4A.3: Context Extraction Service
- Create `src/services/context_extractor.rs`
- Find clicked subtitle entry by index
- Extract 3-sentence context window:
  - Get previous entry (if exists)
  - Get current entry (containing clicked word)
  - Get next entry (if exists)
- Handle edge cases (first/last subtitle)

### 4A.4: English Answer Matching
- Query English subtitles for same video
- Find English subtitle within ±1000ms of timestamp
- If multiple matches, pick closest by time
- If no match found, return error
- Store matched English text as answer

### 4A.5: Duplicate Prevention
- Check if vocabulary item already exists:
  - Same user_id
  - Same video_id
  - Same word
  - Same timestamp (±500ms)
- If exists, return existing item instead

### 4A.6: Initial Review Schedule Creation
- Generate Ebbinghaus review dates:
  - Day 0: created_at
  - Day 1: created_at + 1 day
  - Day 3: created_at + 3 days
  - Day 7: created_at + 7 days
  - Day 14: created_at + 14 days
  - Day 30: created_at + 30 days
- Store schedule in separate table (Step 5A)

**Checkpoint Test**:
Click Chinese subtitle "你好" at 00:01:30:
- Verify vocabulary record created with:
  - word = "你好"
  - timestamp = 90000 (ms)
  - context_target = full Chinese sentence
  - answer = matching English sentence
  - context_before/after populated
- Click same word again
- Verify no duplicate created

---

## Step 4B: Vocabulary Listing (Checkpoint 8)

**Goal**: Display saved vocabulary items

### 4B.1: Get Vocabulary Command
- Create `get_vocabulary()` in `src/commands/vocabulary.rs`
- Accept parameters:
  - user_id (required)
  - video_id (optional filter)
  - search_term (optional)
  - sort_by: 'newest', 'oldest', 'alphabetical'
  - page, per_page

### 4B.2: Advanced Query Building
- Build dynamic query with Diesel
- Apply filters conditionally:
  - Filter by video_id if provided
  - Search in word and answer fields
  - Case-insensitive search
- Implement sorting logic

### 4B.3: Video Grouping Feature
- Add group_by_video option
- Return nested structure:
  ```rust
  struct GroupedVocabulary {
      video_id: String,
      video_title: String,
      items: Vec<VocabularyItem>,
      count: i32,
  }
  ```
- Sort groups by most recent item

### 4B.4: Vocabulary Statistics
- Add `get_vocabulary_stats()` command
- Return statistics:
  - Total vocabulary count
  - Count by video
  - Words learned today/week/month
  - Most common words

### 4B.5: Export Functionality
- Add `export_vocabulary()` command
- Support CSV format
- Include all context and metadata
- Generate downloadable file

### 4B.6: Performance Considerations
- Add composite indexes for common queries
- Implement query result caching
- Limit maximum results per page (100)

**Checkpoint Test**:
With 50 vocabulary items across 3 videos:
- Get all vocabulary (no filters)
- Verify all 50 items returned with pagination
- Filter by specific video_id
- Verify only items from that video returned
- Search for "hello"
- Verify results contain "hello" in word or answer
- Group by video
- Verify 3 groups with correct counts

---

## Step 5A: Basic Review System (Checkpoint 9)

**Goal**: Simple review functionality without spaced repetition

### 5A.1: Review Database Schema
- Create `review_schedules` table migration:
  - id (TEXT PRIMARY KEY)
  - vocabulary_id (TEXT NOT NULL, FK to vocabulary)
  - initial_date (TEXT NOT NULL)
  - review_dates (TEXT NOT NULL) -- JSON array
  - last_reviewed_date (TEXT)
  - completed_reviews (INTEGER DEFAULT 0)
  - is_completed (BOOLEAN DEFAULT 0)
  - next_review_date (TEXT)
  - INDEX on (next_review_date, is_completed)
- Create `review_history` table migration:
  - id (TEXT PRIMARY KEY)
  - vocabulary_id (TEXT NOT NULL, FK to vocabulary)
  - review_date (TEXT NOT NULL)
  - user_answer (TEXT NOT NULL)
  - is_correct (BOOLEAN NOT NULL)
  - similarity_score (REAL) -- 0.0 to 1.0
  - time_taken (INTEGER) -- seconds
  - attempt_number (INTEGER DEFAULT 1)

### 5A.2: Review Schedule Creation
- Automatically create when vocabulary item added
- Store review_dates as JSON array:
  ```json
  ["2025-01-30", "2025-01-31", "2025-02-02", "2025-02-06", "2025-02-13", "2025-02-29"]
  ```
- Set next_review_date to first date
- Initialize completed_reviews to 0

### 5A.3: Get Due Reviews Command
- Create `get_due_reviews()` in `src/commands/review.rs`
- Accept parameters:
  - user_id
  - limit (optional, default 20)
- Query logic:
  - Join vocabulary, review_schedules
  - Filter: next_review_date <= today
  - Filter: is_completed = false
  - Filter: last_reviewed_date != today
  - Order by next_review_date ASC

### 5A.4: Review Answer Validation
- Create `src/services/answer_validator.rs`
- Implement normalization:
  - Convert to lowercase
  - Trim whitespace
  - Remove punctuation
- Calculate exact match first
- Return validation result with score

### 5A.5: Complete Review Command
- Create `complete_review()` command
- Accept parameters:
  - vocabulary_id
  - user_answer
  - time_taken
- Process review:
  - Validate answer (exact match for now)
  - Create review_history entry
  - Update last_reviewed_date
  - Return success/failure result

### 5A.6: Review Session Management
- Track current review session
- Prevent reviewing same item twice in one day
- Handle review interruptions gracefully
- Save progress periodically

**Checkpoint Test**:
Create 5 vocabulary items on Jan 30:
- Verify 5 review_schedules created
- All have next_review_date = "2025-01-30"
- Call get_due_reviews() on Jan 30
- Verify all 5 items returned
- Complete review for item 1 with correct answer
- Verify review_history entry created
- Verify last_reviewed_date updated
- Call get_due_reviews() again
- Verify only 4 items returned (item 1 excluded)

---

## Step 5B: Enhanced Spaced Repetition Algorithm (Checkpoint 10)

**Goal**: Implement Ebbinghaus scheduling with fuzzy matching

### 5B.1: Fuzzy String Matching Implementation
- Add `levenshtein` crate to Cargo.toml
- Update `src/services/answer_validator.rs`:
  - Calculate Levenshtein distance
  - Convert to similarity score (0-1)
  - Set threshold at 0.85 (85%)
  - Handle Unicode properly

### 5B.2: Enhanced Review Completion
- Update `complete_review()` command:
  - Use fuzzy matching for validation
  - Store similarity score in review_history
  - Accept answers with score >= 0.85
  - Provide feedback on near-misses (0.70-0.84)

### 5B.3: Spaced Repetition Scheduling
- Create `calculate_next_review()` function:
  - Get current completed_reviews count
  - Look up next date from review_dates array
  - Handle array bounds (max 6 reviews)
  - Update next_review_date field
  - Mark is_completed if all 6 done

### 5B.4: Late Review Policy Implementation
- Calculate days late:
  ```rust
  let scheduled_date = parse_date(next_review_date);
  let actual_date = today();
  let days_late = (actual_date - scheduled_date).num_days();
  ```
- If days_late > 3:
  - Reset completed_reviews to 0
  - Regenerate review_dates from today
  - Set next_review_date to today
  - Log reset event
- If days_late <= 3:
  - Continue normally
  - Base next review on actual_date

### 5B.5: Review History Analysis
- Add `get_review_history()` command
- Calculate statistics:
  - Average similarity score
  - Success rate by review number
  - Time taken trends
  - Common mistakes

### 5B.6: Adaptive Difficulty
- Track difficulty metrics:
  - Failed attempt count
  - Average similarity score
  - Review reset count
- Flag difficult items for extra practice
- Suggest similar vocabulary for reinforcement

**Checkpoint Test**:
1. Complete review with "Hello World" vs "Hello world" (case difference)
   - Verify accepted with ~0.95 similarity
2. Complete review with "It's a beautiful day" vs "Its a beautifull day" (punctuation + typo)
   - Verify accepted with ~0.86 similarity
3. Review item 4 days late:
   - Verify completed_reviews reset to 0
   - Verify new schedule starts from today
4. Complete all 6 reviews on schedule:
   - Verify is_completed = true
   - Verify no more reviews scheduled

---

## Step 6: Progress Tracking & Analytics (Checkpoint 11)

**Goal**: Implement learning statistics and visualization

### 6.1: Progress Database Schema
- Create `learning_progress` table migration:
  - id (TEXT PRIMARY KEY)
  - user_id (TEXT NOT NULL, FK to users)
  - date (TEXT NOT NULL) -- YYYY-MM-DD
  - study_time (INTEGER DEFAULT 0) -- seconds
  - videos_watched (INTEGER DEFAULT 0)
  - vocabulary_added (INTEGER DEFAULT 0)
  - reviews_completed (INTEGER DEFAULT 0)
  - review_accuracy (REAL) -- 0.0 to 1.0
  - UNIQUE(user_id, date)
- Create `achievements` table migration:
  - id (TEXT PRIMARY KEY)
  - name (TEXT NOT NULL UNIQUE)
  - description (TEXT NOT NULL)
  - icon (TEXT)
  - requirement_type (TEXT) -- 'streak', 'vocabulary', 'reviews', etc.
  - requirement_value (INTEGER)
- Create `user_achievements` table migration:
  - user_id (TEXT NOT NULL, FK to users)
  - achievement_id (TEXT NOT NULL, FK to achievements)
  - earned_date (TEXT NOT NULL)
  - PRIMARY KEY (user_id, achievement_id)
- Create `learning_goals` table migration:
  - id (TEXT PRIMARY KEY)
  - user_id (TEXT NOT NULL, FK to users)
  - goal_type (TEXT NOT NULL) -- 'daily_time', 'weekly_vocabulary', etc.
  - target_value (INTEGER NOT NULL)
  - current_value (INTEGER DEFAULT 0)
  - start_date (TEXT NOT NULL)
  - end_date (TEXT NOT NULL)
  - is_completed (BOOLEAN DEFAULT 0)

### 6.2: Progress Tracking Service
- Create `src/services/progress_tracker.rs`
- Auto-create daily progress record
- Update counters in real-time:
  - Increment study_time on video watch
  - Increment vocabulary_added on creation
  - Track review accuracy per session
- Implement atomic updates to prevent race conditions

### 6.3: Get Learning Stats Command
- Create `get_learning_stats()` in `src/commands/progress.rs`
- Return comprehensive statistics:
  ```rust
  struct LearningStats {
      total_study_time: i32,
      total_vocabulary: i32,
      total_reviews: i32,
      current_streak: i32,
      longest_streak: i32,
      weekly_average: f32,
      accuracy_trend: Vec<f32>,
  }
  ```

### 6.4: Streak Calculation
- Create `calculate_streak()` function:
  - Query learning_progress by date DESC
  - Count consecutive days with activity
  - Handle timezone considerations
  - Cache streak calculation
- Track both current and longest streak

### 6.5: Weekly Progress Analysis
- Create `get_weekly_progress()` command
- Return last 7 days of data:
  - Daily study time
  - Daily vocabulary added
  - Daily review count
  - Rolling accuracy average
- Format for chart visualization

### 6.6: Achievement System
- Seed initial achievements:
  - "First Word" - Add first vocabulary
  - "Week Warrior" - 7-day streak
  - "Century Club" - 100 vocabulary items
  - "Perfect Score" - 100% review accuracy
  - "Marathon Learner" - 30-day streak
- Create `check_achievements()` service:
  - Run after each user action
  - Check unearned achievements
  - Award and notify on completion

### 6.7: Goal Management
- Create `set_learning_goal()` command
- Create `update_goal_progress()` service
- Goal types:
  - Daily study time (minutes)
  - Weekly vocabulary target
  - Monthly review target
- Auto-check goal completion

**Checkpoint Test**:
Simulate 7 days of activity:
- Day 1-3: Add 5 vocabulary, 10 min study, 3 reviews (90% accuracy)
- Day 4: Skip (break streak test)
- Day 5-7: Add 3 vocabulary, 15 min study, 5 reviews (85% accuracy)
Verify:
- Current streak = 3 (days 5-7)
- Longest streak = 3 (days 1-3)
- Weekly average study time = 75/7 = 10.7 min
- "First Word" achievement earned on Day 1
- Weekly progress chart shows gap on Day 4

---

## Step 7: Advanced Features (Checkpoint 12)

**Goal**: Add remaining features from description.md

### 7.1: User Profile Management
- Create `update_user_profile()` in `src/commands/user.rs`
- Updatable fields:
  - username
  - avatar_url
  - native_language
  - subtitle_language
  - video_playback_speed
  - enable_hints
- Validate avatar URL format
- Update last_modified timestamp

### 7.2: Language Preference System
- Create `update_language_settings()` command
- Support languages: 'en', 'zh-CN'
- Update UI language preference
- Update default subtitle language
- Return localized messages

### 7.3: Notification Preferences
- Create `notification_preferences` table:
  - user_id (TEXT PRIMARY KEY, FK to users)
  - review_reminders (BOOLEAN DEFAULT 1)
  - achievement_alerts (BOOLEAN DEFAULT 1)
  - daily_goal_reminders (BOOLEAN DEFAULT 1)
  - reminder_time (TEXT) -- "09:00"
- Create `update_notification_preferences()` command
- Integrate with system notification API

### 7.4: Dictionary API Integration
- Create `src/services/dictionary_service.rs`
- Add configuration for API credentials
- Implement `lookup_word()` function:
  - Cache lookups in vocabulary table
  - Handle API rate limits
  - Fallback to offline dictionary
- Support multiple dictionary providers

### 7.5: Video Playback State
- Create `video_playback_states` table:
  - user_id (TEXT NOT NULL, FK to users)
  - video_id (TEXT NOT NULL, FK to videos)
  - last_position (INTEGER DEFAULT 0) -- milliseconds
  - playback_speed (REAL DEFAULT 1.0)
  - volume (REAL DEFAULT 1.0)
  - updated_at (TEXT DEFAULT CURRENT_TIMESTAMP)
  - PRIMARY KEY (user_id, video_id)
- Create `save_playback_state()` command
- Create `get_playback_state()` command
- Auto-save every 5 seconds during playback

### 7.6: Video Player Commands
- Create `update_playback_position()` command:
  - Debounce to prevent excessive updates
  - Update last_position atomically
- Create `set_playback_speed()` command:
  - Support speeds: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
  - Save preference per video
- Create `jump_to_subtitle()` command:
  - Accept subtitle entry ID
  - Return exact timestamp
  - Add 200ms buffer before subtitle

### 7.7: Interactive Subtitle Features
- Create `handle_subtitle_click()` command:
  - Detect word boundaries in clicked text
  - Highlight selected word/phrase
  - Create vocabulary with single command
  - Return dictionary preview
- Add hover state detection
- Support phrase selection (drag select)

**Checkpoint Test**:
1. Update user profile with new username and avatar
   - Verify changes persist across restart
2. Switch UI language to Chinese
   - Verify all commands return Chinese messages
3. Look up word "magnificent" via dictionary API
   - Verify definition cached in database
4. Watch video to 5:30, close app, reopen
   - Verify playback resumes at 5:30
5. Click Chinese subtitle word
   - Verify vocabulary created in one action
   - Verify dictionary preview displayed

---

## Step 8: File Validation System (Checkpoint 13)

**Goal**: Implement comprehensive file integrity checking

### 8.1: File Validation Module
- Enhance `src/services/file_validator.rs`
- Create validation strategy enum:
  ```rust
  enum ValidationLevel {
      Quick,     // size + mtime only
      Fast,      // + fast hash
      Full,      // + full file hash
  }
  ```
- Implement progressive validation

### 8.2: Size/Mtime Checking
- Create `quick_validate()` function:
  - Get current file stats
  - Compare with stored values
  - Return validation result
  - <10ms execution time

### 8.3: Fast Hash Implementation
- Create `calculate_fast_hash()` function:
  - Read first 1MB of file
  - Calculate SHA-256 hash
  - Handle files smaller than 1MB
  - Cache result in database
  - Target <100ms execution

### 8.4: Full File Hash
- Create `calculate_full_hash()` function:
  - Stream file in 64KB chunks
  - Update hash incrementally
  - Show progress for large files
  - Allow cancellation
  - Store result separately

### 8.5: Background Validation Service
- Create `src/services/background_validator.rs`
- Implement validation queue:
  - Low priority for routine checks
  - High priority for user-requested
  - Process one file at a time
  - Pause during video playback
- Schedule periodic validation:
  - Quick validation on access
  - Fast validation daily
  - Full validation weekly

### 8.6: Validation Recovery Flow
- Create `handle_validation_failure()` function:
  1. Log validation failure details
  2. Notify user with options:
     - Re-upload file
     - Restore from backup
     - Mark as corrupted
     - Ignore (at own risk)
  3. If re-upload chosen:
     - Preserve metadata
     - Update file hashes
     - Maintain vocabulary links
  4. Update integrity check record

### 8.7: User Notification System
- Create validation status UI:
  - Show validation in progress
  - Display integrity warnings
  - Provide action buttons
- Add system tray notifications
- Log all validation events

**Checkpoint Test**:
1. Upload 500MB video file
2. Close application
3. Modify video file with hex editor (change 1 byte at position 1000)
4. Reopen application and access video
5. Verify sequence:
   - Quick validation passes (size unchanged)
   - System notices mtime change
   - Triggers fast hash validation
   - Fast hash fails (first 1MB includes byte 1000)
   - User notified with options
   - Choose re-upload
   - Verify file re-uploaded successfully
   - All vocabulary items still linked

---

## Each Step Includes:

1. `Cargo.toml` dependency updates (if needed)
2. Database migration (if needed)
3. Rust implementation with proper error handling
4. Tauri command registration
5. Basic test to verify functionality
6. Frontend integration test

---

## Benefits of This Approach:

- Each step builds on the previous one
- Clear success criteria for each checkpoint
- Easy to identify and fix issues early
- Modular commits for version control
- Frontend can test each feature incrementally
- Covers all requirements from description.md