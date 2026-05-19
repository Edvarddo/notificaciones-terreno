import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SIGNING_SECRET = Deno.env.get('DAILY_CODE_SIGNING_SECRET')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ACCESS_CODE_FROM_EMAIL = Deno.env.get('ACCESS_CODE_FROM_EMAIL') || 'onboarding@resend.dev'
const ACCESS_CODE_RECIPIENT_EMAILS_RAW =
  Deno.env.get('ACCESS_CODE_RECIPIENT_EMAILS') ||
  Deno.env.get('ACCESS_CODE_RECIPIENT_EMAIL') ||
  'lalo_13ya@hotmail.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'https://localhost:5173',
  'https://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://192.168.1.7:5173',
  'https://192.168.1.7:5174',
  'https://notificaciones-terreno.vercel.app',
])

function buildCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get('origin') ?? ''

  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(requestOrigin)
      ? requestOrigin
      : 'https://notificaciones-terreno.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Allow-Credentials': 'true',
  }
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getRandomCode() {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1000000).padStart(6, '0')
}

function getUtcDayBounds() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCMilliseconds(-1)
  return {
    today: start.toISOString().slice(0, 10),
    expiresAt: end.toISOString(),
  }
}

function parseRecipientEmails(raw: string): string[] {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return raw
    .split(/[\n,;]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v) => emailRegex.test(v))
}

async function sendEmail(code: string, expiresAt: string) {
  const recipients = parseRecipientEmails(ACCESS_CODE_RECIPIENT_EMAILS_RAW)

  if (recipients.length === 0) {
    throw new Error(
      'No hay destinatarios validos en ACCESS_CODE_RECIPIENT_EMAILS/ACCESS_CODE_RECIPIENT_EMAIL'
    )
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: ACCESS_CODE_FROM_EMAIL,
      to: recipients,
      subject: `Codigo de acceso diario - ${new Date().toISOString().slice(0, 10)}`,
      text: [
        'Se solicito un nuevo codigo de acceso diario.',
        '',
        `Codigo: ${code}`,
        `Valido hasta: ${expiresAt}`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
          <h2 style="margin: 0 0 12px;">Codigo de acceso diario</h2>
          <p style="margin: 0 0 16px;">Se solicito un nuevo codigo para continuar con el acceso.</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 0.2em; padding: 14px 18px; border-radius: 14px; background: #eef6fb; color: #0b3c5d; display: inline-block;">${code}</div>
          <p style="margin: 16px 0 0; color: #475569;">Valido hasta: ${expiresAt}</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { today, expiresAt } = getUtcDayBounds()
    const code = getRandomCode()
    const codeHash = await sha256(`${today}:${code}:${SIGNING_SECRET}`)

    const { error: insertError } = await supabase.from('daily_access_codes').insert({
      code_date: today,
      code_hash: codeHash,
      expires_at: expiresAt,
      created_by: 'edge-function',
    })

    if (insertError) {
      console.error('daily_access_codes insert error:', insertError)
      return new Response(JSON.stringify({ ok: false, error: 'No se pudo registrar el codigo' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    try {
      await sendEmail(code, expiresAt)
    } catch (emailErr) {
      await supabase.from('daily_access_codes').delete().eq('code_date', today).eq('code_hash', codeHash)
      throw emailErr
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Codigo enviado por correo',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (err) {
    console.error('request-daily-code error:', err)
    return new Response(JSON.stringify({ ok: false, error: 'No se pudo enviar el codigo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
