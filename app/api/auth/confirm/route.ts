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
      return NextResponse.redirect(new URL('/?auth_debug=missing_params', origin))
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/?auth_debug=verify_failed&message=${encodeURIComponent(error.message)}`,
          origin
        )
      )
    }

    return NextResponse.redirect(new URL('/?auth_debug=success', origin))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.redirect(
      new URL(
        `/?auth_debug=route_exception&message=${encodeURIComponent(message)}`,
        new URL(request.url).origin
      )
    )
  }
}