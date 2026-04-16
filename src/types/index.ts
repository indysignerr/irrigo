export type Role = 'admin' | 'chef_equipe' | 'technicien'
export type SiteStatus = 'fait' | 'a_faire' | 'probleme'
export type ZoneType = 'turbine' | 'tuyere' | 'goutte_a_goutte' | 'micro_aspersion' | 'autre'
export type ZoneStatus = 'fait' | 'a_faire' | 'probleme'
export type ProblemCategory = 'fuite' | 'casse' | 'panne_programmateur' | 'buse_bloquee' | 'pression' | 'autre'
export type Urgency = 'low' | 'medium' | 'high'
export type ProblemStatus = 'open' | 'in_progress' | 'resolved_pending' | 'resolved'
export type ChangeType = 'update_schedule' | 'resolve_problem'
export type ChangeStatus = 'pending' | 'approved' | 'rejected'
export type MaintenanceStatus = 'planned' | 'done' | 'overdue'
export type NotificationType = 'problem_reported' | 'validation_pending' | 'assignment' | 'maintenance_reminder' | 'mention' | 'problem_resolved'

export interface Company {
  id: string
  name: string
  siren?: string
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  user_id: string
  company_id: string
  first_name: string
  last_name: string
  email: string
  role: Role
  avatar_url?: string
  fcm_token?: string
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  company_id: string
  client_name: string
  address: string
  city?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  status: SiteStatus
  assigned_technician_id?: string
  responsible_id?: string
  plan_url?: string
  notes?: string
  last_maintenance_date?: string
  next_maintenance_date?: string
  created_at: string
  updated_at: string
  // Joined
  assigned_technician?: Member
  responsible?: Member
  zones?: Zone[]
  problems_count?: number
}

export interface Zone {
  id: string
  site_id: string
  name: string
  type?: ZoneType
  status: ZoneStatus
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  schedules?: Schedule[]
}

export interface Schedule {
  id: string
  zone_id: string
  days_of_week: number[]
  start_time: string
  duration_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PendingChange {
  id: string
  company_id: string
  schedule_id?: string
  problem_id?: string
  requested_by: string
  change_type: ChangeType
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  status: ChangeStatus
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  // Joined
  requester?: Member
  reviewer?: Member
  schedule?: Schedule
  problem?: Problem
}

export interface Problem {
  id: string
  site_id: string
  zone_id?: string
  reported_by?: string
  assigned_to?: string
  category: ProblemCategory
  urgency: Urgency
  description: string
  photos?: string[]
  status: ProblemStatus
  resolved_by?: string
  resolved_at?: string
  validated_by?: string
  validated_at?: string
  created_at: string
  updated_at: string
  // Joined
  reporter?: Member
  assignee?: Member
  zone?: Zone
  site?: Site
}

export interface Comment {
  id: string
  site_id: string
  author_id: string
  content: string
  mentions?: string[]
  created_at: string
  // Joined
  author?: Member
}

export interface Maintenance {
  id: string
  site_id: string
  company_id: string
  title: string
  description?: string
  scheduled_date: string
  is_recurring: boolean
  recurrence_rule?: string
  status: MaintenanceStatus
  assigned_to?: string
  created_by?: string
  completed_at?: string
  created_at: string
  updated_at: string
  // Joined
  assignee?: Member
  site?: Site
}

export interface ActivityLog {
  id: string
  company_id: string
  member_id?: string
  site_id?: string
  action: string
  details?: Record<string, unknown>
  created_at: string
  // Joined
  member?: Member
  site?: Site
}

export interface Notification {
  id: string
  company_id: string
  recipient_id: string
  type: NotificationType
  title: string
  message: string
  related_site_id?: string
  related_problem_id?: string
  is_read: boolean
  created_at: string
}

// ===========================
// PHASE 1: Interventions
// ===========================

export type InterventionStatus = 'in_progress' | 'completed' | 'cancelled'

export interface InterventionTemplate {
  id: string
  company_id: string
  name: string
  description?: string
  icon?: string
  created_by?: string
  created_at: string
  updated_at: string
  items?: TemplateChecklistItem[]
}

export interface TemplateChecklistItem {
  id: string
  template_id: string
  label: string
  order_index: number
  is_required: boolean
}

export interface Intervention {
  id: string
  company_id: string
  site_id: string
  technician_id?: string
  template_id?: string
  title: string
  description?: string
  status: InterventionStatus
  started_at: string
  completed_at?: string
  duration_minutes?: number
  client_signature?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  site?: Site
  technician?: Member
  template?: InterventionTemplate
  checklist?: InterventionChecklistItem[]
  materials?: InterventionMaterial[]
  photos?: InterventionPhoto[]
}

export interface InterventionChecklistItem {
  id: string
  intervention_id: string
  label: string
  order_index: number
  is_checked: boolean
  notes?: string
  checked_at?: string
}

export interface InterventionMaterial {
  id: string
  intervention_id: string
  name: string
  quantity: number
  unit: string
  unit_price?: number
  notes?: string
  created_at: string
}

export interface InterventionPhoto {
  id: string
  intervention_id: string
  zone_id?: string
  url: string
  annotation_data?: Record<string, unknown>
  caption?: string
  taken_at: string
}

export interface ZonePhoto {
  id: string
  zone_id: string
  url: string
  caption?: string
  taken_by?: string
  taken_at: string
  // Joined
  photographer?: Member
}
