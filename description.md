## Main Features
Loud Mouth Language Learning is a modern language learning application that helps users learn languages through immersive video content. The app features a sleek macOS-inspired design and focuses on vocabulary acquisition through spaced repetition and contextual learning.

## Core Features:
Video-based Learning: Upload and watch videos with dual-language subtitles
Vocabulary Management: Extract, organize, and review vocabulary from video content
Progress Tracking: Detailed analytics and learning statistics
Bilingual Support: Full English and Chinese interface with easy language switching
User Authentication: Secure login and user profile management
Individual Pages and Functionalities


Login Page (/login)
Purpose: User authentication and account creation
Login Form: Username/password authentication with validation
Registration Form: Create new accounts with email verification
Password Toggle: Show/hide password functionality
Form Validation: Real-time validation using Zod schemas
Forgot Password Link: Password recovery option


Home Page (/)
Purpose: Main dashboard and video library management
Video Library: Grid and list view options for uploaded videos
Search & Filter: Find videos by title, subtitle availability, or upload date
Sorting Options: Organize by newest/oldest uploads
Pagination: Navigate through large video collections
Quick Stats: Total videos, vocabulary count, and due reviews
Upload Button: Direct access to video upload functionality


Upload Form (/upload)
Purpose: Add new learning videos to the library
Drag & Drop Interface: Easy file selection with visual feedback
File Validation: Accepts video formats with size limitations
Upload Progress: Real-time upload status and progress bar
Automatic Processing: Subtitle extraction and thumbnail generation
Success Confirmation: Upload completion notification


Video Player (/video/:videoId)
Purpose: Watch videos with interactive learning features
Dual Subtitles: Simultaneous English and Chinese subtitle display
Playback Controls: Play, pause, volume, and fullscreen options
Interactive Subtitles: Click words to add to vocabulary list
Timestamp Navigation: Jump to specific subtitle moments
Speed Control: Adjust playback speed for learning pace


Vocabulary List (/vocabulary-list)
Purpose: Manage and organize learned vocabulary
Word Organization: Group vocabulary by source video
Search & Filter: Find words by text, translation, or difficulty
Sorting Options: Organize by alphabetical order, difficulty, or review date
Context Display: See original sentence context for each word
Expandable Groups: Show/hide vocabulary by video source


Vocabulary Detail (/vocabulary-detail/:wordId)
Purpose: Detailed view and management of individual words
Word Information: Data returned by querying the language model with a fixed prompt.
Video Context: Original video scene where word appeared
Practice Tools: Interactive exercises and pronunciation practice
Review History: Track learning progress and accuracy


Vocabulary Review (/vocabulary-review)
Purpose: Spaced repetition practice sessions
Review Dashboard: Overview of words due for review
Audio Playback: Hear pronunciation and context sentences
Answer Validation: Check correctness with immediate feedback
Progress Tracking: Monitor session completion and accuracy
The review process works as follows: the system automatically plays the two English sentences leading up to the target sentence containing the new word. When the target sentence appears, the Chinese translation is displayed. The user must input the full English sentence—either by typing or speaking—and once the input is verified as correct, the system automatically proceeds to the next item.


Progress Page (/progress)
Purpose: Learning analytics and goal tracking
Learning Statistics: Total study time, vocabulary count, and streak tracking
Visual Charts: Line and bar charts showing learning trends
Weekly Goals: Set and track study time objectives
Performance Metrics: Accuracy rates and improvement trends
Achievement Badges: Milestone celebrations and motivation
Goal Setting: Customize personal learning targets
Settings Page (/settings)
Purpose: User preferences and account management

Profile Management: Update name, username, and email
Avatar Upload: Customize profile picture
Password Change: Secure password updates with confirmation
Language Selection: Switch between English and Chinese interface
Notification Preferences: Control review reminders and alerts
Account Settings: Privacy and security options
Error Pages
404 Not Found (/not-found): Handle invalid routes with navigation options
Error Page (/error): Display system errors with troubleshooting information
Forgot Password (/forgot-password): Password recovery workflow


## Validate
After a user uploads a file, the system stores only the file path and records its initial size and mtime (i.e., file size and last modification time) for subsequent integrity verification.

When accessing the video, the system first retrieves the current size and mtime via fs.stat.
If both match the previously cached values, the file is considered unchanged, and no hash recalculation is needed.

If either size or mtime has changed, a fast hash check is performed (e.g., by computing a SHA-256 hash over the first 1MB of the file).
	•	If the fast hash matches the cached value, the file is assumed to be unchanged in content, and use can proceed safely.
	•	If the fast hash differs, a full-file hash is computed as a secondary verification step.

This mechanism ensures data integrity while minimizing I/O overhead and maintaining high performance.


## Data Schema Summary

The videos are stored locally and not uploaded to the cloud. Only login information is uploaded to Supabase.

1. **Video Schema**
   ```spoken-application/server/server.js#L256-268
   {
     userId: String (required),
     title: String (required),
     filename: String (required),
     originalName: String (required),
     path: String (required),
     size: Number (required),
     duration: Number (default: 0),
     uploadDate: Date (default: now),
     thumbnailPath: String (optional),
     subtitles: {
       english: Boolean (default: false),
       chinese: Boolean (default: false)
     }
   }
   ```

2. **Subtitle Schema**
   ```spoken-application/server/server.js#L273-281
   {
     videoId: ObjectId (ref: Video),
     language: String (enum: ["english", "chinese"]),
     data: Array (subtitle entries),
     uploadDate: Date (default: now)
   }
   ```

