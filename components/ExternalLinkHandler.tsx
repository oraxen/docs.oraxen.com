'use client'

import { useEffect } from 'react'

// This component adds target="_blank" to external logo links after hydration
// to avoid SSR/client HTML mismatch errors
export default function ExternalLinkHandler() {
  useEffect(() => {
    // Small delay to ensure hydration is complete
    const timer = setTimeout(() => {
      const logoLink = document.querySelector('nav a[href="https://oraxen.com"]')
      if (logoLink && !logoLink.hasAttribute('target')) {
        logoLink.setAttribute('target', '_blank')
        logoLink.setAttribute('rel', 'noopener noreferrer')
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return null
}
