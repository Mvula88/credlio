import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ShellProps {
  children: ReactNode
  className?: string
  variant?: "default" | "sidebar" | "centered"
}

export function Shell({ children, className, variant = "default" }: ShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        variant === "default" && "container mx-auto px-4 py-8",
        variant === "sidebar" && "flex min-h-screen",
        variant === "centered" && "flex items-center justify-center min-h-screen",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface ShellHeaderProps {
  children: ReactNode
  className?: string
}

export function ShellHeader({ children, className }: ShellHeaderProps) {
  return <div className={cn("flex flex-col space-y-1.5 pb-6", className)}>{children}</div>
}

interface ShellTitleProps {
  children: ReactNode
  className?: string
}

export function ShellTitle({ children, className }: ShellTitleProps) {
  return <h1 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>{children}</h1>
}

interface ShellDescriptionProps {
  children: ReactNode
  className?: string
}

export function ShellDescription({ children, className }: ShellDescriptionProps) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
}
