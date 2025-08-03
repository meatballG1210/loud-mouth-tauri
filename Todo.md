[x]复习逻辑中如果是复制的答案，那么这道题需要重新出现，直到能够自己键入正确内容。
[x]复习按照日期来算，不是按照时间点来截止统计。
[x]增加重新输入的按钮，清空输入框的内容。
[x]核对复习逻辑，按照什么样的规律复习。
[x]复习页面的单词统计数据核实。
[x]屏幕黑屏问题
[x]播放页面的ui，及前进后退功能，倍速功能完成。
[x]视频播放的时候，无法按空格键暂停播放，也无法点击画面暂停。需要点击按钮。
[x]语音识别有的时候无法暂停
[x]点击全屏的时候 下面会有大面积的空白
[x]视频播放没有记忆功能，上次播放到哪，应该从上次开始。
[x]ErrorBoundary
[x]overdue的单词数字没有正常显示
[x]单词列表页 视频下方会显示不匹配字幕
[x]Review Logic
[x]设置功能完善 (sync with Supabase)
[x]延迟复习逻辑测试 超过三天 还是保持当前阶段
[x]准确率的计算不正确
[x]回答正确复习的时候要显示正确答案
[x]复习阶段0的单词不会再次出现
[x]复习完成后的跳出窗口美化
[x]准确率表格没有正确显示
[x]tab的标题显示大小写不正确
[x]单词查询prompt过于复杂,返回结果不够简洁
[x]点击单词详情页的单词时候，会从当前句子开始播放，希望能够重复播放当前句子。且点击键盘空格键，能够暂停播放。
[x]卡片布局不协调，字幕显示没有达到卡片最右侧
[x]点击单词页详情的时候 会整个屏幕背景变成黑色 应该是透明的

[]视频增加进度条显示
[]单词查询速度优化
[]语音识别准确度 换成api调用 测试准确率和效果


[]i18n
[]产品宣传网站
[]产品图标打包

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

**Checkpoint 2A.1**: Run migrations and verify both tables created with proper foreign key constraints

### 2A.2: Video Upload Command Implementation
- Create `upload_video()` Tauri command in `src/commands/video.rs`
- Accept parameters: file_path, title, user_id
- Return Result<VideoMetadata, AppError>

**Checkpoint 2A.2**: Call upload_video with test parameters, verify command is registered and returns error for non-existent file

### 2A.3: File Validation Module
- Create `src/services/file_validator.rs`
- Implement file size validation (max 4GB)
- Implement file format validation (MP4, AVI, MKV, MOV)
- Create magic number checking for file type verification
- Add virus scanning hook point (for future integration)

**Checkpoint 2A.3**: Test with 5GB file (should fail), test with .txt file (should fail), test with valid MP4 (should pass)

### 2A.4: Video Processing with FFmpeg
- Create `src/services/video_processor.rs`
- Implement duration extraction using ffmpeg-next crate
- Implement thumbnail generation at 10% of video duration
- Handle FFmpeg errors gracefully
- Store thumbnail as JPEG in thumbnails directory

**Checkpoint 2A.4**: Process a test video, verify duration is extracted correctly and thumbnail.jpg is created

### 2A.5: File Storage Management
- Create `src/services/file_storage.rs`
- Design directory structure: `/videos/{user_id}/{year}/{month}/{video_id}/`
- Implement file copying with progress callback
- Create cleanup on failure mechanism
- Ensure proper file permissions (read-only after save)

**Checkpoint 2A.5**: Upload video and verify directory structure created, file copied, and permissions set to read-only

### 2A.6: Hash Calculation Service
- Create `src/services/hash_calculator.rs`
- Implement fast hash: SHA-256 of first 1MB
- Implement progress callback for large files
- Add async/concurrent hash calculation
- Cache hash results in database

**Checkpoint 2A.6**: Calculate hash for 100MB file, verify hash is consistent across multiple runs

### 2A.7: Metadata Storage
- Create `src/models/video.rs` with Diesel model
- Implement database insertion with transaction
- Add rollback on any failure
- Return complete video metadata to frontend

**Checkpoint 2A.7**: Complete full upload flow, verify all metadata stored in database and returned to frontend

