import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Account {
  id: string
  name: string
  email: string
  created_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')!
    const ownerPassword = Deno.env.get('OWNER_PASSWORD')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, password, accountId, accountData, categoryName, categoryId, userId } = await req.json()

    // Function to verify owner password
    const verifyOwner = (pwd: string) => pwd === ownerPassword

    // Handle owner password verification
    if (action === 'verify_owner') {
      if (password === ownerPassword) {
        return new Response(
          JSON.stringify({ success: true, isOwner: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid owner password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Handle admin password verification + account selection
    if (action === 'verify_admin') {
      if (password !== adminPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid admin password' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Fetch account details
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', accountId)
        .single()

      if (error || !profile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Account not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, account: profile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all accounts (for dropdown)
    if (action === 'get_accounts') {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, email, created_at')
        .order('username', { ascending: true })

      if (error) {
        console.error('Error fetching accounts:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch accounts' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, accounts: profiles || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user categories (owner only)
    if (action === 'get_user_categories') {
      if (!verifyOwner(password)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { data, error } = await supabase
        .from('user_categories')
        .select('user_id, category_id, categories(id, name)')

      if (error) {
        console.error('Error fetching user categories:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, userCategories: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new account (owner only)
    if (action === 'create_account') {
      if (password !== ownerPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          username: accountData.name,
          email: accountData.email
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating account:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, account: newProfile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete account (owner only)
    if (action === 'delete_account') {
      if (password !== ownerPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', accountId)

      if (error) {
        console.error('Error deleting account:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add category (owner only)
    if (action === 'add_category') {
      if (!verifyOwner(password)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({ name: categoryName })
        .select()
        .single()

      if (error) {
        console.error('Error adding category:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, category: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete category (owner only)
    if (action === 'delete_category') {
      if (!verifyOwner(password)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) {
        console.error('Error deleting category:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Assign category to user (owner only)
    if (action === 'assign_category') {
      if (!verifyOwner(password)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { error } = await supabase
        .from('user_categories')
        .insert({ user_id: userId, category_id: categoryId })

      if (error) {
        console.error('Error assigning category:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Unassign category from user (owner only)
    if (action === 'unassign_category') {
      if (!verifyOwner(password)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('user_id', userId)
        .eq('category_id', categoryId)

      if (error) {
        console.error('Error unassigning category:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error) {
    console.error('Error in auth-verify:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})