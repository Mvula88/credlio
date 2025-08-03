"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DialogProps } from "@radix-ui/react-dialog"
import {
  CircleIcon,
  FileIcon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
  CreditCard,
  Users,
  FileText,
  Settings,
  Home,
  DollarSign,
  UserCheck,
  AlertCircle,
  BarChart,
  Search,
} from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

export function CommandMenu({ ...props }: DialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const { setTheme } = useTheme()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return
        }

        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => setOpen(true)}
        {...props}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/lender/new-verification"))
              }}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              New Credit Check
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/borrower/new-request"))
              }}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              New Loan Request
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/invitations/send"))
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Invite Borrower
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/dashboard"))
              }}
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/lender/borrowers"))
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Borrowers
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/borrower/loans"))
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              My Loans
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/analytics"))
              }}
            >
              <BarChart className="mr-2 h-4 w-4" />
              Analytics
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/reports"))
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/settings/profile"))
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/settings/billing"))
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </CommandItem>
            <CommandItem
              onSelect={() => {
                runCommand(() => router.push("/settings/security"))
              }}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Security
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <SunIcon className="mr-2 h-4 w-4" />
              Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <MoonIcon className="mr-2 h-4 w-4" />
              Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <LaptopIcon className="mr-2 h-4 w-4" />
              System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}