---

## Step 2B: Enhanced Video Listing (Checkpoint 4)

**Goal**: Retrieve and display uploaded videos with integrity checking

### 2B.1: Get Videos Command
- Create `get_videos()` command in `src/commands/video.rs`
- Accept parameters: user_id, page, per_page, sort_by, filter
- Return Result<VideoListResponse, AppError>

**Checkpoint 2B.1**: Call get_videos with pagination params, verify command returns empty list initially

### 2B.2: Database Query Implementation
- Create efficient query with Diesel
- Add indexes on user_id, upload_date
- Implement sorting options: newest, oldest, title, duration
- Add filtering by subtitle availability

**Checkpoint 2B.2**: With 5 videos in database, test each sort option and verify correct order

### 2B.3: Integrity Validation Service
- Create `validate_on_access()` in `src/services/file_validator.rs`
- Check current file size/mtime against stored values
- If mismatch detected:
  - Log integrity check failure
  - Calculate fast hash for comparison
  - Update file_integrity_checks table
  - Mark video as needs_validation if hash differs

**Checkpoint 2B.3**: Modify a video file timestamp, call get_videos, verify integrity check triggers

### 2B.4: Pagination Implementation
- Implement offset-based pagination
- Calculate total pages from count query
- Return metadata: current_page, total_pages, total_items
- Optimize with lazy loading of thumbnails

**Checkpoint 2B.4**: With 25 videos, request page 2 with per_page=10, verify items 11-20 returned

### 2B.5: Video Integrity Command
- Create `validate_video_integrity()` command
- Accept video_id parameter
- Perform full validation sequence:
  - Check file existence
  - Validate size/mtime
  - Recalculate fast hash if needed
  - Optionally calculate full hash
- Return detailed validation report

**Checkpoint 2B.5**: Delete a video file, run validate_video_integrity, verify returns "missing" status

### 2B.6: Frontend Integration
- Update video list API calls
- Add loading states for integrity checks
- Display validation warnings in UI
- Add retry mechanism for failed validations

**Checkpoint 2B.6**: Load video list in frontend, verify thumbnails display and integrity warnings show for invalid videos

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

**Checkpoint 3A.1**: Run migrations, verify tables created with proper constraints and indexes

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

**Checkpoint 3A.2**: Parse test SRT with 10 entries, verify all entries parsed with correct millisecond timestamps

### 3A.3: Upload Subtitle Command
- Create `upload_subtitle()` in `src/commands/subtitle.rs`
- Accept parameters: video_id, language, file_path
- Validate file format (SRT/VTT)
- Check video ownership before upload

**Checkpoint 3A.3**: Try uploading subtitle for non-existent video, verify ownership check fails

### 3A.4: Subtitle Processing Pipeline
- Parse subtitle file into memory
- Validate all entries have valid timestamps
- Check for overlapping time ranges
- Normalize text (trim whitespace, fix encoding)
- Count total entries for metadata

**Checkpoint 3A.4**: Upload subtitle with overlapping timestamps, verify validation catches the issue

### 3A.5: Database Storage with Transaction
- Begin database transaction
- Delete existing subtitles for same video/language
- Insert subtitle metadata record
- Batch insert all subtitle entries
- Update video record (has_english_subtitles or has_chinese_subtitles)
- Commit transaction or rollback on error

**Checkpoint 3A.5**: Upload English subtitle, then upload new English subtitle, verify first is replaced

### 3A.6: Error Handling
- Handle malformed subtitle files
- Provide specific error messages:
  - Invalid timestamp format
  - Missing required fields
  - Encoding issues
  - File too large (>5MB)

**Checkpoint 3A.6**: Upload corrupted SRT file, verify specific error message returned

---

## Step 3B: Subtitle-Video Association (Checkpoint 6)

**Goal**: Link subtitles to videos and retrieve them

### 3B.1: Get Subtitles Command
- Create `get_subtitles()` in `src/commands/subtitle.rs`
- Accept parameters: video_id, language (optional)
- Return Result<SubtitleData, AppError>

**Checkpoint 3B.1**: Call get_subtitles for video with no subtitles, verify empty result returned

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

