"use client"

import { useState, useEffect } from 'react'

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const dismissPrompt = () => {
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">تثبيت التطبيق</p>
            <p className="text-sm text-blue-100">قم بتثبيت التطبيق على جهازك لتجربة أفضل</p>
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={dismissPrompt}
            className="px-3 py-1 text-sm border border-white rounded-md hover:bg-blue-700 transition-colors"
          >
            لاحقاً
          </button>
          <button
            onClick={installApp}
            className="px-3 py-1 text-sm bg-white text-blue-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            تثبيت
          </button>
        </div>
      </div>
    </div>
  )
}