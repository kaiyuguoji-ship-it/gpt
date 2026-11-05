export type Settings = { id: number; name: string; accepting_tasks: number; queue_enabled: number; version: number; updated_at: string };
export type Job = { id: string; kind: string; status: string; attempts: number; lease_token: string | null; lease_until: number | null; available_at: number; result_json: string | null; last_error: string | null; created_at: string; updated_at: string };