**Checkpoint 3B.2**: Query subtitle with 1000 entries, verify query completes in <50ms

### 3B.3: Subtitle Synchronization Check
- Create `check_subtitle_sync()` helper
- Compare subtitle duration with video duration
- Flag potential sync issues (>5 second difference)
- Return sync quality score

**Checkpoint 3B.3**: Upload subtitle with duration 10s longer than video, verify sync warning generated

### 3B.4: Multi-Language Support
- If language not specified, return all available
- Structure response for dual-subtitle display
- Ensure consistent timing alignment

**Checkpoint 3B.4**: Upload both EN and CN subtitles, call without language param, verify both returned

### 3B.5: Subtitle Validation
- Verify subtitle ownership matches video
- Check subtitle file still exists
- Validate entry count matches database
- Handle missing or corrupted data gracefully

**Checkpoint 3B.5**: Delete subtitle entries from database, call get_subtitles, verify graceful error handling

### 3B.6: Performance Optimization
- Add database indexes for fast retrieval
- Implement subtitle entry pagination for large files
- Cache parsed subtitles in memory (LRU cache)

**Checkpoint 3B.6**: Load same subtitle 5 times rapidly, verify cache hit on subsequent loads

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

**Checkpoint 4A.1**: Run migration, verify vocabulary table created with all indexes

### 4A.2: Add Vocabulary Command
- Create `add_vocabulary_item()` in `src/commands/vocabulary.rs`
- Accept parameters:
  - video_id
  - timestamp (click position)
  - subtitle_id (Chinese subtitle clicked)
  - entry_index (specific entry clicked)

**Checkpoint 4A.2**: Call command with test parameters, verify command registered and validates inputs

### 4A.3: Context Extraction Service
- Create `src/services/context_extractor.rs`
- Find clicked subtitle entry by index
- Extract 3-sentence context window:
  - Get previous entry (if exists)
  - Get current entry (containing clicked word)
  - Get next entry (if exists)
- Handle edge cases (first/last subtitle)

**Checkpoint 4A.3**: Click on first subtitle entry, verify context_before is null, context_after populated

### 4A.4: English Answer Matching
- Query English subtitles for same video
- Find English subtitle within ±1000ms of timestamp
- If multiple matches, pick closest by time
- If no match found, return error
- Store matched English text as answer

**Checkpoint 4A.4**: Click at timestamp with no English subtitle within 1s, verify appropriate error returned

### 4A.5: Duplicate Prevention
- Check if vocabulary item already exists:
  - Same user_id
  - Same video_id
  - Same word
  - Same timestamp (±500ms)
- If exists, return existing item instead

**Checkpoint 4A.5**: Add same vocabulary item twice, verify second attempt returns existing item

### 4A.6: Initial Review Schedule Creation
- Generate Ebbinghaus review dates:
  - Day 0: created_at
  - Day 1: created_at + 1 day
  - Day 3: created_at + 3 days
  - Day 7: created_at + 7 days
  - Day 14: created_at + 14 days
  - Day 30: created_at + 30 days
- Store schedule in separate table (Step 5A)

**Checkpoint 4A.6**: Create vocabulary item, verify 6 review dates generated correctly

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

**Checkpoint 4B.1**: Call with no vocabulary items, verify empty paginated response returned

### 4B.2: Advanced Query Building
- Build dynamic query with Diesel
- Apply filters conditionally:
  - Filter by video_id if provided
  - Search in word and answer fields
  - Case-insensitive search
- Implement sorting logic

**Checkpoint 4B.2**: Add 10 items with "hello" in answer, search for "HELLO", verify all 10 returned

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

**Checkpoint 4B.3**: Add vocabulary from 3 videos, group by video, verify 3 groups with correct counts

### 4B.4: Vocabulary Statistics
- Add `get_vocabulary_stats()` command
- Return statistics:
  - Total vocabulary count
  - Count by video
  - Words learned today/week/month
  - Most common words

**Checkpoint 4B.4**: Add 20 items over 7 days, verify weekly count shows correct number

### 4B.5: Export Functionality
- Add `export_vocabulary()` command
- Support CSV format
- Include all context and metadata
- Generate downloadable file

