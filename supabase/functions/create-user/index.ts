import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const isAllowed = 
    origin.includes('.lovable.app') || 
    origin.includes('.lovableproject.com') ||
    origin.includes('localhost');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://vale-facil-rewards.lovable.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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

    // Check caller's role
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not determine caller role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerRole = roleData.role;
    const isSuperAdmin = callerRole === 'super_admin';
    const isAdmin = callerRole === 'admin';

    if (!isSuperAdmin && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get caller's establishment
    let callerEstablishmentId: string | null = null;
    if (isAdmin) {
      const { data: callerProfile } = await adminClient
        .from('profiles')
        .select('establishment_id')
        .eq('id', currentUser.id)
        .single()
      callerEstablishmentId = callerProfile?.establishment_id || null;
    }

    const body = await req.json()
    const { email, password, name, role, establishment_id, cpf, cargo } = body

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: email, password, name, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length < 1 || name.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name must be between 1 and 255 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be between 8 and 128 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    const validRoles = isSuperAdmin 
      ? ['super_admin', 'admin', 'caixa', 'estabelecimento']
      : ['admin', 'caixa', 'estabelecimento'];
    
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid role. Must be: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine establishment_id for new user
    let finalEstablishmentId: string | null = null;
    
    if (role === 'super_admin') {
      // Super admins don't belong to any establishment
      finalEstablishmentId = null;
    } else if (isSuperAdmin) {
      // Super admin creating user: must provide establishment
      if (!establishment_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'establishment_id is required for this role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      finalEstablishmentId = establishment_id;
    } else {
      // Admin creating user: always uses their own establishment
      finalEstablishmentId = callerEstablishmentId;
      if (!finalEstablishmentId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin user has no establishment assigned' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Verify establishment exists if provided
    if (finalEstablishmentId) {
      const { data: estab } = await adminClient
        .from('establishments')
        .select('id')
        .eq('id', finalEstablishmentId)
        .single()

      if (!estab) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid establishment_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Create profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name,
        email,
        cpf: cpf || null,
        cargo: cargo || null,
        active: true,
        establishment_id: finalEstablishmentId
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // Assign role
    const { error: assignRoleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role
      })

    if (assignRoleError) {
      console.error('Role error:', assignRoleError)
      return new Response(
        JSON.stringify({ success: false, error: 'User created but role assignment failed: ' + assignRoleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: userId, email, name, role } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
