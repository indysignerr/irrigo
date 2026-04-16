-- PHASE 1 — Intervention workflow + photos + templates

-- ====================================================
-- TEMPLATES D'INTERVENTION
-- ====================================================
CREATE TABLE intervention_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items de la checklist du template
CREATE TABLE template_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES intervention_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false
);

-- ====================================================
-- INTERVENTIONS
-- ====================================================
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES members(id) ON DELETE SET NULL,
  template_id UUID REFERENCES intervention_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  client_signature TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items de la checklist exécutée
CREATE TABLE intervention_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_checked BOOLEAN DEFAULT false,
  notes TEXT,
  checked_at TIMESTAMPTZ
);

-- Matériel utilisé
CREATE TABLE intervention_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  unit_price NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos de l'intervention
CREATE TABLE intervention_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  annotation_data JSONB,
  caption TEXT,
  taken_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================
-- PHOTOS HISTORIQUE PAR ZONE (indépendant des interventions)
-- ====================================================
CREATE TABLE zone_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  taken_by UUID REFERENCES members(id) ON DELETE SET NULL,
  taken_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================
-- RLS POLICIES
-- ====================================================
ALTER TABLE intervention_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_photos ENABLE ROW LEVEL SECURITY;

-- intervention_templates
CREATE POLICY "view templates" ON intervention_templates
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "create templates" ON intervention_templates
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "update templates" ON intervention_templates
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "delete templates" ON intervention_templates
  FOR DELETE USING (get_my_role(company_id) = 'admin');

