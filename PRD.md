# Product Requirements Document (PRD)
# Loud Mouth - Language Learning Application

**Version:** 1.0
**Date:** 2025-01-30
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Product Vision
Loud Mouth is a desktop language learning application that revolutionizes vocabulary acquisition through immersive video-based learning, combining entertainment with scientifically-proven spaced repetition techniques.

### 1.2 Mission Statement
To make language learning engaging and effective by allowing users to learn vocabulary from their favorite video content while ensuring long-term retention through intelligent review scheduling.

### 1.3 Target Audience
- **Primary:** Language learners studying English or Chinese
- **Secondary:** Educational institutions and language teachers
- **Tertiary:** Content creators who want to make their videos educational

### 1.4 Key Value Propositions
1. Learn languages from real-world video content
2. Automatic vocabulary extraction with context
3. Scientifically-backed spaced repetition system
4. Privacy-focused local storage
5. Bilingual interface support (English/Chinese)

---

## 2. Product Overview

### 2.1 Product Description
Loud Mouth is a cross-platform desktop application built with Tauri that enables users to:
- Upload and watch videos with dual-language subtitles
- Extract vocabulary from video content with contextual sentences
- Review vocabulary using the Ebbinghaus forgetting curve
- Track learning progress with detailed analytics
- Customize learning goals and preferences

### 2.2 Core Features
1. **Video Library Management**
2. **Dual-Language Subtitle Display**
3. **Interactive Vocabulary Extraction**
4. **Spaced Repetition Review System**
5. **Progress Tracking & Analytics**
6. **User Profile & Settings**

### 2.3 Platform Requirements
- **Operating Systems:** macOS
- **Minimum RAM:** 4GB
- **Storage:** 50GB for application + space for videos
- **Internet:** Required only for authentication

---

## 3. User Personas

### 3.1 Primary Persona: "The Motivated Learner"
**Name:** Sarah Chen
**Age:** 25
**Occupation:** Software Developer
**Goals:**
- Improve English vocabulary for professional communication
- Learn from technical videos and documentaries
- Maintain consistent study habits

**Pain Points:**
- Traditional vocabulary apps are boring
- Loses context when learning isolated words
- Difficulty maintaining long-term retention

### 3.2 Secondary Persona: "The Entertainment Learner"
**Name:** Mike Johnson
**Age:** 19
**Occupation:** University Student
**Goals:**
- Learn Chinese through movies and TV shows
- Make language learning fun and engaging
- Track progress for motivation

**Pain Points:**
- Subtitles go by too fast to learn
- No way to save interesting phrases
- Forgets words after initial exposure

---

## 4. Feature Requirements

### 4.1 Video Management System

#### 4.1.1 Video Upload
- **Supported Formats:** MP4, AVI, MKV, MOV
- **Maximum File Size:** 4GB
- **Processing:**
  - Automatic thumbnail generation
  - Duration extraction
  - File integrity checking (SHA-256)

#### 4.1.2 Video Library
- **Views:** Grid and list layouts
- **Sorting:** By date, title, duration
- **Filtering:** By subtitle availability
- **Search:** Full-text search on titles
- **Pagination:** 20 videos per page

### 4.2 Subtitle System

#### 4.2.1 Subtitle Support
- **Formats:** SRT, VTT
- **Languages:** English and Chinese
- **Display:** Dual-subtitle simultaneous display
- **Synchronization:** ±1 second tolerance

#### 4.2.2 Interactive Features
- **Click-to-Learn:** Click any subtitle to add vocabulary
- **Context Window:** 3-sentence context extraction
- **Timestamp Navigation:** Jump to subtitle moments

### 4.3 Vocabulary Learning

#### 4.3.1 Vocabulary Extraction
- **Target Selection:** Click on Chinese subtitle
- **Answer Matching:** Automatic English subtitle pairing
- **Context Capture:** Previous, current, and next sentences
- **Dictionary Integration:** Optional API lookup

#### 4.3.2 Vocabulary Management
- **Organization:** Group by source video
- **Search:** By word, translation, or video
- **Sorting:** Alphabetical, difficulty, review date
- **Export:** CSV format for external use

### 4.4 Review System

#### 4.4.1 Spaced Repetition Algorithm
- **Schedule:** Day 0, 1, 3, 7, 14, 30
- **Late Review Policy:**
  - ≤3 days late: Continue normally
  - >3 days late: Reset to Day 0
- **Completion:** 6 successful reviews

#### 4.4.2 Review Interface
- **Audio Playback:** Context sentences with target
- **Input Methods:** Typing or speech
- **Answer Validation:** 85% fuzzy match threshold
- **Feedback:** Immediate correctness indication

