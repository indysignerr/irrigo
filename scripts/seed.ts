// Run with: npx tsx scripts/seed.ts
// Requires env vars: source <(grep -v '^#' .env.local | grep -v '^$' | sed 's/^/export /') && npx tsx scripts/seed.ts

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const PASSWORD = 'IrrigoDemo2026!'

const companyId = randomUUID()

const usersData = [
  { email: 'marc@jardinsdusoleil.fr', firstName: 'Marc', lastName: 'Dupont', role: 'admin', memberId: randomUUID() },
  { email: 'sophie@jardinsdusoleil.fr', firstName: 'Sophie', lastName: 'Bernard', role: 'chef_equipe', memberId: randomUUID() },
  { email: 'lucas@jardinsdusoleil.fr', firstName: 'Lucas', lastName: 'Martin', role: 'technicien', memberId: randomUUID() },
  { email: 'emma@jardinsdusoleil.fr', firstName: 'Emma', lastName: 'Petit', role: 'technicien', memberId: randomUUID() },
  { email: 'thomas@jardinsdusoleil.fr', firstName: 'Thomas', lastName: 'Roux', role: 'technicien', memberId: randomUUID() },
]

// Pre-generate all IDs
const siteIds = Array.from({ length: 5 }, () => randomUUID())
const zoneIds = Array.from({ length: 15 }, () => randomUUID())