-- template_checklist_items
CREATE POLICY "view template items" ON template_checklist_items
  FOR SELECT USING (template_id IN (SELECT id FROM intervention_templates WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "create template items" ON template_checklist_items
  FOR INSERT WITH CHECK (template_id IN (SELECT id FROM intervention_templates WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "update template items" ON template_checklist_items
  FOR UPDATE USING (template_id IN (SELECT id FROM intervention_templates WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "delete template items" ON template_checklist_items
  FOR DELETE USING (template_id IN (SELECT id FROM intervention_templates WHERE company_id IN (SELECT get_my_company_ids())));

-- interventions
CREATE POLICY "view interventions" ON interventions
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "create interventions" ON interventions
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "update interventions" ON interventions
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "delete interventions" ON interventions
  FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

-- intervention_checklist_items
CREATE POLICY "view checklist" ON intervention_checklist_items
  FOR SELECT USING (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "create checklist" ON intervention_checklist_items
  FOR INSERT WITH CHECK (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "update checklist" ON intervention_checklist_items
  FOR UPDATE USING (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));

-- intervention_materials
CREATE POLICY "view materials" ON intervention_materials
  FOR SELECT USING (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "create materials" ON intervention_materials
  FOR INSERT WITH CHECK (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "update materials" ON intervention_materials
  FOR UPDATE USING (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "delete materials" ON intervention_materials
  FOR DELETE USING (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));

-- intervention_photos
CREATE POLICY "view inter photos" ON intervention_photos
  FOR SELECT USING (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "create inter photos" ON intervention_photos
  FOR INSERT WITH CHECK (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "delete inter photos" ON intervention_photos
  FOR DELETE USING (intervention_id IN (SELECT id FROM interventions WHERE company_id IN (SELECT get_my_company_ids())));

-- zone_photos
CREATE POLICY "view zone photos" ON zone_photos
  FOR SELECT USING (zone_id IN (SELECT z.id FROM zones z JOIN sites s ON z.site_id = s.id WHERE s.company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "create zone photos" ON zone_photos
  FOR INSERT WITH CHECK (zone_id IN (SELECT z.id FROM zones z JOIN sites s ON z.site_id = s.id WHERE s.company_id IN (SELECT get_my_company_ids())));
CREATE POLICY "delete zone photos" ON zone_photos
  FOR DELETE USING (zone_id IN (SELECT z.id FROM zones z JOIN sites s ON z.site_id = s.id WHERE s.company_id IN (SELECT get_my_company_ids())));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE interventions;
ALTER PUBLICATION supabase_realtime ADD TABLE intervention_checklist_items;

-- ====================================================
-- SEED: TEMPLATES PAR DÉFAUT POUR LA DÉMO
-- ====================================================
DO $$
DECLARE
  v_company_id UUID;
  v_template_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE name = 'Jardins du Soleil' LIMIT 1;
  IF v_company_id IS NULL THEN RETURN; END IF;

  -- Template 1: Mise en route printemps
  INSERT INTO intervention_templates (company_id, name, description, icon)
  VALUES (v_company_id, 'Mise en route printemps', 'Remise en service du réseau après l''hiver', 'sun')
  RETURNING id INTO v_template_id;

  INSERT INTO template_checklist_items (template_id, label, order_index, is_required) VALUES
    (v_template_id, 'Ouvrir l''arrivée d''eau générale', 0, true),
    (v_template_id, 'Vérifier la pression du réseau', 1, true),
    (v_template_id, 'Tester chaque zone individuellement', 2, true),
    (v_template_id, 'Inspecter chaque buse/turbine/goutteur', 3, true),
    (v_template_id, 'Remplacer les pièces défectueuses', 4, false),
    (v_template_id, 'Reprogrammer le programmateur', 5, true),
    (v_template_id, 'Vérifier le bon fonctionnement final', 6, true),
    (v_template_id, 'Prendre photo avant/après', 7, false);

  -- Template 2: Purge hivernage
  INSERT INTO intervention_templates (company_id, name, description, icon)
  VALUES (v_company_id, 'Purge hivernage', 'Protection du réseau avant l''hiver', 'snowflake')
  RETURNING id INTO v_template_id;

  INSERT INTO template_checklist_items (template_id, label, order_index, is_required) VALUES
    (v_template_id, 'Couper l''arrivée d''eau', 0, true),
    (v_template_id, 'Vidanger le réseau principal', 1, true),
    (v_template_id, 'Souffler à l''air comprimé zone par zone', 2, true),
    (v_template_id, 'Protéger le programmateur', 3, true),
    (v_template_id, 'Isoler les tuyaux apparents', 4, false),
    (v_template_id, 'Noter les réparations à prévoir', 5, false);

  -- Template 3: Remplacement programmateur
  INSERT INTO intervention_templates (company_id, name, description, icon)
  VALUES (v_company_id, 'Remplacement programmateur', 'Installation d''un nouveau programmateur', 'cpu')
  RETURNING id INTO v_template_id;

  INSERT INTO template_checklist_items (template_id, label, order_index, is_required) VALUES
    (v_template_id, 'Couper l''alimentation électrique', 0, true),
    (v_template_id, 'Noter le câblage existant', 1, true),
    (v_template_id, 'Démonter l''ancien programmateur', 2, true),
    (v_template_id, 'Installer le nouveau programmateur', 3, true),
    (v_template_id, 'Reconnecter les zones', 4, true),
    (v_template_id, 'Configurer les programmations', 5, true),
    (v_template_id, 'Tester chaque zone', 6, true),
    (v_template_id, 'Former le client à l''utilisation', 7, false);

  -- Template 4: Intervention urgente (fuite)
  INSERT INTO intervention_templates (company_id, name, description, icon)
  VALUES (v_company_id, 'Intervention fuite', 'Réparation urgente d''une fuite', 'alert-triangle')
  RETURNING id INTO v_template_id;

  INSERT INTO template_checklist_items (template_id, label, order_index, is_required) VALUES
    (v_template_id, 'Localiser la fuite', 0, true),
    (v_template_id, 'Couper la zone concernée', 1, true),
    (v_template_id, 'Photographier avant réparation', 2, true),
    (v_template_id, 'Réparer/remplacer la pièce', 3, true),
    (v_template_id, 'Photographier après réparation', 4, true),
    (v_template_id, 'Tester l''étanchéité', 5, true),
    (v_template_id, 'Remettre en service', 6, true);
END $$;
