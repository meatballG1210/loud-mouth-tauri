// @generated automatically by Diesel CLI.

diesel::table! {
    file_integrity_checks (id) {
        id -> Text,
        video_id -> Text,
        check_date -> Text,
        size_match -> Bool,
        mtime_match -> Bool,
        fast_hash_match -> Nullable<Bool>,
        full_hash_match -> Nullable<Bool>,
        status -> Text,
    }
}

diesel::table! {
    user_profiles (id) {
        id -> Integer,
        user_id -> Integer,
        username -> Nullable<Text>,
        display_name -> Nullable<Text>,
        bio -> Nullable<Text>,
        avatar_url -> Nullable<Text>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    user_settings (id) {
        id -> Integer,
        user_id -> Integer,
        theme -> Nullable<Text>,
        notifications_enabled -> Nullable<Bool>,
        language -> Nullable<Text>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    users (id) {
        id -> Integer,
        email -> Text,
        created_at -> Timestamp,
    }
}

diesel::table! {
    videos (id) {
        id -> Text,
        user_id -> Integer,
        title -> Text,
        filename -> Text,
        original_name -> Text,
        path -> Text,
        size -> Integer,
        mtime -> Text,
        duration -> Nullable<Integer>,
        thumbnail_path -> Nullable<Text>,
        has_english_subtitles -> Nullable<Bool>,
        has_chinese_subtitles -> Nullable<Bool>,
        fast_hash -> Nullable<Text>,
        full_hash -> Nullable<Text>,
        upload_date -> Nullable<Text>,
    }
}

diesel::joinable!(file_integrity_checks -> videos (video_id));
diesel::joinable!(user_profiles -> users (user_id));
diesel::joinable!(user_settings -> users (user_id));
diesel::joinable!(videos -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    file_integrity_checks,
    user_profiles,
    user_settings,
    users,
    videos,
);
