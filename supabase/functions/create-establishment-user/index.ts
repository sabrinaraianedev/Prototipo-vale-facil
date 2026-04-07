import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const findAuthUserByEmail = async (
  adminClient: ReturnType<typeof createClient>,
  email: string,
) => {
  let page = 1

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })

    if (error) throw error

    const matchedUser = data.users.find((user) => normalizeEmail(user.email ?? '') === email)
    if (matchedUser) return matchedUser

    if (!data.nextPage || data.users.length === 0) return null
    page = data.nextPage
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: currentUser }, error: userError } = await userClient.auth.getUser()
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check caller is admin or super_admin
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas administradores podem criar estabelecimentos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { name, email, password } = body
    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : ''
    const trimmedName = typeof name === 'string' ? name.trim() : ''

    // Validate inputs
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Preencha todos os campos obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (trimmedName.length < 2 || trimmedName.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome deve ter entre 2 e 255 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return new Response(
        JSON.stringify({ success: false, error: 'A senha deve ter entre 8 e 128 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingAuthUser = await findAuthUserByEmail(adminClient, normalizedEmail)
    let authUserId: string | null = null
    let reusedExistingAuthUser = false

    if (existingAuthUser) {
      const [{ data: existingProfile, error: profileLookupError }, { data: existingRole, error: roleLookupError }] = await Promise.all([
        adminClient
          .from('profiles')
          .select('id, establishment_id')
          .eq('id', existingAuthUser.id)
          .maybeSingle(),
        adminClient
          .from('user_roles')
          .select('id')
          .eq('user_id', existingAuthUser.id)
          .limit(1)
          .maybeSingle(),
      ])

      if (profileLookupError) throw profileLookupError
      if (roleLookupError) throw roleLookupError

      if (existingProfile || existingRole) {
        return new Response(
          JSON.stringify({ success: false, error: 'Já existe um usuário cadastrado com este e-mail' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      authUserId = existingAuthUser.id
      reusedExistingAuthUser = true
    }

    // 1. Create the establishment
    const { data: establishment, error: estError } = await adminClient
      .from('establishments')
      .insert({
        name: trimmedName,
        active: true,
      })
      .select()
      .single()

    if (estError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar estabelecimento: ' + estError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Create or recover the auth user
    if (reusedExistingAuthUser && authUserId) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(authUserId, {
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { name: trimmedName },
      })

      if (authUpdateError) {
        await adminClient.from('establishments').delete().eq('id', establishment.id)
        return new Response(
          JSON.stringify({ success: false, error: authUpdateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { name: trimmedName }
      })

      if (authError) {
        await adminClient.from('establishments').delete().eq('id', establishment.id)
        return new Response(
          JSON.stringify({ success: false, error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      authUserId = authData.user.id
    }

    const userId = authUserId!

    // 3. Update profile with establishment
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name: trimmedName,
        email: normalizedEmail,
        active: true,
        establishment_id: establishment.id,
      }, { onConflict: 'id' })

    if (profileError) {
      await adminClient.from('establishments').delete().eq('id', establishment.id)
      if (!reusedExistingAuthUser) {
        await adminClient.auth.admin.deleteUser(userId)
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar perfil do estabelecimento: ' + profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Assign 'estabelecimento' role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id: userId, role: 'estabelecimento' })

    if (roleError) {
      await adminClient.from('profiles').delete().eq('id', userId)
      await adminClient.from('establishments').delete().eq('id', establishment.id)
      if (!reusedExistingAuthUser) {
        await adminClient.auth.admin.deleteUser(userId)
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao vincular acesso do estabelecimento: ' + roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        establishment: { id: establishment.id, name: establishment.name },
        user: { id: userId, email: normalizedEmail },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