async function seed() {
  console.log('🌱 Starting seed...')

  // 1. Create company
  const { error: compError } = await supabase.from('companies').insert({
    id: companyId, name: 'Jardins du Soleil', siren: '123456789',
  })
  if (compError) { console.error('Company error:', compError.message); return }
  console.log('✅ Company created')

  // 2. Create auth users & members
  const memberMap: Record<string, string> = {}

  for (const u of usersData) {
    // Delete existing user if any
    const { data: { users: existing } } = await supabase.auth.admin.listUsers()
    const existingUser = existing?.find(eu => eu.email === u.email)
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id)
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email, password: PASSWORD, email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    })

    if (authError || !authData.user) {
      console.error(`Auth error ${u.email}:`, authError?.message)
      continue
    }

    const { error: memError } = await supabase.from('members').insert({
      id: u.memberId, user_id: authData.user.id, company_id: companyId,
      first_name: u.firstName, last_name: u.lastName, email: u.email, role: u.role,
    })

    if (memError) { console.error(`Member error ${u.email}:`, memError.message); continue }
    memberMap[u.firstName] = u.memberId
    console.log(`✅ ${u.email} (${u.role})`)
  }

  const marc = memberMap['Marc']
  const sophie = memberMap['Sophie']
  const lucas = memberMap['Lucas']
  const emma = memberMap['Emma']
  const thomas = memberMap['Thomas']

  if (!marc || !sophie || !lucas || !emma || !thomas) {
    console.error('❌ Missing members, aborting'); return
  }

  // 3. Sites
  const sites = [
    { id: siteIds[0], company_id: companyId, client_name: 'Villa Les Oliviers', address: '12 chemin des Collines', city: 'Nice', postal_code: '06000', latitude: 43.7102, longitude: 7.2620, status: 'fait', assigned_technician_id: lucas, responsible_id: sophie },
    { id: siteIds[1], company_id: companyId, client_name: 'Résidence Le Parc', address: '45 avenue de la Lanterne', city: 'Antibes', postal_code: '06600', latitude: 43.5804, longitude: 7.1284, status: 'a_faire', assigned_technician_id: emma, responsible_id: sophie },
    { id: siteIds[2], company_id: companyId, client_name: 'Domaine Saint-Michel', address: '8 route de Grasse', city: 'Mougins', postal_code: '06250', latitude: 43.6007, longitude: 6.9953, status: 'probleme', assigned_technician_id: lucas, responsible_id: sophie },
    { id: siteIds[3], company_id: companyId, client_name: 'Mas de la Siagne', address: '23 boulevard Carnot', city: 'Cannes', postal_code: '06400', latitude: 43.5513, longitude: 7.0128, status: 'fait', assigned_technician_id: thomas, responsible_id: sophie },
    { id: siteIds[4], company_id: companyId, client_name: 'Jardin des Parfumeurs', address: '5 place du Cours', city: 'Grasse', postal_code: '06130', latitude: 43.6588, longitude: 6.9228, status: 'a_faire', assigned_technician_id: thomas, responsible_id: sophie },
  ]
  const { error: sErr } = await supabase.from('sites').insert(sites)
  if (sErr) console.error('Sites error:', sErr.message)
  else console.log('✅ 5 sites created')

  // 4. Zones
  const zones = [
    // Villa Les Oliviers
    { id: zoneIds[0], site_id: siteIds[0], name: 'Pelouse avant', type: 'turbine', status: 'fait' },
    { id: zoneIds[1], site_id: siteIds[0], name: 'Massifs latéraux', type: 'goutte_a_goutte', status: 'fait' },
    { id: zoneIds[2], site_id: siteIds[0], name: 'Jardin arrière', type: 'tuyere', status: 'fait' },
    // Résidence Le Parc
    { id: zoneIds[3], site_id: siteIds[1], name: 'Entrée principale', type: 'turbine', status: 'fait' },
    { id: zoneIds[4], site_id: siteIds[1], name: 'Parc central', type: 'turbine', status: 'a_faire' },
    { id: zoneIds[5], site_id: siteIds[1], name: 'Haies périphériques', type: 'goutte_a_goutte', status: 'a_faire' },
    { id: zoneIds[6], site_id: siteIds[1], name: 'Jardinières terrasse', type: 'micro_aspersion', status: 'fait' },
    // Domaine Saint-Michel
    { id: zoneIds[7], site_id: siteIds[2], name: 'Pelouse sud', type: 'turbine', status: 'fait' },
    { id: zoneIds[8], site_id: siteIds[2], name: 'Haie nord', type: 'goutte_a_goutte', status: 'probleme' },
    { id: zoneIds[9], site_id: siteIds[2], name: 'Massifs ouest', type: 'tuyere', status: 'a_faire' },
    // Mas de la Siagne
    { id: zoneIds[10], site_id: siteIds[3], name: 'Gazon principal', type: 'turbine', status: 'fait' },
    { id: zoneIds[11], site_id: siteIds[3], name: 'Oliviers', type: 'goutte_a_goutte', status: 'fait' },
    // Jardin des Parfumeurs
    { id: zoneIds[12], site_id: siteIds[4], name: 'Roseraie', type: 'micro_aspersion', status: 'fait' },
    { id: zoneIds[13], site_id: siteIds[4], name: 'Lavandes', type: 'goutte_a_goutte', status: 'a_faire' },
    { id: zoneIds[14], site_id: siteIds[4], name: 'Pelouse événementielle', type: 'turbine', status: 'a_faire' },
  ]
  const { error: zErr } = await supabase.from('zones').insert(zones)
  if (zErr) console.error('Zones error:', zErr.message)
  else console.log('✅ 15 zones created')

  // 5. Schedules
  const schedules = [
    { zone_id: zoneIds[0], days_of_week: [1,3,5], start_time: '06:00', duration_minutes: 30 },
    { zone_id: zoneIds[1], days_of_week: [2,4,6], start_time: '07:00', duration_minutes: 45 },
    { zone_id: zoneIds[2], days_of_week: [1,3,5], start_time: '06:30', duration_minutes: 20 },
    { zone_id: zoneIds[3], days_of_week: [1,3,5], start_time: '05:30', duration_minutes: 25 },
    { zone_id: zoneIds[4], days_of_week: [2,4,6], start_time: '06:00', duration_minutes: 40 },
    { zone_id: zoneIds[5], days_of_week: [1,2,3,4,5], start_time: '07:00', duration_minutes: 60 },
    { zone_id: zoneIds[6], days_of_week: [0,1,2,3,4,5,6], start_time: '08:00', duration_minutes: 15 },
    { zone_id: zoneIds[7], days_of_week: [1,3,5], start_time: '06:00', duration_minutes: 35 },
    { zone_id: zoneIds[8], days_of_week: [2,4,6], start_time: '06:30', duration_minutes: 50 },
    { zone_id: zoneIds[9], days_of_week: [3,6], start_time: '07:00', duration_minutes: 20 },
    { zone_id: zoneIds[10], days_of_week: [0,1,3,5], start_time: '05:00', duration_minutes: 30 },
    { zone_id: zoneIds[11], days_of_week: [2,5], start_time: '06:00', duration_minutes: 90 },
    { zone_id: zoneIds[12], days_of_week: [0,1,2,3,4,5,6], start_time: '06:00', duration_minutes: 20 },
    { zone_id: zoneIds[13], days_of_week: [1,4], start_time: '07:00', duration_minutes: 45 },
    { zone_id: zoneIds[14], days_of_week: [2,5,0], start_time: '05:30', duration_minutes: 40 },
  ]
  const { error: schErr } = await supabase.from('schedules').insert(schedules)
  if (schErr) console.error('Schedules error:', schErr.message)
  else console.log('✅ 15 schedules created')

  // 6. Problems
  const { error: pErr } = await supabase.from('problems').insert([
    { site_id: siteIds[2], zone_id: zoneIds[8], reported_by: lucas, category: 'fuite', urgency: 'high', description: "Fuite importante au niveau du raccord T de la zone B, eau stagnante visible au pied de la haie. Nécessite remplacement du raccord.", status: 'open' },
    { site_id: siteIds[1], reported_by: emma, category: 'panne_programmateur', urgency: 'medium', description: "Programmateur Hunter ne répond plus, écran éteint. Le gardien signale que ça date d'un orage la semaine dernière.", status: 'open' },
  ])
  if (pErr) console.error('Problems error:', pErr.message)
  else console.log('✅ 2 problems created')

  // 7. Maintenances
  const { error: mErr } = await supabase.from('maintenances').insert([
    { site_id: siteIds[0], company_id: companyId, title: 'Mise en route printemps', scheduled_date: '2026-04-20', is_recurring: true, recurrence_rule: 'annual', assigned_to: lucas, created_by: marc },
    { site_id: siteIds[3], company_id: companyId, title: 'Vérification pression réseau', scheduled_date: '2026-04-25', is_recurring: false, assigned_to: thomas, created_by: marc },
    { site_id: siteIds[2], company_id: companyId, title: 'Purge hivernage', scheduled_date: '2026-11-15', is_recurring: true, recurrence_rule: 'annual', assigned_to: emma, created_by: marc },
  ])
  if (mErr) console.error('Maintenances error:', mErr.message)
  else console.log('✅ 3 maintenances created')

  // 8. Comments
  const now = Date.now()
  const { error: cErr } = await supabase.from('comments').insert([
    { site_id: siteIds[2], author_id: sophie, content: "J'ai coupé l'eau de la zone Haie nord en attendant la réparation. @Lucas Martin peux-tu passer demain matin avec un raccord T 25mm ?", created_at: new Date(now - 2 * 3600000).toISOString() },
    { site_id: siteIds[2], author_id: lucas, content: "OK je passe demain avant 9h. Je prends aussi un coude de rechange au cas où.", created_at: new Date(now - 1 * 3600000).toISOString() },
    { site_id: siteIds[1], author_id: emma, content: "Le gardien m'a dit que le programmateur a pris la foudre la semaine dernière. Il faudra probablement le remplacer entièrement.", created_at: new Date(now - 24 * 3600000).toISOString() },
    { site_id: siteIds[4], author_id: thomas, content: "Les lavandes ont l'air desséchées, je pense qu'il faut augmenter la durée d'arrosage à 60min.", created_at: new Date(now - 72 * 3600000).toISOString() },
  ])
  if (cErr) console.error('Comments error:', cErr.message)
  else console.log('✅ 4 comments created')

  // 9. Activity Log
  const { error: aErr } = await supabase.from('activity_log').insert([
    { company_id: companyId, member_id: lucas, site_id: siteIds[2], action: 'Lucas a signalé un problème sur Domaine Saint-Michel', created_at: new Date(now - 3 * 3600000).toISOString() },
    { company_id: companyId, member_id: sophie, site_id: siteIds[2], action: 'Sophie a commenté sur Domaine Saint-Michel', created_at: new Date(now - 2 * 3600000).toISOString() },
    { company_id: companyId, member_id: lucas, site_id: siteIds[2], action: 'Lucas a commenté sur Domaine Saint-Michel', created_at: new Date(now - 1 * 3600000).toISOString() },
    { company_id: companyId, member_id: emma, site_id: siteIds[1], action: 'Emma a signalé un problème sur Résidence Le Parc', created_at: new Date(now - 24 * 3600000).toISOString() },
    { company_id: companyId, member_id: marc, site_id: siteIds[0], action: 'Marc a créé l\'entretien "Mise en route printemps" pour Villa Les Oliviers', created_at: new Date(now - 48 * 3600000).toISOString() },
    { company_id: companyId, member_id: thomas, site_id: siteIds[3], action: 'Thomas a passé toutes les zones de Mas de la Siagne en "fait"', created_at: new Date(now - 72 * 3600000).toISOString() },
    { company_id: companyId, member_id: thomas, site_id: siteIds[4], action: 'Thomas a commenté sur Jardin des Parfumeurs', created_at: new Date(now - 72 * 3600000).toISOString() },
  ])
  if (aErr) console.error('Activity error:', aErr.message)
  else console.log('✅ 7 activity logs created')

  console.log('\n🎉 Seed complete!')
  console.log('\nComptes de démo :')
  usersData.forEach(u => console.log(`  ${u.email} / ${PASSWORD} (${u.role})`))
}

seed().catch(console.error)
