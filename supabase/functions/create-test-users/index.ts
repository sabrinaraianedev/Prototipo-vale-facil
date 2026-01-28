import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getAllowedOrigins = () => {
  const origins = [
    'https://vale-facil-rewards.lovable.app',
    'https://id-preview--52a224ec-c62a-4bce-ace6-bc7dbcca9707.lovable.app',
  ];
  const envOrigin = Deno.env.get('FRONTEND_URL');
  if (envOrigin) origins.push(envOrigin);
  return origins;
};

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const testUsers = [
      { email: 'admin@teste.com', password: 'admin123', name: 'Administrador', role: 'admin' },
      { email: 'caixa@teste.com', password: 'caixa123', name: 'Caixa Teste', role: 'caixa' },
      { email: 'estabelecimento@teste.com', password: 'estab123', name: 'Estabelecimento Teste', role: 'estabelecimento' },
    ]

    const results = []

    for (const user of testUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === user.email)
      
      if (existingUser) {
        results.push({ email: user.email, status: 'already exists', userId: existingUser.id })
        continue
      }

      // Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name }
      })

      if (authError) {
        results.push({ email: user.email, status: 'error', error: authError.message })
        continue
      }

      const userId = authData.user.id

      // Create profile (trigger should handle this, but let's ensure)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: user.name,
          email: user.email,
          active: true
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('Profile error:', profileError)
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: user.role
        })

      if (roleError) {
        console.error('Role error:', roleError)
        results.push({ email: user.email, status: 'created but role failed', error: roleError.message })
        continue
      }

      results.push({ email: user.email, status: 'created', userId, role: user.role })
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
