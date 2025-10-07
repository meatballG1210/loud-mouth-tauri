-- Create videos table
CREATE TABLE videos (
    id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    mtime TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    thumbnail_path TEXT,
    has_english_subtitles BOOLEAN DEFAULT 0,
    has_chinese_subtitles BOOLEAN DEFAULT 0,
    fast_hash TEXT,
    full_hash TEXT,
    upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for videos table
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_upload_date ON videos(upload_date);

-- Create file_integrity_checks table
CREATE TABLE file_integrity_checks (
    id TEXT PRIMARY KEY NOT NULL,
    video_id TEXT NOT NULL,
    check_date TEXT NOT NULL,
    size_match BOOLEAN NOT NULL,
    mtime_match BOOLEAN NOT NULL,
    fast_hash_match BOOLEAN,
    full_hash_match BOOLEAN,
    status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'missing')),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Create indexes for file_integrity_checks table
CREATE INDEX idx_file_integrity_checks_video_id ON file_integrity_checks(video_id);
CREATE INDEX idx_file_integrity_checks_check_date ON file_integrity_checks(check_date);
CREATE INDEX idx_file_integrity_checks_status ON file_integrity_checks(status);

-- Create subtitles table
CREATE TABLE subtitles (
    id TEXT PRIMARY KEY NOT NULL,
    video_id TEXT NOT NULL,
    language TEXT NOT NULL,
    file_path TEXT NOT NULL,
    extracted_date TEXT,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Create indexes for subtitles table
CREATE INDEX idx_subtitles_video_id ON subtitles(video_id);
