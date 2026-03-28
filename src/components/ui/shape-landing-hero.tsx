"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.06]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -120, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate: rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute pointer-events-none", className)}
    >
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{
          duration: 14,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border border-white/[0.08]",
            "shadow-[0_4px_24px_0_rgba(255,255,255,0.04)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export function HeroShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large left shape */}
      <ElegantShape
        delay={0.2}
        width={520}
        height={120}
        rotate={10}
        gradient="from-brand-500/[0.10]"
        className="left-[-8%] top-[18%]"
      />
      {/* Right mid shape */}
      <ElegantShape
        delay={0.4}
        width={380}
        height={90}
        rotate={-12}
        gradient="from-purple-500/[0.08]"
        className="right-[-4%] top-[55%]"
      />
      {/* Small top-right */}
      <ElegantShape
        delay={0.5}
        width={180}
        height={50}
        rotate={18}
        gradient="from-brand-400/[0.10]"
        className="right-[18%] top-[8%]"
      />
      {/* Small bottom-left */}
      <ElegantShape
        delay={0.35}
        width={240}
        height={65}
        rotate={-7}
        gradient="from-purple-400/[0.08]"
        className="left-[8%] bottom-[12%]"
      />
      {/* Tiny top-left accent */}
      <ElegantShape
        delay={0.6}
        width={120}
        height={36}
        rotate={-22}
        gradient="from-white/[0.05]"
        className="left-[28%] top-[6%]"
      />
    </div>
  );
}
