"use client"

import * as React from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CarouselCustomProps {
    images: string[]
    className?: string
    autoplayInterval?: number
}

// Helper to wrap index arithmetic
const wrap = (min: number, max: number, v: number) => {
    const rangeSize = max - min
    return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

export function CarouselCustom({ images, className, autoplayInterval = 5000 }: CarouselCustomProps) {
    const [index, setIndex] = React.useState(0)

    // Auto-play
    React.useEffect(() => {
        const timer = setInterval(() => {
            setIndex((i) => i + 1)
        }, autoplayInterval)
        return () => clearInterval(timer)
    }, [autoplayInterval])

    // We want to show 3 items on desktop, 1 on mobile.
    // We'll trust CSS 'basis' to handle the sizing of items.
    // The carousel track will shift by percentage.

    // Note: To make it truly infinite seamlessly with framer motion and only a few images
    // is tricky without duplicating data. Let's effectively duplicate the array 
    // to ensure we always have content to slide into for basic smoothness.
    const displayImages = [...images, ...images, ...images] // Triple the images for safety buffer

    // We want to center the 'current' index? Or just slide left?
    // Let's slide left. index 0 starts at left.

    return (
        <div className={cn("relative group overflow-hidden w-full", className)}>
            <motion.div
                className="flex w-full"
                animate={{
                    x: `-${index * 100}%` // This logic needs to adapt to item width.
                }}
            // ISSUE: Framer motion animate value needs to know the unit.
            // If we want 1 item visible (mobile), we move -100% per index.
            // If we want 3 items visible (desktop), we move -33.33% per index.
            // Since we can't easily switch 'animate' prop based on CSS media queries without JS window listener,
            // we can use a CSS variable or a style prop that uses calc?
            // OR better: Just map the index to a CSS variable and let CSS handle the translate?
            >
            </motion.div>

            {/* 
         BETTER APPROACH FOR RESPONSIVE CAROUSEL WITHOUT COMPLEXITY:
         Use a container that scrolls or uses classic CSS transform derived from index.
      */}
            <div
                className="flex transition-transform duration-700 ease-in-out h-full"
                style={{
                    // On mobile (default): -100% per index
                    // On md: -33.333% per index
                    // We can use a Tailwind/CSS class to define the variable, or just use inline style with a CSS var.
                    transform: `translateX(calc(-${index} * var(--slide-size, 100%)))`
                }}
            >
                {displayImages.map((src, i) => (
                    <div
                        key={i}
                        className="min-w-full md:min-w-[33.333%] h-full relative px-1" // minimal gap via padding
                    // Define the slide size variable locally if needed, but here min-w handles the layout.
                    // The transform needs to match the min-w.
                    >
                        <div className="relative w-full h-full rounded-xl overflow-hidden group/item">
                            <Image
                                src={src}
                                alt={`Gallery image`}
                                fill
                                className="object-cover transition-transform duration-500 group-hover/item:scale-110"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-navy/20 group-hover/item:bg-transparent transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Since we rely on a CSS variable for the calc, we need to set it in the parent or use a media query style block?
          Actually, standard CSS transform: translateX(-N * 33.33%) works fine.
          But we need it to be -N * 100% on mobile.
          Solution: Use a style block that changes with media query? No, inline styles override.
          
          Robust Solution: Use a `style` tag in render to inject a class logic?
          Or just use a small window listener to set 'isDesktop'?
      */}
            <style jsx>{`
        .flex {
            --slide-size: 100%;
        }
        @media (min-width: 768px) {
            .flex {
                --slide-size: 33.3333%;
            }
        }
      `}</style>

            {/* Navigation */}
            <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                <button
                    className="p-2 rounded-full bg-navy/50 text-white backdrop-blur-sm hover:bg-navy/80 transition-colors pointer-events-auto opacity-0 group-hover:opacity-100"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index === 0} // Simple bound for now, or implement wrap logic in setIndex
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    className="p-2 rounded-full bg-navy/50 text-white backdrop-blur-sm hover:bg-navy/80 transition-colors pointer-events-auto opacity-0 group-hover:opacity-100"
                    onClick={() => setIndex((i) => i + 1)}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    )
}
