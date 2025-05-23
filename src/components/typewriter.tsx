"use client"

import { useState, useEffect } from "react"

interface TypewriterProps {
  texts: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseTime?: number
}

export default function TypewriterComponent({
  texts,
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseTime = 1500,
}: TypewriterProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [currentText, setCurrentText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false)
        setIsDeleting(true)
      }, pauseTime)
      return () => clearTimeout(timeout)
    }

    if (isDeleting) {
      if (currentText === "") {
        setIsDeleting(false)
        setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length)
      } else {
        timeout = setTimeout(() => {
          setCurrentText((prevText) => prevText.slice(0, -1))
        }, deletingSpeed)
      }
    } else {
      const fullText = texts[currentTextIndex]
      if (currentText === fullText) {
        setIsPaused(true)
      } else {
        timeout = setTimeout(() => {
          setCurrentText((prevText) => fullText.slice(0, prevText.length + 1))
        }, typingSpeed)
      }
    }

    return () => clearTimeout(timeout)
  }, [currentText, currentTextIndex, isDeleting, isPaused, texts, typingSpeed, deletingSpeed, pauseTime])

  return (
    <div className="flex items-center justify-center">
      <span>{currentText}</span>
      <span className="ml-2 w-2 h-12 bg-cyan-400 animate-pulse"></span>
    </div>
  )
}
