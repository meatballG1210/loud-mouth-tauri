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

- Add `videos` table migration with all fields (id, user_id, title, filename, original_name, path, size, mtime, duration, thumbnail_path, has_english_subtitles, has_chinese_subtitles, fast_hash, full_hash)
- Add `file_integrity_checks` table migration
- Create `upload_video()` Tauri command
- Implement file validation (size, format, integrity)
- Extract video duration using FFmpeg
- Generate video thumbnail using FFmpeg
- Store video metadata including size/mtime for integrity checking
- Create organized file storage structure
- Add initial file hash calculation (SHA-256 of first 1MB)

**Checkpoint Test**:
Upload a video file, verify:
- File saved with proper directory structure
- Thumbnail generated successfully
- Duration extracted and stored
- Size/mtime recorded for integrity checking
- Metadata properly stored in database

---

## Step 2B: Enhanced Video Listing (Checkpoint 4)

**Goal**: Retrieve and display uploaded videos with integrity checking

- Add `get_videos()` Tauri command
- Implement video metadata retrieval
- Add file integrity validation on retrieval (check size/mtime)
- Add basic pagination support
- Connect to existing frontend video grid
- Add `validate_video_integrity()` command

**Checkpoint Test**:
Upload multiple videos, verify they appear in frontend video list with proper validation

---

## Step 3A: Basic Subtitle Support (Checkpoint 5)

**Goal**: Parse and store subtitle files

- Add `subtitles` table migration
- Add `subtitle_entries` table migration (normalized subtitle data)
- Create SRT file parser
- Add `upload_subtitle()` Tauri command
- Store subtitle data in database

**Checkpoint Test**:
Upload SRT file, verify:
- Subtitles table entry created
- Individual subtitle entries stored in subtitle_entries table
- Proper foreign key relationships established

---

## Step 3B: Subtitle-Video Association (Checkpoint 6)

**Goal**: Link subtitles to videos and retrieve them

- Add `get_subtitles(video_id)` command
- Implement subtitle retrieval by video
- Add subtitle validation and error handling

**Checkpoint Test**:
Upload video and subtitle, verify they're properly linked and retrievable

---

## Step 4A: Basic Vocabulary Creation (Checkpoint 7)

**Goal**: Create vocabulary items from subtitle clicks

- Add `vocabulary` table migration with context fields (context_before, context_target, context_after)
- Create `add_vocabulary_item()` command
- Implement context sentence extraction
- Store vocabulary with source video reference

**Checkpoint Test**:
Click on subtitle word, verify vocabulary item is created with context

---

## Step 4B: Vocabulary Listing (Checkpoint 8)

**Goal**: Display saved vocabulary items

- Add `get_vocabulary()` command
- Implement filtering by video/user
- Add basic sorting options

**Checkpoint Test**:
Create multiple vocabulary items, verify they display correctly in vocabulary list

---

## Step 5A: Basic Review System (Checkpoint 9)

**Goal**: Simple review functionality without spaced repetition

- Add `review_schedules` table migration
- Add `review_history` table migration
- Create `get_due_reviews()` command
- Implement basic review answer checking
- Add `complete_review()` command

**Checkpoint Test**:
Create vocabulary item, verify:
- Review schedule created in review_schedules table
- Review history tracked in review_history table
- Due reviews query returns correct items

---

## Step 5B: Enhanced Spaced Repetition Algorithm (Checkpoint 10)

**Goal**: Implement Ebbinghaus scheduling with fuzzy matching

- Add spaced repetition logic
- Implement review schedule calculation
- Add late review handling (>3 days = reset progress)
- Implement fuzzy string matching (85% threshold using Levenshtein)
- Update review completion to schedule next review
- Add review history tracking

**Checkpoint Test**:
Complete reviews, verify:
- Next review dates follow Ebbinghaus pattern
- Late reviews properly reset progress
- Fuzzy matching accepts 85%+ similar answers

---

## Step 6: Progress Tracking & Analytics (Checkpoint 11)

**Goal**: Implement learning statistics and visualization

- Add `learning_progress` table migration
- Add `achievements` table migration
- Add `learning_goals` table migration
- Create `get_learning_stats()` command
- Implement streak tracking
- Add `get_weekly_progress()` command
- Create achievement/milestone system
- Add goal setting commands

**Checkpoint Test**:
Study for several days, verify:
- Accurate study time tracking
- Streak calculations work correctly
- Progress charts data is available

---

## Step 7: Advanced Features (Checkpoint 12)

**Goal**: Add remaining features from description.md

- Add user profile management commands
- Implement language preference settings
- Add notification preferences
- Create dictionary API integration
- Add `video_playback_states` table migration
- Add video player support commands (position tracking, speed control)
- Implement interactive subtitle click handling

**Checkpoint Test**:
Verify all advanced features work:
- Profile updates persist
- Language switching works
- Dictionary lookups return data

---

## Step 8: File Validation System (Checkpoint 13)

**Goal**: Implement comprehensive file integrity checking

- Add file validation module
- Implement size/mtime checking
- Add fast hash calculation (first 1MB SHA-256)
- Implement full file hash as fallback
- Create background validation service
- Add file recovery/re-upload mechanism

**Checkpoint Test**:
Modify a video file externally, verify:
- System detects the change
- Proper validation sequence executes
- User is notified of integrity issues

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