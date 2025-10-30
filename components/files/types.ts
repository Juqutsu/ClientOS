export type FileRecord = {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  storage_path: string | null;
  preview_url: string | null;
  folder: string | null;
  tags: string[] | null;
  mime_type: string | null;
  file_size: number | null;
  scan_status: 'pending' | 'scanning' | 'clean' | 'flagged' | 'failed' | null;
  created_at: string;
  updated_at: string | null;
};
