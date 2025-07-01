// @generated automatically by Diesel CLI.

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

diesel::joinable!(user_profiles -> users (user_id));
diesel::joinable!(user_settings -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    user_profiles,
    user_settings,
    users,
);
