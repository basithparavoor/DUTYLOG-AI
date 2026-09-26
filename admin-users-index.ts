import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: actor, error: actorError } = await userClient
    .from('profiles')
    .select('role,active')
    .eq('id', user.id)
    .single()

  if (actorError || actor?.role !== 'admin' || actor?.active !== true) {
    return json({ error: 'Forbidden' }, 403)
  }

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const email = String(body.email || '').trim().toLowerCase()
  const full_name = String(body.full_name || '').trim()
  const role = ['admin', 'joint_director', 'staff'].includes(body.role) ? body.role : 'staff'
  if (!email || !full_name) return json({ error: 'Email and full name are required' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name }
  })
  if (error) return json({ error: error.message }, 400)

  if (data.user) {
    const { error: profileError } = await admin.from('profiles').upsert({
      id: data.user.id,
      full_name,
      email,
      role,
      department_id: body.department_id || null,
      position_id: body.position_id || null,
      manager_id: body.manager_id || null,
      active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

    if (profileError) return json({ error: profileError.message }, 400)
  }

  return json({ ok: true, user_id: data.user?.id })
})
