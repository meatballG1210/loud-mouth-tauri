# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Loud Mouth is a desktop language learning application built with Tauri that enables users to learn vocabulary from video content using scientifically-proven spaced repetition techniques. The application combines entertainment with effective language learning by allowing users to extract vocabulary from videos with dual-language subtitles.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2 (Rust) with Diesel ORM
- **Database**: SQLite (local storage)
- **UI**: Radix UI + Tailwind CSS
- **State Management**: TanStack Query
- **Authentication**: Supabase
- **Routing**: Wouter
- **Video Processing**: FFmpeg

## Development Commands

### Frontend Development
```bash
# Install dependencies
pnpm install

# Start Vite dev server
pnpm dev

# Build frontend
pnpm build

# Preview production build
pnpm preview
```

### Tauri Development
```bash
# Run Tauri in development mode
pnpm tauri dev

# Build desktop application
pnpm tauri build

# Run Rust tests
cd src-tauri && cargo test
```

### TypeScript Type Checking
```bash
# Type check (included in build)
tsc
```

## Architecture

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

### Key Frontend Directories

- `/src/api` - API integration layer for vocabulary management
- `/src/components` - React components
  - `/ui` - Reusable UI components (shadcn/ui based)
  - `/video` - Video player and related components
  - `/layout` - Layout components
- `/src/hooks` - Custom React hooks
- `/src/lib` - Core utilities (i18n, query client, supabase)
- `/src/pages` - Page components for routing
- `/src/types` - TypeScript type definitions
- `/src/utils` - Utilities (subtitle parser, translation cache)

### Key Backend Directories

- `/src-tauri/src/commands` - Tauri commands for video/vocabulary management
- `/src-tauri/src/models` - Data models
- `/src-tauri/migrations` - Diesel database migrations
- `/src-tauri/subtitles` - Subtitle file storage (.vtt)
- `/src-tauri/thumbnails` - Video thumbnail storage

## Core Features

1. **Video Management**: Upload, store, and play videos with subtitle support
2. **Vocabulary Extraction**: Click on subtitles to extract vocabulary with context
3. **Spaced Repetition**: Review vocabulary using Ebbinghaus forgetting curve (Day 0, 1, 3, 7, 14, 30)
4. **Progress Tracking**: Monitor learning progress with analytics
5. **Multi-language Support**: Interface in English/Chinese
6. **Authentication**: User accounts via Supabase

## Database Schema

The application uses SQLite with Diesel ORM. Key tables include:
- Videos (metadata, file paths, checksums)
- Vocabulary (words, translations, context)
- User progress and review schedules

## Important Patterns

### Path Aliases
- `@/*` maps to `./src/*` in TypeScript imports

### Error Handling
- Comprehensive error handling framework documented in ERROR_TESTING_GUIDE.md
- Custom error types in both Rust and TypeScript

### File Integrity
- SHA-256 checksums for video files
- File validation system for uploads

### Component Structure
- UI components follow shadcn/ui patterns
- Extensive use of Radix UI primitives
- Tailwind CSS for styling

## Development Notes

- The application is offline-first with local SQLite storage
- Authentication requires internet connection (Supabase)
- Video files and subtitles are stored locally
- Maximum video file size: 4GB
- Supported video formats: MP4, AVI, MKV, MOV
- Supported subtitle formats: SRT, VTT

## Testing

- Rust tests: `cd src-tauri && cargo test`
- Frontend: No testing framework currently configured
- Manual error testing page available at `/error-test`

## Performance Targets

- Video load time: <2 seconds
- Subtitle sync: <100ms latency
- Database queries: <50ms response
- UI responsiveness: 60 FPS