### 4.5 Progress Tracking

#### 4.5.1 Statistics
- **Daily Metrics:**
  - Study time
  - Videos watched
  - Vocabulary added
  - Reviews completed
  - Accuracy rate

#### 4.5.2 Visualizations
- **Charts:** Line graphs for trends
- **Streaks:** Consecutive days studied
- **Achievements:** Milestone badges
- **Goals:** Weekly/monthly targets

### 4.6 User Settings

#### 4.6.1 Profile Management
- **Avatar:** Custom image upload
- **Display Name:** Editable
- **Bio:** Optional description

#### 4.6.2 Preferences
- **Language:** Interface language (EN/CN)
- **Theme:** Light/Dark mode
- **Notifications:** Review reminders
- **Daily Goal:** Study minutes target

---

## 5. Technical Requirements

### 5.1 Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│  Tauri Core  │────▶│   SQLite    │
│  React/TS   │     │    (Rust)    │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │  Supabase   │
         │    Auth     │
         └─────────────┘
```

### 5.2 Technology Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Tauri (Rust)
- **Database:** SQLite with Diesel ORM
- **UI Components:** Radix UI + Tailwind CSS
- **Authentication:** Supabase
- **Video Processing:** FFmpeg

### 5.3 Data Storage
- **Videos:** Local filesystem
- **Database:** Local SQLite
- **User Auth:** Supabase cloud
- **File Integrity:** SHA-256 hashing

### 5.4 Performance Requirements
- **Video Load Time:** <2 seconds
- **Subtitle Sync:** <100ms latency
- **Database Queries:** <50ms response
- **UI Responsiveness:** 60 FPS

---

## 6. User Experience

### 6.1 Key User Flows

#### 6.1.1 First-Time User Flow
1. Download and install application
2. Create account or login
3. Upload first video
4. Add subtitles
5. Watch and click words to learn
6. Complete first review session

#### 6.1.2 Daily Study Flow
1. Open application
2. Check due reviews
3. Complete review session
4. Watch new video content
5. Add vocabulary items
6. Check progress stats

### 6.2 Interface Requirements
- **Design System:** macOS-inspired clean aesthetic
- **Responsive:** Adapt to window resizing
- **Keyboard Shortcuts:** Power user support
- **Loading States:** Clear progress indicators
- **Error Handling:** User-friendly messages

### 6.3 Accessibility
- **Screen Reader:** ARIA labels
- **Keyboard Navigation:** Full support
- **Color Contrast:** WCAG AA compliance
- **Font Sizing:** Adjustable text size

---

## 7. Success Metrics

### 7.1 User Engagement
- **Daily Active Users (DAU)**
- **Average Session Duration**
- **Videos Uploaded per User**
- **Vocabulary Items Created**

### 7.2 Learning Effectiveness
- **Review Completion Rate**
- **Long-term Retention Rate**
- **Streak Maintenance**
- **Goal Achievement Rate**

### 7.3 Technical Performance
- **Crash Rate:** <0.1%
- **Load Time:** <2s average
- **File Processing Success:** >99%
- **Database Query Performance:** <50ms p95

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Checkpoints 1-2)
- Database setup and schema
- Error handling framework
- Basic authentication

### Phase 2: Core Features (Checkpoints 3-6)
- Video upload and management
- Subtitle parsing and display
- Basic vocabulary extraction

### Phase 3: Learning System (Checkpoints 7-10)
- Vocabulary management
- Spaced repetition algorithm
- Review interface

### Phase 4: Enhancement (Checkpoints 11-13)
- Progress tracking
- Advanced features
- File validation system

---

## 9. Constraints and Assumptions

### 9.1 Technical Constraints
- Local storage only (no cloud sync)
- Desktop-only (no mobile version)
- Requires FFmpeg installation

### 9.2 Dependencies
- Supabase service availability
- FFmpeg for video processing
- Dictionary API for translations

### 9.3 Assumptions
- Users have videos with subtitles
- Basic computer literacy
- Stable internet for auth only

---

## 10. Appendices

### 10.1 Glossary
- **Spaced Repetition:** Learning technique with increasing review intervals
- **Ebbinghaus Curve:** Memory retention model
- **Fuzzy Matching:** Approximate string comparison
- **Tauri:** Rust-based desktop app framework

### 10.2 References
- description.md - Detailed feature specifications
- Todo.md - Technical implementation plan
- Database Schema - SQLite table definitions

### 10.3 Revision History
| Version | Date       | Author | Changes      |
|---------|------------|--------|--------------|
| 1.0     | 2025-01-30 | System | Initial Draft|

---

**Document Status:** This PRD is a living document and will be updated as the product evolves and new requirements are identified.
