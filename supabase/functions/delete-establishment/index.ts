import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const isAllowed =
    origin.includes('.lovable.app') ||
    origin.includes('.lovableproject.com') ||
    origin.includes('localhost')

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://vale-facil-rewards.lovable.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser()
    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins can delete establishments' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const establishmentId = body?.establishment_id

    if (!establishmentId || typeof establishmentId !== 'string' || !isUuid(establishmentId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'establishment_id inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: establishment, error: establishmentError } = await adminClient
      .from('establishments')
      .select('id, name')
      .eq('id', establishmentId)
      .single()

    if (establishmentError || !establishment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Estabelecimento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: linkedProfiles, error: profilesReadError } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('establishment_id', establishmentId)

    if (profilesReadError) {
      throw profilesReadError
    }

    // Filter out the current user from profiles to delete — skip their auth account
    const profilesToDelete = (linkedProfiles || []).filter((profile) => profile.id !== currentUser.id)

    const userIdsToDelete = profilesToDelete.map((profile) => profile.id)
    const currentUserLinked = (linkedProfiles || []).some((p) => p.id === currentUser.id)

    const { error: vouchersError } = await adminClient
      .from('vouchers')
      .delete()
      .eq('establishment_id', establishmentId)

    if (vouchersError) throw vouchersError

    const { error: voucherTypesError } = await adminClient
      .from('voucher_types')
      .delete()
      .eq('establishment_id', establishmentId)

    if (voucherTypesError) throw voucherTypesError

    if (userIdsToDelete.length > 0) {
      const { error: userRolesError } = await adminClient
        .from('user_roles')
        .delete()
        .in('user_id', userIdsToDelete)

      if (userRolesError) throw userRolesError

      for (const userId of userIdsToDelete) {
        const { error: deleteAuthUserError } = await adminClient.auth.admin.deleteUser(userId)
        if (deleteAuthUserError) {
          console.error('Auth delete error:', deleteAuthUserError)
        }
      }

      const { error: profilesDeleteError } = await adminClient
        .from('profiles')
        .delete()
        .in('id', userIdsToDelete)

      if (profilesDeleteError) throw profilesDeleteError
    }

    // Unlink current user from this establishment if they were linked
    if (currentUserLinked) {
      await adminClient
        .from('profiles')
        .update({ establishment_id: null })
        .eq('id', currentUser.id)
    }

    const { error: deleteEstablishmentError } = await adminClient
      .from('establishments')
      .delete()
      .eq('id', establishmentId)

    if (deleteEstablishmentError) throw deleteEstablishmentError

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Estabelecimento excluído com sucesso',
        deleted_profile_count: userIdsToDelete.length,
        establishment: { id: establishment.id, name: establishment.name },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Delete establishment error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
