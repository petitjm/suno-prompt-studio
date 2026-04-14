import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token_hash = request.nextUrl.searchParams.get('token_hash')
    const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null

    if (!token_hash || !type) {
      return NextResponse.redirect(
        new URL('/?auth_debug=missing_params', request.url)
      )
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
          request.url
        )
      )
    }

    return NextResponse.redirect(
      new URL('/?auth_debug=success', request.url)
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'

    return NextResponse.redirect(
      new URL(
        `/?auth_debug=route_exception&message=${encodeURIComponent(message)}`,
        request.url
      )
    )
  }
}