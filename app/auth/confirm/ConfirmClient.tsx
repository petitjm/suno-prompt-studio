'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [message, setMessage] = useState('Signing you in...')

  useEffect(() => {
    const confirm = async () => {
      try {
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        if (!token_hash || !type) {
          setMessage('Missing login token. Please request a new magic link.')
          return
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'email',
        })

        if (error) {
          setMessage(error.message || 'Login failed. Please request a new magic link.')
          return
        }

        router.replace('/')
      } catch (err) {
        console.error(err)
        setMessage('Something went wrong while signing you in.')
      }
    }

    confirm()
  }, [router, searchParams, supabase])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: '#18181b',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: '#27272a',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Signing you in</h1>
        <p style={{ color: '#d4d4d8', margin: 0 }}>{message}</p>
      </div>
    </main>
  )
}