3. **Vocabulary Schema**
   ```spoken-application/server/server.js#L293-307
   {
     userId: String (required),
     word: String (required),
     timestamp: Number (required),
     sentences: [String] (context sentences),
     answer: String (correct English subtitle),
     videoId: ObjectId (ref: Video),
     reviewSchedule: ReviewSchedule (embedded),
     dictionaryResponse: String,
     createdAt: Date (default: now)
   }
   ```

4. **ReviewSchedule Schema** (Embedded)
   ```spoken-application/server/server.js#L285-291
   {
     initialDate: String (required),
     reviewDates: [String] (required),
     lastReviewedDate: String,
     completedReviews: Number (default: 0),
     isCompleted: Boolean (default: false)
   }
   ```

5. user schema 

{

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  native_language TEXT DEFAULT 'zh-CN',
  subtitle_language TEXT DEFAULT 'en',
  video_playback_speed REAL DEFAULT 1.0,
  enable_hints BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT

userId
}
## Data Flow

### 1. Video Upload Flow
- User uploads video via frontend (`VideoUploadForm.tsx`)
- Frontend sends POST to `/api/videos/upload` with FormData
- Backend stores video file and creates Video document in MongoDB
- Returns video metadata to frontend

### 2. Subtitle Processing Flow
- User can extract or upload subtitles for English/Chinese
- Subtitles stored as array of entries with `startTime`, `endTime`, `text`
- Backend creates Subtitle documents linked to Video by `videoId`

### 3. Vocabulary Creation Flow
- User watches video with synchronized subtitles
- When clicking Chinese subtitle, system:
  - Finds matching English subtitle (by timestamp, ±1 second tolerance)
  - Extracts 3-sentence context window
  - Generates Ebbinghaus review schedule
  - Creates Vocabulary item with answer and context
  - Optionally fetches dictionary translation

### 4. Review Flow
- System queries vocabulary items due for review:
  - Where today matches next scheduled review date
  - Excludes items already reviewed today
- User reviews items in `VocabularyReview` component
- System checks answers and updates progress

## Matching Algorithm

The system uses a **fuzzy string matching algorithm** based on Levenshtein distance:

### Key Features:
1. **String Normalization**: Converts to lowercase, trims whitespace, removes punctuation
2. **Levenshtein Distance**: Calculates minimum edits needed to transform one string to another
3. **Similarity Score**: Returns 0-1 where 1 is identical match
4. **Threshold**: 85% similarity (0.85) required for correct answer
5. **Special Case**: After showing correct answer, maintains 85% threshold for retry attempts

## Review Algorithm

Implements **Ebbinghaus Forgetting Curve** for spaced repetition:


### Review Schedule Logic:
1. **Initial Learning**: Day 0 (same day as creation)
2. **Review Intervals**: 1, 3, 7, 14, and 30 days after initial learning
3. **Progress Tracking**:
   - `completedReviews`: Number of successful reviews
   - `lastReviewedDate`: Prevents multiple reviews on same day
   - `isCompleted`: True when all 6 reviews completed
4.	Late Review Policy:
	•	If the user reviews ≤ 3 days later than the scheduled date, the system continues as normal.
	•	nextReviewDate = actualReviewDate + nextInterval
	•	If the user reviews > 3 days late, the review progress is reset.
	•	completedReviews = 0, and the word restarts from Day 0.


## Backend Database Summary


# Phase 1: Core Infrastructure Setup

## 1. Database Setup
- Configure SQLite with Diesel ORM (Rust-native)
- Create migration system for schema management
- Implement all tables from `description.md` (videos, subtitles, vocabulary, reviews)

## 2. Tauri Commands Foundation
- Set up error handling system with proper Rust `Result` types
- Create database connection management
- Implement basic CRUD operations framework

---

# Phase 2: File Management System

## 1. Video Upload & Storage
- Implement secure file upload validation
- Create video metadata extraction (duration, format)
- Set up thumbnail generation with FFmpeg
- Build file integrity checking (size / mtime / hash)

## 2. Subtitle Processing
- Create subtitle file parser (SRT/VTT support)
- Implement subtitle-video synchronization
- Build context sentence extraction logic

---

# Phase 3: Core Business Logic

## 1. Vocabulary Management
- Implement vocabulary extraction from subtitles
- Create Ebbinghaus spaced repetition algorithm
- Build fuzzy string matching for review validation
- Set up automatic review scheduling

## 2. Authentication Integration
- Connect Supabase auth with Tauri backend
- Implement user session management
- Create user-specific data isolation

---

# Phase 4: Advanced Features

## 1. Review System
- Build review queue management
- Implement progress tracking
- Create analytics and statistics generation

## 2. Performance & Security
- Add database indexing for performance
- Implement backup/restore functionality
- Set up proper error logging and monitoring

---

# Key Dependencies to Add

- `diesel` with SQLite support
- `serde` for JSON serialization
- `tokio` for async operations
- `ffmpeg-next` for video processing
- `uuid` for unique identifiers
- `bcrypt` for password hashing (if needed)

---

# Architecture Decisions Made

- **Database**: SQLite for local storage (matches `description.md`)
- **ORM**: Diesel (Rust-native, performance-focused)
- **Authentication**: Hybrid (Supabase for auth, SQLite for data)
- **File Storage**: Local filesystem with integrity checking
