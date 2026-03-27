"use client"

import React, { RefObject } from "react"
import { motion, useInView, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

type AsProp = keyof React.JSX.IntrinsicElements

interface TimelineContentProps<T extends AsProp = "div"> {
  children: React.ReactNode
  animationNum?: number
  timelineRef?: RefObject<HTMLElement | null>
  customVariants?: Variants
  className?: string
  as?: T
}

export function TimelineContent<T extends AsProp = "div">({
  children,
  animationNum = 0,
  customVariants,
  className,
  as,
}: TimelineContentProps<T>) {
  const ref = React.useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" })

  const defaultVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: animationNum * 0.1,
        ease: "easeOut",
      },
    },
  }

  const variants = customVariants ?? defaultVariants

  const Tag = (as ?? "div") as AsProp
  const MotionTag = motion[Tag as keyof typeof motion] as typeof motion.div

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(className)}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={animationNum}
      variants={variants}
    >
      {children}
    </MotionTag>
  )
}
