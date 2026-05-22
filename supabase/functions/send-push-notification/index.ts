import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  try {
    // 1. Get the payload from the Postgres trigger
    const payload = await req.json()
    console.log('Webhook payload:', payload)

    if (payload.type !== 'INSERT' || payload.table !== 'activities') {
      return new Response("Not an activity insert", { status: 200 })
    }

    const activity = payload.record

    // 2. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Fetch the user who performed the action
    const { data: actor } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', activity.user_id)
      .single()
      
    const actorName = actor?.full_name || 'A team member'

    // 4. Formulate the message
    let title = 'Project Update'
    let body = `${actorName} performed an action.`
    
    if (activity.action === 'created_report') {
      title = 'New Report'
      body = `${actorName} added a new ${activity.entity_type || 'report'}.`
    } else if (activity.action === 'added_drawing') {
      title = 'New Drawing'
      body = `${actorName} uploaded a new drawing.`
    } else if (activity.action === 'joined_project') {
      title = 'New Team Member'
      body = `${actorName} joined the project.`
    }

    // 5. Fetch all push tokens for project members (except the actor)
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', activity.project_id)
      .neq('user_id', activity.user_id)

    if (!members || members.length === 0) {
      return new Response("No other members to notify", { status: 200 })
    }

    const memberIds = members.map(m => m.user_id)

    const { data: tokens } = await supabase
      .from('user_tokens')
      .select('push_token')
      .in('user_id', memberIds)

    if (!tokens || tokens.length === 0) {
      return new Response("No push tokens found for members", { status: 200 })
    }

    // 6. Send the push notifications via Expo
    const pushMessages = tokens.map(t => ({
      to: t.push_token,
      sound: 'default',
      title,
      body,
      data: { projectId: activity.project_id, entityId: activity.entity_id },
    }))

    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessages),
    })

    const expoResult = await expoResponse.json()
    console.log('Expo Push API response:', expoResult)

    return new Response(JSON.stringify({ success: true, result: expoResult }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error('Error in send-push-notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
