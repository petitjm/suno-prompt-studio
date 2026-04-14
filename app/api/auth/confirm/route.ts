import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)

    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null

    if (!token_hash || !type) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          stage: 'params',
          message: 'Missing token_hash or type',
          token_hash,
          type,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          stage: 'verifyOtp',
          message: error.message,
          code: error.code ?? null,
          status: error.status ?? null,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return NextResponse.redirect(new URL('/?auth_debug=success', origin))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'

    return new NextResponse(
      JSON.stringify({
        ok: false,
        stage: 'exception',
        message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}