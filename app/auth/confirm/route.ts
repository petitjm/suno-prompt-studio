// app/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type) {
    const supabase = await createClient()

    await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email',
    })
  }

  return NextResponse.redirect(`${origin}/`)
}