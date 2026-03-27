"use client"

import { Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DownloadButtonProps {
  downloadStatus: "idle" | "downloading" | "downloaded" | "complete"
  progress: number
  onClick: () => void
  className?: string
  labels?: {
    idle?: React.ReactNode
    downloaded?: React.ReactNode
    complete?: React.ReactNode
  }
}

export default function DownloadButton({
  downloadStatus,
  progress,
  onClick,
  className,
  labels,
}: DownloadButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden select-none",
        downloadStatus === "downloading" && "bg-primary/50 hover:bg-primary/50",
        downloadStatus !== "idle" && "pointer-events-none",
        className,
      )}
    >
      {downloadStatus === "idle" && (labels?.idle ?? "Download")}

      {downloadStatus === "downloading" && (
        <span className="relative z-[5] flex items-center justify-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {progress}%
        </span>
      )}

      {downloadStatus === "downloaded" && (
        <span className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {labels?.downloaded ?? "Downloaded"}
        </span>
      )}

      {downloadStatus === "complete" && (
        <span className="text-primary">{labels?.complete ?? "Download"}</span>
      )}

      {downloadStatus === "downloading" && (
        <div
          className="absolute bottom-0 left-0 z-[3] h-full bg-primary inset-0 transition-all duration-200 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      )}
    </Button>
  )
}
