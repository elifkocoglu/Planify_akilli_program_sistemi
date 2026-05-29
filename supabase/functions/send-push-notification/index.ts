import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: string
  badge?: number
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userIds, title, body, data } = await req.json() as {
      userIds: string[]
      title: string
      body: string
      data?: Record<string, unknown>
    }

    if (!userIds || userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'userIds boş' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Kullanıcıların push token'larını çek
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, push_token')
      .in('id', userIds)
      .not('push_token', 'is', null)

    if (profileError) {
      console.error('Profile çekme hatası:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokens = (profiles ?? [])
      .map((p) => p.push_token as string)
      .filter((t) => t && t.startsWith('ExponentPushToken'))

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Geçerli push token bulunamadı', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Expo Push API'ye gönder (batch)
    const messages: PushMessage[] = tokens.map((token) => ({
      to: token,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      badge: 1,
    }))

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    })

    const result = await expoResponse.json()

    return new Response(
      JSON.stringify({ success: true, sent: tokens.length, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function hatası:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
