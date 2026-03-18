import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { company_name, email, password } = body

    // Validate inputs
    if (!company_name || !email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Preencha todos os campos obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof company_name !== 'string' || company_name.trim().length < 2 || company_name.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome da empresa deve ter entre 2 e 255 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return new Response(
        JSON.stringify({ success: false, error: 'A senha deve ter entre 6 e 128 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Create the establishment
    const { data: establishment, error: estError } = await adminClient
      .from('establishments')
      .insert({
        name: company_name.trim(),
        plano: 'free',
        status: 'ativo',
        active: true,
      })
      .select()
      .single()

    if (estError) {
      console.error('Establishment error:', estError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar empresa: ' + estError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Create the auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: company_name.trim() }
    })

    if (authError) {
      // Rollback establishment
      await adminClient.from('establishments').delete().eq('id', establishment.id)
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // 3. Update profile with establishment
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name: company_name.trim(),
        email,
        active: true,
        establishment_id: establishment.id,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // 4. Assign admin role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id: userId, role: 'admin' })

    if (roleError) {
      console.error('Role error:', roleError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: userId, email },
        establishment: { id: establishment.id, name: establishment.name },
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
