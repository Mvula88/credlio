"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserIcon, BriefcaseIcon } from "lucide-react"

interface RoleSelectorProps {
  onRoleSelect: (role: "borrower" | "lender") => void
  type: "signup" | "signin"
}

export function RoleSelector({ onRoleSelect, type }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<"borrower" | "lender" | null>(null)

  const handleRoleSelect = (role: "borrower" | "lender") => {
    setSelectedRole(role)
    onRoleSelect(role)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-center">{type === "signup" ? "Sign Up" : "Sign In"} as:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition-all ${
            selectedRole === "borrower" ? "ring-2 ring-primary" : "hover:shadow-md"
          }`}
          onClick={() => handleRoleSelect("borrower")}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <UserIcon className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-lg font-medium">Borrower</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              {type === "signup" ? "Create an account to request loans" : "Access your borrower account"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            selectedRole === "lender" ? "ring-2 ring-primary" : "hover:shadow-md"
          }`}
          onClick={() => handleRoleSelect("lender")}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <BriefcaseIcon className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-lg font-medium">Lender</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              {type === "signup" ? "Create an account to provide loans" : "Access your lender account"}
            </p>
          </CardContent>
        </Card>
      </div>

      {selectedRole && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => handleRoleSelect(selectedRole)}>
            Continue as {selectedRole === "borrower" ? "Borrower" : "Lender"}
          </Button>
        </div>
      )}
    </div>
  )
}
