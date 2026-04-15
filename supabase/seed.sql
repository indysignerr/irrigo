-- IRRIGO SEED DATA
-- Run this AFTER creating auth users via the app or Supabase dashboard
-- This script uses placeholder UUIDs that must be replaced with actual user IDs

-- Step 1: Create the company
INSERT INTO companies (id, name, siren) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Jardins du Soleil', '123456789');

-- Step 2: Create members (user_id must match auth.users after signup)
-- You'll need to replace these user_id values with real ones after creating users via Supabase Auth
-- For demo, we use placeholder UUIDs
INSERT INTO members (id, user_id, company_id, first_name, last_name, email, role) VALUES
  ('m0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Marc', 'Dupont', 'marc@jardinsdusoleil.fr', 'admin'),
  ('m0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Sophie', 'Bernard', 'sophie@jardinsdusoleil.fr', 'chef_equipe'),
  ('m0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Lucas', 'Martin', 'lucas@jardinsdusoleil.fr', 'technicien'),
  ('m0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Emma', 'Petit', 'emma@jardinsdusoleil.fr', 'technicien'),
  ('m0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'Thomas', 'Roux', 'thomas@jardinsdusoleil.fr', 'technicien');

-- Step 3: Sites
INSERT INTO sites (id, company_id, client_name, address, city, postal_code, latitude, longitude, status, assigned_technician_id, responsible_id) VALUES
  ('s0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Villa Les Oliviers', '12 chemin des Collines', 'Nice', '06000', 43.7102, 7.2620, 'fait', 'm0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000002'),
  ('s0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Résidence Le Parc', '45 avenue de la Lanterne', 'Antibes', '06600', 43.5804, 7.1284, 'a_faire', 'm0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000002'),
  ('s0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Domaine Saint-Michel', '8 route de Grasse', 'Mougins', '06250', 43.6007, 6.9953, 'probleme', 'm0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000002'),
  ('s0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Mas de la Siagne', '23 boulevard Carnot', 'Cannes', '06400', 43.5513, 7.0128, 'fait', 'm0000000-0000-0000-0000-000000000005', 'm0000000-0000-0000-0000-000000000002'),
  ('s0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'Jardin des Parfumeurs', '5 place du Cours', 'Grasse', '06130', 43.6588, 6.9228, 'a_faire', 'm0000000-0000-0000-0000-000000000005', 'm0000000-0000-0000-0000-000000000002');

-- Step 4: Zones
-- Villa Les Oliviers
INSERT INTO zones (id, site_id, name, type, status) VALUES
  ('z0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'Pelouse avant', 'turbine', 'fait'),
  ('z0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'Massifs latéraux', 'goutte_a_goutte', 'fait'),
  ('z0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'Jardin arrière', 'tuyere', 'fait');

-- Résidence Le Parc
INSERT INTO zones (id, site_id, name, type, status) VALUES
  ('z0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000002', 'Entrée principale', 'turbine', 'fait'),
  ('z0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000002', 'Parc central', 'turbine', 'a_faire'),
  ('z0000000-0000-0000-0000-000000000006', 's0000000-0000-0000-0000-000000000002', 'Haies périphériques', 'goutte_a_goutte', 'a_faire'),
  ('z0000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000002', 'Jardinières terrasse', 'micro_aspersion', 'fait');

-- Domaine Saint-Michel
INSERT INTO zones (id, site_id, name, type, status) VALUES
  ('z0000000-0000-0000-0000-000000000008', 's0000000-0000-0000-0000-000000000003', 'Pelouse sud', 'turbine', 'fait'),
  ('z0000000-0000-0000-0000-000000000009', 's0000000-0000-0000-0000-000000000003', 'Haie nord', 'goutte_a_goutte', 'probleme'),
  ('z0000000-0000-0000-0000-000000000010', 's0000000-0000-0000-0000-000000000003', 'Massifs ouest', 'tuyere', 'a_faire');

-- Mas de la Siagne
INSERT INTO zones (id, site_id, name, type, status) VALUES
  ('z0000000-0000-0000-0000-000000000011', 's0000000-0000-0000-0000-000000000004', 'Gazon principal', 'turbine', 'fait'),
  ('z0000000-0000-0000-0000-000000000012', 's0000000-0000-0000-0000-000000000004', 'Oliviers', 'goutte_a_goutte', 'fait');

-- Jardin des Parfumeurs
INSERT INTO zones (id, site_id, name, type, status) VALUES
  ('z0000000-0000-0000-0000-000000000013', 's0000000-0000-0000-0000-000000000005', 'Roseraie', 'micro_aspersion', 'fait'),
  ('z0000000-0000-0000-0000-000000000014', 's0000000-0000-0000-0000-000000000005', 'Lavandes', 'goutte_a_goutte', 'a_faire'),
  ('z0000000-0000-0000-0000-000000000015', 's0000000-0000-0000-0000-000000000005', 'Pelouse événementielle', 'turbine', 'a_faire');

-- Step 5: Schedules
INSERT INTO schedules (zone_id, days_of_week, start_time, duration_minutes) VALUES
  ('z0000000-0000-0000-0000-000000000001', '{1,3,5}', '06:00', 30),
  ('z0000000-0000-0000-0000-000000000002', '{2,4,6}', '07:00', 45),
  ('z0000000-0000-0000-0000-000000000003', '{1,3,5}', '06:30', 20),
  ('z0000000-0000-0000-0000-000000000004', '{1,3,5}', '05:30', 25),
  ('z0000000-0000-0000-0000-000000000005', '{2,4,6}', '06:00', 40),
  ('z0000000-0000-0000-0000-000000000006', '{1,2,3,4,5}', '07:00', 60),
  ('z0000000-0000-0000-0000-000000000007', '{0,1,2,3,4,5,6}', '08:00', 15),
  ('z0000000-0000-0000-0000-000000000008', '{1,3,5}', '06:00', 35),
  ('z0000000-0000-0000-0000-000000000009', '{2,4,6}', '06:30', 50),
  ('z0000000-0000-0000-0000-000000000010', '{3,6}', '07:00', 20),
  ('z0000000-0000-0000-0000-000000000011', '{0,1,3,5}', '05:00', 30),
  ('z0000000-0000-0000-0000-000000000012', '{2,5}', '06:00', 90),
  ('z0000000-0000-0000-0000-000000000013', '{0,1,2,3,4,5,6}', '06:00', 20),
  ('z0000000-0000-0000-0000-000000000014', '{1,4}', '07:00', 45),
  ('z0000000-0000-0000-0000-000000000015', '{2,5,0}', '05:30', 40);

-- Step 6: Problems
INSERT INTO problems (id, site_id, zone_id, reported_by, category, urgency, description, status) VALUES
  ('p0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000003', 'z0000000-0000-0000-0000-000000000009', 'm0000000-0000-0000-0000-000000000003', 'fuite', 'high', 'Fuite importante au niveau du raccord T de la zone B, eau stagnante visible au pied de la haie. Nécessite remplacement du raccord.', 'open'),
  ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', NULL, 'm0000000-0000-0000-0000-000000000004', 'panne_programmateur', 'medium', 'Programmateur Hunter ne répond plus, écran éteint. Le gardien signale que ça date d''un orage la semaine dernière.', 'open');

-- Step 7: Maintenances
INSERT INTO maintenances (site_id, company_id, title, description, scheduled_date, is_recurring, recurrence_rule, assigned_to, created_by) VALUES
  ('s0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Mise en route printemps', NULL, '2026-04-20', true, 'annual', 'm0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000001'),
  ('s0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Vérification pression réseau', NULL, '2026-04-25', false, NULL, 'm0000000-0000-0000-0000-000000000005', 'm0000000-0000-0000-0000-000000000001'),
  ('s0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Purge hivernage', NULL, '2026-11-15', true, 'annual', 'm0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000001');

-- Step 8: Comments
INSERT INTO comments (site_id, author_id, content, created_at) VALUES
  ('s0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000002', 'J''ai coupé l''eau de la zone Haie nord en attendant la réparation. @Lucas Martin peux-tu passer demain matin avec un raccord T 25mm ?', now() - interval '2 hours'),
  ('s0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000003', 'OK je passe demain avant 9h. Je prends aussi un coude de rechange au cas où.', now() - interval '1 hour'),
  ('s0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000004', 'Le gardien m''a dit que le programmateur a pris la foudre la semaine dernière. Il faudra probablement le remplacer entièrement.', now() - interval '1 day'),
  ('s0000000-0000-0000-0000-000000000005', 'm0000000-0000-0000-0000-000000000005', 'Les lavandes ont l''air desséchées, je pense qu''il faut augmenter la durée d''arrosage à 60min.', now() - interval '3 days');

-- Step 9: Activity Log
INSERT INTO activity_log (company_id, member_id, site_id, action, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000003', 'Lucas a signalé un problème sur Domaine Saint-Michel', now() - interval '3 hours'),
  ('c0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000003', 'Sophie a commenté sur Domaine Saint-Michel', now() - interval '2 hours'),
  ('c0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000003', 'Lucas a commenté sur Domaine Saint-Michel', now() - interval '1 hour'),
  ('c0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000002', 'Emma a signalé un problème sur Résidence Le Parc', now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'Marc a créé l''entretien "Mise en route printemps" pour Villa Les Oliviers', now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000004', 'Thomas a passé toutes les zones de Mas de la Siagne en "fait"', now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000005', 'Thomas a commenté sur Jardin des Parfumeurs', now() - interval '3 days');
