import { Suspense } from 'react'
import ConfirmClient from './ConfirmClient'

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <ConfirmClient />
    </Suspense>
  )
}

function ConfirmFallback() {
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
        <p style={{ color: '#d4d4d8', margin: 0 }}>Please wait...</p>
      </div>
    </main>
  )
}