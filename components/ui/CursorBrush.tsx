"use client"

import { useEffect, useRef, useState } from "react"

export function CursorBrush() {
  const [trail, setTrail] = useState<{ x: number; y: number; id: number; color: string }[]>([])
  const requestRef = useRef<number>()
  const counter = useRef(0)

  // Oil painting palette
  const colors = [
    "rgba(18, 10, 143, 0.6)", // Ultramarine
    "rgba(204, 119, 34, 0.6)", // Ochre
    "rgba(255, 246, 0, 0.6)", // Cadmium Yellow
    "rgba(150, 0, 24, 0.6)",   // Carmine
  ]

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      counter.current += 1
      if (counter.current % 3 !== 0) return // Limit frequency

      const newPoint = {
        x: e.clientX,
        y: e.clientY,
        id: Date.now(),
        color: colors[Math.floor(Math.random() * colors.length)]
      }

      setTrail(prev => [...prev.slice(-15), newPoint])
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {trail.map((point, index) => (
        <div
          key={point.id}
          className="absolute rounded-full blur-sm transition-opacity duration-500"
          style={{
            left: point.x,
            top: point.y,
            width: `${20 + index * 2}px`,
            height: `${20 + index * 2}px`,
            backgroundColor: point.color,
            transform: "translate(-50%, -50%)",
            opacity: (index + 1) / trail.length,
            mixBlendMode: "multiply"
          }}
        />
      ))}
    </div>
  )
}
