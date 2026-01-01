'use client'

import { useEffect, useRef } from 'react'

interface HeroVideoProps {
  videoSrc: string
}

export default function HeroVideo({ videoSrc }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    const video = videoRef.current

    if (video && isMountedRef.current) {
      // Wait for video to be ready before playing
      const handleCanPlay = () => {
        if (video && isMountedRef.current && video.readyState >= 3) {
          video.play().catch((error) => {
            // Silently handle autoplay errors (browser policies, AbortError is normal)
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
              console.error('Video autoplay failed:', error)
            }
          })
        }
      }

      video.addEventListener('canplay', handleCanPlay, { once: true })
      
      // If video is already loaded, try to play immediately
      if (video.readyState >= 3) {
        handleCanPlay()
      }

      return () => {
        isMountedRef.current = false
        if (video) {
          video.removeEventListener('canplay', handleCanPlay)
        }
      }
    }
  }, [])

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute top-0 left-0 w-full h-full object-cover min-h-full min-w-full"
        style={{ opacity: 0.7 }}
        onError={(e) => {
          console.error('Video loading error:', e)
          const video = e.currentTarget
          console.error('Video src:', video.src)
          console.error('Video networkState:', video.networkState)
          console.error('Video error:', video.error)
        }}
        onLoadStart={() => {
          console.log('Video load started:', videoSrc)
        }}
        onCanPlay={() => {
          console.log('Video can play:', videoSrc)
        }}
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Overlay for better text readability - lighter overlay to show more video */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/30 to-brand-navy-dark/30 dark:from-brand-white/15 dark:to-brand-white/15"></div>
    </div>
  )
}
