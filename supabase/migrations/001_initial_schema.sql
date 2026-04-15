-- IRRIGO — Initial Schema

-- COMPANIES
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  siren TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- MEMBERS
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'chef_equipe', 'technicien')),
  avatar_url TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- SITES
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'a_faire' CHECK (status IN ('fait', 'a_faire', 'probleme')),
  assigned_technician_id UUID REFERENCES members(id) ON DELETE SET NULL,
  responsible_id UUID REFERENCES members(id) ON DELETE SET NULL,
  plan_url TEXT,
  notes TEXT,
  last_maintenance_date TIMESTAMPTZ,
  next_maintenance_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ZONES
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('turbine', 'tuyere', 'goutte_a_goutte', 'micro_aspersion', 'autre')),
  status TEXT NOT NULL DEFAULT 'a_faire' CHECK (status IN ('fait', 'a_faire', 'probleme')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SCHEDULES
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  days_of_week INTEGER[] NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PROBLEMS
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES members(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES members(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('fuite', 'casse', 'panne_programmateur', 'buse_bloquee', 'pression', 'autre')),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  description TEXT NOT NULL,
  photos TEXT[],
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved_pending', 'resolved')),
  resolved_by UUID REFERENCES members(id),
  resolved_at TIMESTAMPTZ,
  validated_by UUID REFERENCES members(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PENDING CHANGES
CREATE TABLE pending_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES members(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('update_schedule', 'resolve_problem')),
  old_value JSONB,
  new_value JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES members(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- COMMENTS
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  author_id UUID REFERENCES members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MAINTENANCES
CREATE TABLE maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'overdue')),
  assigned_to UUID REFERENCES members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ACTIVITY LOG
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('problem_reported', 'validation_pending', 'assignment', 'maintenance_reminder', 'mention', 'problem_resolved')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  related_problem_id UUID REFERENCES problems(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's company IDs
CREATE OR REPLACE FUNCTION get_my_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM members WHERE user_id = auth.uid();
$$;

-- Helper: get current user's role in a company
CREATE OR REPLACE FUNCTION get_my_role(p_company_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM members WHERE user_id = auth.uid() AND company_id = p_company_id LIMIT 1;
$$;

-- Helper: get current member id
CREATE OR REPLACE FUNCTION get_my_member_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- COMPANIES policies
CREATE POLICY "members can view their company" ON companies
  FOR SELECT USING (id IN (SELECT get_my_company_ids()));

CREATE POLICY "anyone can create a company" ON companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admins can update company" ON companies
  FOR UPDATE USING (get_my_role(id) = 'admin');

-- MEMBERS policies
CREATE POLICY "members can view company members" ON members
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "can insert member in own company" ON members
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()) OR user_id = auth.uid());

CREATE POLICY "admins can update members" ON members
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "admins can delete members" ON members
  FOR DELETE USING (get_my_role(company_id) = 'admin');

-- SITES policies
CREATE POLICY "view sites in company" ON sites
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "create sites in company" ON sites
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "update sites in company" ON sites
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "admins can delete sites" ON sites
  FOR DELETE USING (get_my_role(company_id) = 'admin');

-- ZONES policies
CREATE POLICY "view zones" ON zones
  FOR SELECT USING (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "create zones" ON zones
  FOR INSERT WITH CHECK (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "update zones" ON zones
  FOR UPDATE USING (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "delete zones" ON zones
  FOR DELETE USING (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

-- SCHEDULES policies
CREATE POLICY "view schedules" ON schedules
  FOR SELECT USING (zone_id IN (SELECT z.id FROM zones z JOIN sites s ON z.site_id = s.id WHERE s.company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "create schedules" ON schedules
  FOR INSERT WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN sites s ON z.site_id = s.id WHERE s.company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "update schedules" ON schedules
  FOR UPDATE USING (zone_id IN (SELECT z.id FROM zones z JOIN sites s ON z.site_id = s.id WHERE s.company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "delete schedules" ON schedules
  FOR DELETE USING (zone_id IN (SELECT z.id FROM zones z JOIN sites s ON z.site_id = s.id WHERE s.company_id IN (SELECT get_my_company_ids())));

-- PROBLEMS policies
CREATE POLICY "view problems" ON problems
  FOR SELECT USING (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "create problems" ON problems
  FOR INSERT WITH CHECK (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "update problems" ON problems
  FOR UPDATE USING (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

-- PENDING_CHANGES policies
CREATE POLICY "view pending changes" ON pending_changes
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "create pending changes" ON pending_changes
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "update pending changes" ON pending_changes
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()));

-- COMMENTS policies
CREATE POLICY "view comments" ON comments
  FOR SELECT USING (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

CREATE POLICY "create comments" ON comments
  FOR INSERT WITH CHECK (site_id IN (SELECT id FROM sites WHERE company_id IN (SELECT get_my_company_ids())));

-- MAINTENANCES policies
CREATE POLICY "view maintenances" ON maintenances
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "create maintenances" ON maintenances
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "update maintenances" ON maintenances
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "delete maintenances" ON maintenances
  FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

-- ACTIVITY_LOG policies
CREATE POLICY "view activity log" ON activity_log
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "create activity log" ON activity_log
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));

-- NOTIFICATIONS policies
CREATE POLICY "view own notifications" ON notifications
  FOR SELECT USING (recipient_id = get_my_member_id());

CREATE POLICY "create notifications" ON notifications
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "update own notifications" ON notifications
  FOR UPDATE USING (recipient_id = get_my_member_id());

-- =====================
-- REALTIME
-- =====================
ALTER PUBLICATION supabase_realtime ADD TABLE sites;
ALTER PUBLICATION supabase_realtime ADD TABLE zones;
ALTER PUBLICATION supabase_realtime ADD TABLE problems;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_changes;

-- =====================
-- STORAGE BUCKET
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('irrigo', 'irrigo', true);

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'irrigo');

CREATE POLICY "Anyone can view" ON storage.objects
  FOR SELECT USING (bucket_id = 'irrigo');

CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'irrigo');