**Checkpoint 4B.5**: Export 5 vocabulary items to CSV, verify file contains all fields properly formatted

### 4B.6: Performance Considerations
- Add composite indexes for common queries
- Implement query result caching
- Limit maximum results per page (100)

**Checkpoint 4B.6**: Query 1000 items with pagination, verify response time <100ms

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

**Checkpoint 5A.1**: Run migrations, verify both tables created with proper indexes

### 5A.2: Review Schedule Creation
- Automatically create when vocabulary item added
- Store review_dates as JSON array:
  ```json
  ["2025-01-30", "2025-01-31", "2025-02-02", "2025-02-06", "2025-02-13", "2025-02-29"]
  ```
- Set next_review_date to first date
- Initialize completed_reviews to 0

**Checkpoint 5A.2**: Add vocabulary item, verify review_schedule created with correct dates

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

**Checkpoint 5A.3**: Create item due yesterday, verify appears first in due reviews list

### 5A.4: Review Answer Validation
- Create `src/services/answer_validator.rs`
- Implement normalization:
  - Convert to lowercase
  - Trim whitespace
  - Remove punctuation
- Calculate exact match first
- Return validation result with score

**Checkpoint 5A.4**: Validate "Hello, World!" against "hello world", verify exact match after normalization

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

**Checkpoint 5A.5**: Complete review with correct answer, verify review_history entry created

### 5A.6: Review Session Management
- Track current review session
- Prevent reviewing same item twice in one day
- Handle review interruptions gracefully
- Save progress periodically

**Checkpoint 5A.6**: Try to review same item twice on same day, verify prevented

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

**Checkpoint 5B.1**: Test "café" vs "cafe", verify similarity score ~0.8

### 5B.2: Enhanced Review Completion
- Update `complete_review()` command:
  - Use fuzzy matching for validation
  - Store similarity score in review_history
  - Accept answers with score >= 0.85
  - Provide feedback on near-misses (0.70-0.84)

**Checkpoint 5B.2**: Answer with 80% similarity, verify marked as incorrect with feedback

### 5B.3: Spaced Repetition Scheduling
- Create `calculate_next_review()` function:
  - Get current completed_reviews count
  - Look up next date from review_dates array
  - Handle array bounds (max 6 reviews)
  - Update next_review_date field
  - Mark is_completed if all 6 done

**Checkpoint 5B.3**: Complete 6th review, verify is_completed set to true

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

**Checkpoint 5B.4**: Review item 4 days late, verify progress reset to day 0

### 5B.5: Review History Analysis
- Add `get_review_history()` command
- Calculate statistics:
  - Average similarity score
  - Success rate by review number
  - Time taken trends
  - Common mistakes

**Checkpoint 5B.5**: Complete 10 reviews, verify statistics calculated correctly

### 5B.6: Adaptive Difficulty
- Track difficulty metrics:
  - Failed attempt count
  - Average similarity score
  - Review reset count
- Flag difficult items for extra practice
- Suggest similar vocabulary for reinforcement

**Checkpoint 5B.6**: Fail same item 3 times, verify flagged as difficult

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

**Checkpoint 6.1**: Run all migrations, verify 4 new tables created

### 6.2: Progress Tracking Service
- Create `src/services/progress_tracker.rs`
- Auto-create daily progress record
- Update counters in real-time:
  - Increment study_time on video watch
  - Increment vocabulary_added on creation
  - Track review accuracy per session
- Implement atomic updates to prevent race conditions

**Checkpoint 6.2**: Watch video for 5 minutes, verify study_time incremented by 300 seconds

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

**Checkpoint 6.3**: After 3 days of activity, verify all stats calculated correctly

### 6.4: Streak Calculation
- Create `calculate_streak()` function:
  - Query learning_progress by date DESC
  - Count consecutive days with activity
  - Handle timezone considerations
  - Cache streak calculation
- Track both current and longest streak

**Checkpoint 6.4**: Study 3 days, skip 1 day, study 2 more days, verify current streak = 2

