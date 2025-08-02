"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Shield, 
  Search, 
  User, 
  Phone, 
  AlertTriangle,
  Ban,
  Ghost,
  Users,
  Calendar,
  Flag,
  Loader2,
  Info
} from "lucide-react"
import { COUNTRIES } from "@/lib/constants/countries"

interface RiskEntry {
  profile_id?: string
  full_name: string
  phone_number?: string
  country_code: string
  risk_type: 'blacklisted' | 'risky' | 'off_platform' | 'ghost_defaulted'
  risk_reason: string
  flagged_at: string
  report_count: number
  was_risky_before?: boolean
}

interface UnifiedRiskViewProps {
  countryCode: string
}

export function UnifiedRiskView({ countryCode }: UnifiedRiskViewProps) {
  const [riskEntries, setRiskEntries] = useState<RiskEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<RiskEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRiskData()
  }, [countryCode])

  useEffect(() => {
    filterEntries()
  }, [searchQuery, activeTab, riskEntries])

  async function fetchRiskData() {
    try {
      const { data, error } = await supabase
        .from("unified_risk_view")
        .select("*")
        .eq("country_code", countryCode)
        .order("flagged_at", { ascending: false })

      if (error) throw error

      // Check for "previously risky" status
      const processedData = await Promise.all((data || []).map(async (entry) => {
        let wasRiskyBefore = false
        
        if (entry.profile_id && entry.risk_type !== 'risky') {
          const { data: riskHistory } = await supabase
            .from("borrower_risk_history")
            .select("id")
            .eq("borrower_id", entry.profile_id)
            .not("improved_at", "is", null)
            .limit(1)
          
          wasRiskyBefore = !!riskHistory && riskHistory.length > 0
        }
        
        return {
          ...entry,
          was_risky_before: wasRiskyBefore
        }
      }))

      setRiskEntries(processedData)
      setFilteredEntries(processedData)
    } catch (error) {
      console.error("Error fetching risk data:", error)
    } finally {
      setLoading(false)
    }
  }

  function filterEntries() {
    let filtered = riskEntries

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter(entry => entry.risk_type === activeTab)
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredEntries(filtered)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getRiskBadge = (type: string) => {
    const config = {
      blacklisted: { 
        label: "Blacklisted", 
        color: "bg-red-100 text-red-800", 
        icon: <Ban className="h-3 w-3" /> 
      },
      risky: { 
        label: "Risky", 
        color: "bg-orange-100 text-orange-800", 
        icon: <AlertTriangle className="h-3 w-3" /> 
      },
      off_platform: { 
        label: "Off-Platform", 
        color: "bg-yellow-100 text-yellow-800", 
        icon: <Users className="h-3 w-3" /> 
      },
      ghost_defaulted: { 
        label: "Ghost Defaulted", 
        color: "bg-purple-100 text-purple-800", 
        icon: <Ghost className="h-3 w-3" /> 
      },
    }
    
    const { label, color, icon } = config[type as keyof typeof config] || config.risky
    
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const getTabCount = (type: string) => {
    if (type === "all") return riskEntries.length
    return riskEntries.filter(e => e.risk_type === type).length
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Unified Risk View
            </CardTitle>
            <CardDescription>
              All risky borrowers in {COUNTRIES[countryCode as keyof typeof COUNTRIES]?.name || countryCode}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            <Flag className="mr-1 h-4 w-4" />
            {riskEntries.length} Total Entries
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({getTabCount("all")})</TabsTrigger>
            <TabsTrigger value="blacklisted">
              <Ban className="mr-1 h-3 w-3" />
              Blacklisted ({getTabCount("blacklisted")})
            </TabsTrigger>
            <TabsTrigger value="risky">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Risky ({getTabCount("risky")})
            </TabsTrigger>
            <TabsTrigger value="off_platform">
              <Users className="mr-1 h-3 w-3" />
              Off-Platform ({getTabCount("off_platform")})
            </TabsTrigger>
            <TabsTrigger value="ghost_defaulted">
              <Ghost className="mr-1 h-3 w-3" />
              Ghost ({getTabCount("ghost_defaulted")})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3 mt-4">
            {filteredEntries.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No {activeTab === "all" ? "" : activeTab.replace("_", " ")} entries found
                </AlertDescription>
              </Alert>
            ) : (
              filteredEntries.map((entry, index) => (
                <div 
                  key={`${entry.risk_type}-${entry.full_name}-${index}`} 
                  className={`rounded-lg border p-4 ${
                    entry.risk_type === 'blacklisted' ? 'border-red-200 bg-red-50' :
                    entry.risk_type === 'risky' ? 'border-orange-200 bg-orange-50' :
                    entry.risk_type === 'off_platform' ? 'border-yellow-200 bg-yellow-50' :
                    'border-purple-200 bg-purple-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          entry.risk_type === 'blacklisted' ? 'bg-red-100' :
                          entry.risk_type === 'risky' ? 'bg-orange-100' :
                          entry.risk_type === 'off_platform' ? 'bg-yellow-100' :
                          'bg-purple-100'
                        }`}>
                          <User className={`h-5 w-5 ${
                            entry.risk_type === 'blacklisted' ? 'text-red-600' :
                            entry.risk_type === 'risky' ? 'text-orange-600' :
                            entry.risk_type === 'off_platform' ? 'text-yellow-600' :
                            'text-purple-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{entry.full_name}</p>
                            {entry.was_risky_before && (
                              <Badge variant="secondary" className="text-xs">
                                Previously Risky
                              </Badge>
                            )}
                          </div>
                          {entry.phone_number && (
                            <p className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {entry.phone_number}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {getRiskBadge(entry.risk_type)}
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(entry.flagged_at)}
                        </Badge>
                        {entry.report_count > 1 && (
                          <Badge variant="destructive" className="text-xs">
                            Reported {entry.report_count}x
                          </Badge>
                        )}
                      </div>

                      {entry.risk_reason && (
                        <div className="mt-2 rounded bg-white p-2">
                          <p className="text-sm text-gray-700">{entry.risk_reason}</p>
                        </div>
                      )}
                    </div>

                    {entry.profile_id && (
                      <Badge variant="secondary" className="text-xs">
                        Has Profile
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Visibility:</strong> This list shows all risky individuals from {COUNTRIES[countryCode as keyof typeof COUNTRIES]?.name}.
            Entries are automatically updated when borrowers default or improve their status.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}