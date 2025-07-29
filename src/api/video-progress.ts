import { invoke } from "@tauri-apps/api/core";

export interface VideoProgress {
  id: string;
  user_id: number;
  video_id: string;
  position: number;
  duration: number;
  updated_at: string;
}

export interface VideoProgressPayload {
  user_id: number;
  video_id: string;
  position: number;
  duration: number;
}

export const videoProgressApi = {
  save: async (payload: VideoProgressPayload): Promise<VideoProgress> => {
    return await invoke("save_video_progress", { payload });
  },

  get: async (userId: number, videoId: string): Promise<VideoProgress | null> => {
    return await invoke("get_video_progress", { userId, videoId });
  },

  delete: async (userId: number, videoId: string): Promise<number> => {
    return await invoke("delete_video_progress", { userId, videoId });
  },
};