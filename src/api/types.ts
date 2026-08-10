export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface BraceletSummary {
  device_uid: string;
  serial_number: string;
  display_name: string;
}

export interface Bracelet {
  id: number;
  user_id: number | null;
  device_uid: string;
  serial_number: string;
  display_name: string;
  firmware_version: string | null;
  mac_address: string | null;
  status: "active" | "inactive" | "lost" | "retired";
  paired_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: number;
  bracelet_id: number;
  captured_at: string;
  heart_rate_bpm: number | null;
  spo2_percent: number | null;
  step_count: number;
  motion_level: number | null;
  signal_quality: number | null;
  raw_payload: unknown;
  source_topic: string | null;
  received_at: string;
  created_at: string;
  bracelet: BraceletSummary;
}

export interface Statistics {
  measurements_count: number;
  avg_heart_rate_bpm: number | null;
  min_heart_rate_bpm: number | null;
  max_heart_rate_bpm: number | null;
  avg_spo2_percent: number | null;
  max_step_count: number;
  last_measurement_at: string | null;
}

export type MetricKey =
  | "heart_rate_bpm"
  | "spo2_percent"
  | "step_count"
  | "signal_quality";

export type RangeKey = "24h" | "7d" | "30d";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
}
