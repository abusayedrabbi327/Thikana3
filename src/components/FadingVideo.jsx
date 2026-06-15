import React, { useRef, useEffect } from 'react'

export default function FadingVideo({ src, className, style }) {
  const videoRef = useRef(null)
  const fadingOutRef = useRef(false)
  const rafId = useRef(null)

  const fadeTo = (targetOpacity, durationMs = 500) => {
    const video = videoRef.current
    if (!video) return

    if (rafId.current) cancelAnimationFrame(rafId.current)

    const startOpacity = parseFloat(video.style.opacity) || 0
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const newOpacity = startOpacity + (targetOpacity - startOpacity) * progress
      
      if (video) video.style.opacity = newOpacity.toString()

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }
    rafId.current = requestAnimationFrame(animate)
  }

  const handleLoadedData = () => {
    const video = videoRef.current
    if (!video) return
    video.style.opacity = '0'
    video.play().catch(() => {})
    fadeTo(1, 500)
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    
    const timeLeft = video.duration - video.currentTime
    if (!fadingOutRef.current && timeLeft <= 0.55 && timeLeft > 0) {
      fadingOutRef.current = true
      fadeTo(0, 500)
    }
  }

  const handleEnded = () => {
    const video = videoRef.current
    if (!video) return
    
    video.style.opacity = '0'
    setTimeout(() => {
      video.currentTime = 0
      video.play().catch(() => {})
      fadingOutRef.current = false
      fadeTo(1, 500)
    }, 100)
  }

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      style={{ ...style, opacity: 0 }}
      autoPlay
      muted
      playsInline
      preload="auto"
      onLoadedData={handleLoadedData}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
    />
  )
}
