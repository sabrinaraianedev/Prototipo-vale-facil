import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const isAllowed = 
    origin.includes('.lovable.app') || 
    origin.includes('.lovableproject.com') ||
    origin.includes('localhost');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://vale-facil-rewards.lovable.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: currentUser } } = await userClient.auth.getUser()
    if (!currentUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email } = await req.json()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find user by email in auth.users
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) throw listError

    const userToDelete = users.find(u => u.email === email)
    if (!userToDelete) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found in auth' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete from auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userToDelete.id)
    if (deleteError) throw deleteError

    return new Response(
      JSON.stringify({ success: true, message: `User ${email} deleted from auth` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