### 6.5: Weekly Progress Analysis
- Create `get_weekly_progress()` command
- Return last 7 days of data:
  - Daily study time
  - Daily vocabulary added
  - Daily review count
  - Rolling accuracy average
- Format for chart visualization

**Checkpoint 6.5**: Get weekly progress, verify 7 data points returned even with missing days

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

**Checkpoint 6.6**: Add first vocabulary item, verify "First Word" achievement awarded

### 6.7: Goal Management
- Create `set_learning_goal()` command
- Create `update_goal_progress()` service
- Goal types:
  - Daily study time (minutes)
  - Weekly vocabulary target
  - Monthly review target
- Auto-check goal completion

**Checkpoint 6.7**: Set daily 10-minute goal, study 10 minutes, verify goal marked complete

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

**Checkpoint 7.1**: Update username, verify change persists after restart

### 7.2: Language Preference System
- Create `update_language_settings()` command
- Support languages: 'en', 'zh-CN'
- Update UI language preference
- Update default subtitle language
- Return localized messages

**Checkpoint 7.2**: Switch to Chinese, verify next command response in Chinese

### 7.3: Notification Preferences
- Create `notification_preferences` table:
  - user_id (TEXT PRIMARY KEY, FK to users)
  - review_reminders (BOOLEAN DEFAULT 1)
  - achievement_alerts (BOOLEAN DEFAULT 1)
  - daily_goal_reminders (BOOLEAN DEFAULT 1)
  - reminder_time (TEXT) -- "09:00"
- Create `update_notification_preferences()` command
- Integrate with system notification API

**Checkpoint 7.3**: Set reminder time to 9 AM, verify preference saved

### 7.4: Dictionary API Integration
- Create `src/services/dictionary_service.rs`
- Add configuration for API credentials
- Implement `lookup_word()` function:
  - Cache lookups in vocabulary table
  - Handle API rate limits
  - Fallback to offline dictionary
- Support multiple dictionary providers

**Checkpoint 7.4**: Look up word with API down, verify fallback activates

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

**Checkpoint 7.5**: Watch video to 2:30, close app, verify position saved

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

**Checkpoint 7.6**: Set speed to 1.5x, verify saved and restored on reload

### 7.7: Interactive Subtitle Features
- Create `handle_subtitle_click()` command:
  - Detect word boundaries in clicked text
  - Highlight selected word/phrase
  - Create vocabulary with single command
  - Return dictionary preview
- Add hover state detection
- Support phrase selection (drag select)

**Checkpoint 7.7**: Click middle of Chinese sentence, verify correct word extracted

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

**Checkpoint 8.1**: Create validator with all three levels, verify enum works

### 8.2: Size/Mtime Checking
- Create `quick_validate()` function:
  - Get current file stats
  - Compare with stored values
  - Return validation result
  - <10ms execution time

**Checkpoint 8.2**: Run quick validation 100 times, verify average <10ms

### 8.3: Fast Hash Implementation
- Create `calculate_fast_hash()` function:
  - Read first 1MB of file
  - Calculate SHA-256 hash
  - Handle files smaller than 1MB
  - Cache result in database
  - Target <100ms execution

**Checkpoint 8.3**: Calculate fast hash for 10MB file, verify completes <100ms

### 8.4: Full File Hash
- Create `calculate_full_hash()` function:
  - Stream file in 64KB chunks
  - Update hash incrementally
  - Show progress for large files
  - Allow cancellation
  - Store result separately

**Checkpoint 8.4**: Hash 1GB file, verify progress updates every 10%

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

**Checkpoint 8.5**: Queue 5 videos for validation, start video playback, verify queue pauses

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

**Checkpoint 8.6**: Trigger validation failure, choose re-upload, verify metadata preserved

### 8.7: User Notification System
- Create validation status UI:
  - Show validation in progress
  - Display integrity warnings
  - Provide action buttons
- Add system tray notifications
- Log all validation events

**Checkpoint 8.7**: Run full validation, verify progress shown in UI

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

- Each subtask has its own checkpoint for immediate verification
- Issues are caught early before moving to next subtask
- Clear success criteria at each step
- Easy to identify exactly where problems occur
- Supports incremental development and testing
- Enables parallel development of independent subtasks
