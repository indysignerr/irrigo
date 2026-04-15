// Run with: npx tsx scripts/seed.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001'
const PASSWORD = 'IrrigoDemo2026!'

const users = [
  { email: 'marc@jardinsdusoleil.fr', firstName: 'Marc', lastName: 'Dupont', role: 'admin' },
  { email: 'sophie@jardinsdusoleil.fr', firstName: 'Sophie', lastName: 'Bernard', role: 'chef_equipe' },
  { email: 'lucas@jardinsdusoleil.fr', firstName: 'Lucas', lastName: 'Martin', role: 'technicien' },
  { email: 'emma@jardinsdusoleil.fr', firstName: 'Emma', lastName: 'Petit', role: 'technicien' },
  { email: 'thomas@jardinsdusoleil.fr', firstName: 'Thomas', lastName: 'Roux', role: 'technicien' },
]

async function seed() {
  console.log('🌱 Starting seed...')

  // 1. Create company
  const { error: compError } = await supabase.from('companies').upsert({
    id: COMPANY_ID,
    name: 'Jardins du Soleil',
    siren: '123456789',
  })
  if (compError) console.error('Company error:', compError.message)
  else console.log('✅ Company created')

  // 2. Create auth users & members
  const memberIds: Record<string, string> = {}
  const memberMap: Record<string, string> = {} // email -> member_id

  for (const user of users) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: user.firstName, last_name: user.lastName },
    })

    if (authError) {
      console.error(`Auth error for ${user.email}:`, authError.message)
      // Try to get existing user
      const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers()
      const existing = existingUsers?.find(u => u.email === user.email)
      if (existing) {
        console.log(`  Using existing user ${user.email}`)
        const memberId = `m${existing.id.slice(1)}`

        const { error: memErr } = await supabase.from('members').upsert({
          id: memberId,
          user_id: existing.id,
          company_id: COMPANY_ID,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          role: user.role,
        })
        if (memErr) console.error(`  Member error:`, memErr.message)
        memberIds[user.email] = memberId
        memberMap[user.firstName] = memberId
      }
      continue
    }

    if (authData.user) {
      const memberId = `m${authData.user.id.slice(1)}`

      const { error: memError } = await supabase.from('members').insert({
        id: memberId,
        user_id: authData.user.id,
        company_id: COMPANY_ID,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        role: user.role,
      })

      if (memError) console.error(`Member error for ${user.email}:`, memError.message)
      else console.log(`✅ User ${user.email} created`)

      memberIds[user.email] = memberId
      memberMap[user.firstName] = memberId
    }
  }

  const marc = memberMap['Marc'] || memberIds['marc@jardinsdusoleil.fr']
  const sophie = memberMap['Sophie'] || memberIds['sophie@jardinsdusoleil.fr']
  const lucas = memberMap['Lucas'] || memberIds['lucas@jardinsdusoleil.fr']
  const emma = memberMap['Emma'] || memberIds['emma@jardinsdusoleil.fr']
  const thomas = memberMap['Thomas'] || memberIds['thomas@jardinsdusoleil.fr']

  if (!marc || !sophie || !lucas || !emma || !thomas) {
    console.error('❌ Missing member IDs, aborting data seed')
    console.log('Member IDs:', { marc, sophie, lucas, emma, thomas })
    return
  }

  // 3. Sites
  const sitesData = [
    { id: 's0000000-0000-0000-0000-000000000001', client_name: 'Villa Les Oliviers', address: '12 chemin des Collines', city: 'Nice', postal_code: '06000', latitude: 43.7102, longitude: 7.2620, status: 'fait', assigned_technician_id: lucas, responsible_id: sophie },
    { id: 's0000000-0000-0000-0000-000000000002', client_name: 'Résidence Le Parc', address: '45 avenue de la Lanterne', city: 'Antibes', postal_code: '06600', latitude: 43.5804, longitude: 7.1284, status: 'a_faire', assigned_technician_id: emma, responsible_id: sophie },
    { id: 's0000000-0000-0000-0000-000000000003', client_name: 'Domaine Saint-Michel', address: '8 route de Grasse', city: 'Mougins', postal_code: '06250', latitude: 43.6007, longitude: 6.9953, status: 'probleme', assigned_technician_id: lucas, responsible_id: sophie },
    { id: 's0000000-0000-0000-0000-000000000004', client_name: 'Mas de la Siagne', address: '23 boulevard Carnot', city: 'Cannes', postal_code: '06400', latitude: 43.5513, longitude: 7.0128, status: 'fait', assigned_technician_id: thomas, responsible_id: sophie },
    { id: 's0000000-0000-0000-0000-000000000005', client_name: 'Jardin des Parfumeurs', address: '5 place du Cours', city: 'Grasse', postal_code: '06130', latitude: 43.6588, longitude: 6.9228, status: 'a_faire', assigned_technician_id: thomas, responsible_id: sophie },
  ]

  for (const site of sitesData) {
    const { error } = await supabase.from('sites').upsert({ ...site, company_id: COMPANY_ID })
    if (error) console.error(`Site error ${site.client_name}:`, error.message)
  }
  console.log('✅ Sites created')

  // 4. Zones
  const zonesData = [
    { id: 'z0000000-0000-0000-0000-000000000001', site_id: 's0000000-0000-0000-0000-000000000001', name: 'Pelouse avant', type: 'turbine', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000002', site_id: 's0000000-0000-0000-0000-000000000001', name: 'Massifs latéraux', type: 'goutte_a_goutte', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000003', site_id: 's0000000-0000-0000-0000-000000000001', name: 'Jardin arrière', type: 'tuyere', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000004', site_id: 's0000000-0000-0000-0000-000000000002', name: 'Entrée principale', type: 'turbine', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000005', site_id: 's0000000-0000-0000-0000-000000000002', name: 'Parc central', type: 'turbine', status: 'a_faire' },
    { id: 'z0000000-0000-0000-0000-000000000006', site_id: 's0000000-0000-0000-0000-000000000002', name: 'Haies périphériques', type: 'goutte_a_goutte', status: 'a_faire' },
    { id: 'z0000000-0000-0000-0000-000000000007', site_id: 's0000000-0000-0000-0000-000000000002', name: 'Jardinières terrasse', type: 'micro_aspersion', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000008', site_id: 's0000000-0000-0000-0000-000000000003', name: 'Pelouse sud', type: 'turbine', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000009', site_id: 's0000000-0000-0000-0000-000000000003', name: 'Haie nord', type: 'goutte_a_goutte', status: 'probleme' },
    { id: 'z0000000-0000-0000-0000-000000000010', site_id: 's0000000-0000-0000-0000-000000000003', name: 'Massifs ouest', type: 'tuyere', status: 'a_faire' },
    { id: 'z0000000-0000-0000-0000-000000000011', site_id: 's0000000-0000-0000-0000-000000000004', name: 'Gazon principal', type: 'turbine', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000012', site_id: 's0000000-0000-0000-0000-000000000004', name: 'Oliviers', type: 'goutte_a_goutte', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000013', site_id: 's0000000-0000-0000-0000-000000000005', name: 'Roseraie', type: 'micro_aspersion', status: 'fait' },
    { id: 'z0000000-0000-0000-0000-000000000014', site_id: 's0000000-0000-0000-0000-000000000005', name: 'Lavandes', type: 'goutte_a_goutte', status: 'a_faire' },
    { id: 'z0000000-0000-0000-0000-000000000015', site_id: 's0000000-0000-0000-0000-000000000005', name: 'Pelouse événementielle', type: 'turbine', status: 'a_faire' },
  ]

  for (const zone of zonesData) {
    const { error } = await supabase.from('zones').upsert(zone)
    if (error) console.error(`Zone error ${zone.name}:`, error.message)
  }
  console.log('✅ Zones created')

  // 5. Schedules
  const schedulesData = [
    { zone_id: 'z0000000-0000-0000-0000-000000000001', days_of_week: [1,3,5], start_time: '06:00', duration_minutes: 30 },
    { zone_id: 'z0000000-0000-0000-0000-000000000002', days_of_week: [2,4,6], start_time: '07:00', duration_minutes: 45 },
    { zone_id: 'z0000000-0000-0000-0000-000000000003', days_of_week: [1,3,5], start_time: '06:30', duration_minutes: 20 },
    { zone_id: 'z0000000-0000-0000-0000-000000000004', days_of_week: [1,3,5], start_time: '05:30', duration_minutes: 25 },
    { zone_id: 'z0000000-0000-0000-0000-000000000005', days_of_week: [2,4,6], start_time: '06:00', duration_minutes: 40 },
    { zone_id: 'z0000000-0000-0000-0000-000000000006', days_of_week: [1,2,3,4,5], start_time: '07:00', duration_minutes: 60 },
    { zone_id: 'z0000000-0000-0000-0000-000000000007', days_of_week: [0,1,2,3,4,5,6], start_time: '08:00', duration_minutes: 15 },
    { zone_id: 'z0000000-0000-0000-0000-000000000008', days_of_week: [1,3,5], start_time: '06:00', duration_minutes: 35 },
    { zone_id: 'z0000000-0000-0000-0000-000000000009', days_of_week: [2,4,6], start_time: '06:30', duration_minutes: 50 },
    { zone_id: 'z0000000-0000-0000-0000-000000000010', days_of_week: [3,6], start_time: '07:00', duration_minutes: 20 },
    { zone_id: 'z0000000-0000-0000-0000-000000000011', days_of_week: [0,1,3,5], start_time: '05:00', duration_minutes: 30 },
    { zone_id: 'z0000000-0000-0000-0000-000000000012', days_of_week: [2,5], start_time: '06:00', duration_minutes: 90 },
    { zone_id: 'z0000000-0000-0000-0000-000000000013', days_of_week: [0,1,2,3,4,5,6], start_time: '06:00', duration_minutes: 20 },
    { zone_id: 'z0000000-0000-0000-0000-000000000014', days_of_week: [1,4], start_time: '07:00', duration_minutes: 45 },
    { zone_id: 'z0000000-0000-0000-0000-000000000015', days_of_week: [2,5,0], start_time: '05:30', duration_minutes: 40 },
  ]

  const { error: schedErr } = await supabase.from('schedules').insert(schedulesData)
  if (schedErr) console.error('Schedules error:', schedErr.message)
  else console.log('✅ Schedules created')

  // 6. Problems
  const { error: probErr } = await supabase.from('problems').insert([
    { site_id: 's0000000-0000-0000-0000-000000000003', zone_id: 'z0000000-0000-0000-0000-000000000009', reported_by: lucas, category: 'fuite', urgency: 'high', description: "Fuite importante au niveau du raccord T de la zone B, eau stagnante visible au pied de la haie. Nécessite remplacement du raccord.", status: 'open' },
    { site_id: 's0000000-0000-0000-0000-000000000002', zone_id: null, reported_by: emma, category: 'panne_programmateur', urgency: 'medium', description: "Programmateur Hunter ne répond plus, écran éteint. Le gardien signale que ça date d'un orage la semaine dernière.", status: 'open' },
  ])
  if (probErr) console.error('Problems error:', probErr.message)
  else console.log('✅ Problems created')

  // 7. Maintenances
  const { error: maintErr } = await supabase.from('maintenances').insert([
    { site_id: 's0000000-0000-0000-0000-000000000001', company_id: COMPANY_ID, title: 'Mise en route printemps', scheduled_date: '2026-04-20', is_recurring: true, recurrence_rule: 'annual', assigned_to: lucas, created_by: marc },
    { site_id: 's0000000-0000-0000-0000-000000000004', company_id: COMPANY_ID, title: 'Vérification pression réseau', scheduled_date: '2026-04-25', is_recurring: false, assigned_to: thomas, created_by: marc },
    { site_id: 's0000000-0000-0000-0000-000000000003', company_id: COMPANY_ID, title: 'Purge hivernage', scheduled_date: '2026-11-15', is_recurring: true, recurrence_rule: 'annual', assigned_to: emma, created_by: marc },
  ])
  if (maintErr) console.error('Maintenances error:', maintErr.message)
  else console.log('✅ Maintenances created')

  // 8. Comments
  const now = new Date()
  const { error: comErr } = await supabase.from('comments').insert([
    { site_id: 's0000000-0000-0000-0000-000000000003', author_id: sophie, content: "J'ai coupé l'eau de la zone Haie nord en attendant la réparation. @Lucas Martin peux-tu passer demain matin avec un raccord T 25mm ?", created_at: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { site_id: 's0000000-0000-0000-0000-000000000003', author_id: lucas, content: "OK je passe demain avant 9h. Je prends aussi un coude de rechange au cas où.", created_at: new Date(now.getTime() - 1 * 3600000).toISOString() },
    { site_id: 's0000000-0000-0000-0000-000000000002', author_id: emma, content: "Le gardien m'a dit que le programmateur a pris la foudre la semaine dernière. Il faudra probablement le remplacer entièrement.", created_at: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { site_id: 's0000000-0000-0000-0000-000000000005', author_id: thomas, content: "Les lavandes ont l'air desséchées, je pense qu'il faut augmenter la durée d'arrosage à 60min.", created_at: new Date(now.getTime() - 72 * 3600000).toISOString() },
  ])
  if (comErr) console.error('Comments error:', comErr.message)
  else console.log('✅ Comments created')

  // 9. Activity Log
  const { error: actErr } = await supabase.from('activity_log').insert([
    { company_id: COMPANY_ID, member_id: lucas, site_id: 's0000000-0000-0000-0000-000000000003', action: 'Lucas a signalé un problème sur Domaine Saint-Michel', created_at: new Date(now.getTime() - 3 * 3600000).toISOString() },
    { company_id: COMPANY_ID, member_id: sophie, site_id: 's0000000-0000-0000-0000-000000000003', action: 'Sophie a commenté sur Domaine Saint-Michel', created_at: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { company_id: COMPANY_ID, member_id: lucas, site_id: 's0000000-0000-0000-0000-000000000003', action: 'Lucas a commenté sur Domaine Saint-Michel', created_at: new Date(now.getTime() - 1 * 3600000).toISOString() },
    { company_id: COMPANY_ID, member_id: emma, site_id: 's0000000-0000-0000-0000-000000000002', action: 'Emma a signalé un problème sur Résidence Le Parc', created_at: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { company_id: COMPANY_ID, member_id: marc, site_id: 's0000000-0000-0000-0000-000000000001', action: 'Marc a créé l\'entretien "Mise en route printemps" pour Villa Les Oliviers', created_at: new Date(now.getTime() - 48 * 3600000).toISOString() },
    { company_id: COMPANY_ID, member_id: thomas, site_id: 's0000000-0000-0000-0000-000000000004', action: 'Thomas a passé toutes les zones de Mas de la Siagne en "fait"', created_at: new Date(now.getTime() - 72 * 3600000).toISOString() },
    { company_id: COMPANY_ID, member_id: thomas, site_id: 's0000000-0000-0000-0000-000000000005', action: 'Thomas a commenté sur Jardin des Parfumeurs', created_at: new Date(now.getTime() - 72 * 3600000).toISOString() },
  ])
  if (actErr) console.error('Activity error:', actErr.message)
  else console.log('✅ Activity log created')

  console.log('\n🎉 Seed complete!')
  console.log('\nDemo accounts:')
  users.forEach(u => console.log(`  ${u.email} / ${PASSWORD} (${u.role})`))
}

seed().catch(console.error)
