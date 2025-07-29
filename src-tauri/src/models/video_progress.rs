use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use crate::schema::video_progress;

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Insertable, AsChangeset)]
#[diesel(table_name = video_progress)]
pub struct VideoProgress {
    pub id: String,
    pub user_id: i32,
    pub video_id: String,
    pub position: i32,
    pub duration: i32,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Insertable)]
#[diesel(table_name = video_progress)]
pub struct NewVideoProgress {
    pub id: String,
    pub user_id: i32,
    pub video_id: String,
    pub position: i32,
    pub duration: i32,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, AsChangeset)]
#[diesel(table_name = video_progress)]
pub struct UpdateVideoProgress {
    pub position: i32,
    pub duration: i32,
    pub updated_at: String,
}