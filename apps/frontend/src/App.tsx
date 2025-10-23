import { useState, useEffect } from 'react'

function App() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Health check failed:', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          VORTE E-Ticaret
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Modern e-ticaret platformu - React + Vite + TypeScript + Tailwind CSS
        </p>
        
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-3">API Durumu</h2>
          {loading ? (
            <p className="text-gray-500">Kontrol ediliyor...</p>
          ) : health ? (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800 font-medium">✓ API Bağlantısı Başarılı</p>
              <pre className="mt-2 text-sm text-gray-700">
                {JSON.stringify(health, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800 font-medium">✗ API Bağlantısı Başarısız</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
