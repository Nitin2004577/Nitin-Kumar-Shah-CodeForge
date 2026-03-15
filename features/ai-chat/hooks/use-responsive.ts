"use client"

import { useState, useEffect } from "react"

interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
  "2xl": number
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
}

export function useResponsive(breakpoints: Partial<BreakpointConfig> = {}) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  })

  const config = { ...defaultBreakpoints, ...breakpoints }

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const isMobile = windowSize.width < config.md
  const isTablet = windowSize.width >= config.md && windowSize.width < config.lg
  const isDesktop = windowSize.width >= config.lg

  const breakpoint =
    windowSize.width >= config["2xl"]
      ? "2xl"
      : windowSize.width >= config.xl
        ? "xl"
        : windowSize.width >= config.lg
          ? "lg"
          : windowSize.width >= config.md
            ? "md"
            : "sm"

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    isAtLeast: (bp: keyof BreakpointConfig) => windowSize.width >= config[bp],
    isBelow: (bp: keyof BreakpointConfig) => windowSize.width < config[bp],
  }
}