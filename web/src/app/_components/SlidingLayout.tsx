"use client";

import { type ReactNode } from "react"
import { useState, useEffect, useCallback, useRef } from "react"

import { cn } from "~/core/utils"

import { BrowserEmbedView } from "./BrowserEmbedView"

interface SlidingLayoutProps {
  children: ReactNode;
  sidePanel?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function SlidingLayout({ 
  children, 
  sidePanel, 
  isOpen, 
  onClose
}: SlidingLayoutProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isBrowserActive, setIsBrowserActive] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isWindowVisible, setIsWindowVisible] = useState(true)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsWindowVisible(!document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const handleResizeStart = () => {
      setIsResizing(true)
      const prev = resizeTimeoutRef.current
      if (prev) {
        clearTimeout(prev)
      }
      const timeout = setTimeout(() => {
        setIsResizing(false)
      }, 300)
      resizeTimeoutRef.current = timeout
    }

    window.addEventListener('resize', handleResizeStart)
    return () => {
      window.removeEventListener('resize', handleResizeStart)
      const timeout = resizeTimeoutRef.current
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [])

  useEffect(() => {
    if ((isOpen || isBrowserActive) && isWindowVisible && !isResizing) {
      setIsAnimating(true)
    }
  }, [isOpen, isBrowserActive, isWindowVisible, isResizing])

  const handleTransitionEnd = useCallback(() => {
    if (!isResizing && !isOpen && !isBrowserActive) {
      setIsAnimating(false)
    }
  }, [isResizing, isOpen, isBrowserActive])

  const handleCloseBrowser = useCallback(() => {
    if (!isResizing && isWindowVisible) {
      setIsBrowserActive(false)
    }
  }, [isResizing, isWindowVisible])

  const isRightPanelOpen = isOpen || isBrowserActive

  return (
    <div 
      className="relative w-full viewport-constrained"
      style={{
        transform: 'translateZ(0)'
      }}
    >
      <div
        className={cn(
          "ease-in-out will-change-transform",
          "no-horizontal-scroll",
          isRightPanelOpen ? "transform -translate-x-[min(600px,80vw)]" : "transform translate-x-0",
          isResizing ? "transition-none" : "transition-transform duration-500",
          isResizing && "pointer-events-none"
        )}
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: isRightPanelOpen ? `translate3d(-${Math.min(600, window.innerWidth * 0.8)}px, 0, 0)` : 'translate3d(0, 0, 0)'
        }}
      >
        {children}
      </div>

      {(isRightPanelOpen || isAnimating) && (
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-[min(600px,80vw)] bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-2xl z-50",
            "ease-in-out will-change-transform",
            "no-horizontal-scroll",
            isRightPanelOpen ? "transform translate-x-0" : "transform translate-x-full",
            isResizing ? "transition-none" : "transition-transform duration-500",
            isResizing && "pointer-events-none"
          )}
          style={{
            transform: 'translate3d(0, 0, 0)',
            width: `${Math.min(600, window.innerWidth * 0.8)}px`
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {isBrowserActive ? "浏览器" : "详细结果"}
            </h3>
            <div className="flex items-center space-x-2">
              {isBrowserActive && (
                <button
                  onClick={handleCloseBrowser}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="关闭浏览器"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
                  </svg>
                </button>
              )}
              <button
                onClick={isBrowserActive ? handleCloseBrowser : onClose}
                className={cn(
                  "p-2 hover:bg-gray-100 rounded-full transition-colors",
                  isResizing && "pointer-events-none"
                )}
                disabled={isResizing}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {isBrowserActive ? (
              <BrowserEmbedView 
                className="h-full" 
                style={{
                  pointerEvents: isResizing ? 'none' : 'auto'
                }}
              />
            ) : (
              <div className="h-full overflow-y-auto p-4 hide-scrollbar message-scroll-container">
                {sidePanel}
              </div>
            )}
          </div>
        </div>
      )}

      {isRightPanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => {
            if (isBrowserActive) {
              handleCloseBrowser()
            } else {
              onClose()
            }
          }}
        />
      )}
    </div>
  )
}