// Shared TypeScript types for CivicResponse AI - Phase 1
// These types closely mirror the Supabase database schema

// ─── Enums ───────────────────────────────────────────────

export type UserRole = 'citizen' | 'authority' | 'worker';

export type IncidentStatus =
  | 'pending'
  | 'assigned'
  | 'in-progress'
  | 'resolved'
  | 'rejected';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentSource = 'web' | 'whatsapp';

export type QrProjectStatus =
  | 'planned'
  | 'active'
  | 'delayed'
  | 'completed'
  | 'cancelled';

// ─── Core Entities ───────────────────────────────────────

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  language?: string;
  trust_score?: number;
  department?: string | null;
  profile_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AiStructuredData {
  has_visible_damage?: boolean;
  safety_hazard?: boolean;
  hazard_description?: string;
  estimated_size?: string;
  objects_detected?: string[];
  severity_explanation?: string;
  escalation_level?: string;
  secondary_departments?: string[];
  is_spam?: boolean;
  spam_score?: number;
  spam_reason?: string;
}

export interface Incident {
  id: string;
  tracking_id: string;
  citizen_id: string;
  title: string;
  description: string;
  category: string;
  severity: IncidentSeverity;
  department?: string | null;
  status: IncidentStatus;
  location_lat?: number | null;
  location_lng?: number | null;
  address?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  assigned_to?: string | null;
  source?: IncidentSource;
  ai_summary?: string | null;
  // AI pipeline enrichment fields
  ai_category?: string | null;
  ai_severity?: string | null;
  ai_department?: string | null;
  ai_vision_analysis?: string | null;
  ai_confidence_score?: number | null;
  ai_processing_status?: string | null;
  ai_structured_data?: AiStructuredData | null;
  generated_title?: string | null;
  generated_summary?: string | null;
  translated_text?: string | null;
  original_text?: string | null;
  detected_language?: string | null;
  transcript_text?: string | null;
  // Phase 3: Clustering fields
  cluster_id?: string | null;
  is_primary_incident?: boolean;
  duplicate_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  updated_by: string;
  status: IncidentStatus;
  note?: string | null;
  before_image_url?: string | null;
  after_image_url?: string | null;
  created_at: string;
}

export interface QrProject {
  id: string;
  title: string;
  description: string;
  department: string;
  contractor?: string | null;
  budget?: number | null;
  start_date?: string | null;
  expected_end_date?: string | null;
  progress_percentage: number;
  status: QrProjectStatus;
  latitude?: number | null;
  longitude?: number | null;
  qr_code_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── Dashboard Stats ──────────────────────────────────────

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected?: number;
}

// ─── API Response Wrappers ────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  detail?: string;   // FastAPI HTTPException shape
  errors?: string[];
}

// ─── Form Types ───────────────────────────────────────────

export interface IncidentFormData {
  title: string;
  category: string;
  description: string;
  address: string;
}

export interface QrProjectFormData {
  title: string;
  description: string;
  department: string;
  budget: string;
}
