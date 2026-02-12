'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { FiMail, FiCheck, FiAlertCircle, FiClock, FiHash, FiSend } from 'react-icons/fi'
import { SiSlack, SiGmail } from 'react-icons/si'
import { callAIAgent } from '@/lib/aiAgent'

const AGENT_ID = '698e14057d01c601c90dc833'

const THEME_VARS = {
  '--background': '225 45% 6%',
  '--foreground': '210 40% 95%',
  '--card': '225 50% 12%',
  '--card-foreground': '210 40% 95%',
  '--popover': '225 50% 15%',
  '--popover-foreground': '210 40% 95%',
  '--primary': '210 100% 65%',
  '--primary-foreground': '225 45% 8%',
  '--secondary': '225 40% 18%',
  '--secondary-foreground': '210 40% 95%',
  '--accent': '142 65% 45%',
  '--accent-foreground': '0 0% 100%',
  '--destructive': '0 65% 45%',
  '--destructive-foreground': '0 0% 100%',
  '--muted': '225 35% 20%',
  '--muted-foreground': '210 30% 60%',
  '--border': '225 35% 22%',
  '--input': '225 35% 25%',
  '--ring': '210 100% 65%',
} as React.CSSProperties

interface SummaryResponse {
  summary?: string
  emailCount?: number
  slackChannelSent?: string
  timestamp?: string
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

export default function Home() {
  const [slackChannel, setSlackChannel] = useState('')
  const [emailCount, setEmailCount] = useState('25')
  const [timeRange, setTimeRange] = useState('all')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState('')
  const [lastSummary, setLastSummary] = useState<SummaryResponse | null>(null)
  const [expandedSummary, setExpandedSummary] = useState(false)
  const [useSampleData, setUseSampleData] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(true)
  const [slackConnected, setSlackConnected] = useState(true)

  useEffect(() => {
    if (useSampleData) {
      setSlackChannel('general')
      setEmailCount('25')
      setTimeRange('24h')
      setLastSummary({
        summary: `# Email Summary - Last 24 Hours

## High Priority (3 emails)

### 1. Project Deadline Update - Sarah Chen
**Urgency:** High | **Action Required:** Yes
The Q4 roadmap deadline has been moved up to Friday. Need your approval on the final design mockups by EOD tomorrow.

### 2. Client Meeting Reschedule - Michael Torres
**Urgency:** High | **Action Required:** Yes
Client requested to move Thursday's presentation to Wednesday 2 PM. Please confirm availability.

### 3. Security Alert - IT Department
**Urgency:** Critical | **Action Required:** Immediate
Unusual login activity detected on your account. Please review and update your password.

## Medium Priority (8 emails)

- Weekly team sync notes from Amanda
- Budget approval request from Finance
- New feature requests from Product team
- Conference invitation for next month
- Code review reminder for PR #234
- Monthly newsletter from Engineering leadership
- Training session schedule for new tools
- Quarterly goals discussion thread

## Low Priority (14 emails)

- Various newsletters and subscriptions
- Team social event planning
- Office supply restock notification
- Parking lot assignment updates
- Company-wide announcements

**Total Emails:** 25
**Action Items:** 3
**Response Needed:** 5`,
        emailCount: 25,
        slackChannelSent: '#general',
        timestamp: new Date().toISOString()
      })
      setGmailConnected(true)
      setSlackConnected(true)
    } else {
      setSlackChannel('')
      setEmailCount('25')
      setTimeRange('all')
      setLastSummary(null)
    }
  }, [useSampleData])

  const handleGetSummary = async () => {
    if (!slackChannel.trim()) {
      setError('Please enter a Slack channel name')
      return
    }

    setLoading(true)
    setError('')
    setLoadingStep('Fetching emails from Gmail...')

    try {
      const message = `Generate email summary and send to Slack channel: ${slackChannel}. Fetch ${emailCount} emails${timeRange !== 'all' ? ` from the last ${timeRange}` : ''}.`

      setTimeout(() => {
        setLoadingStep('Analyzing email content...')
      }, 1000)

      setTimeout(() => {
        setLoadingStep('Generating summary...')
      }, 2000)

      setTimeout(() => {
        setLoadingStep('Sending to Slack...')
      }, 3000)

      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const agentData = result?.response?.result
        const summaryData: SummaryResponse = {
          summary: agentData?.summary ?? '',
          emailCount: agentData?.emailCount ?? 0,
          slackChannelSent: agentData?.slackChannelSent ?? slackChannel,
          timestamp: agentData?.timestamp ?? new Date().toISOString()
        }
        setLastSummary(summaryData)
        setExpandedSummary(true)
      } else {
        setError(result.error || 'Failed to generate email summary')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <div style={THEME_VARS} className="min-h-screen bg-gradient-to-br from-[hsl(225,50%,8%)] via-[hsl(240,45%,10%)] to-[hsl(225,45%,8%)] text-foreground font-sans">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <FiMail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Email Summary to Slack</h1>
              <p className="text-sm text-muted-foreground">Automated email digest delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="sample-toggle" className="text-sm text-muted-foreground">Sample Data</Label>
            <Switch
              id="sample-toggle"
              checked={useSampleData}
              onCheckedChange={setUseSampleData}
            />
          </div>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <SiGmail className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Gmail</p>
                    <p className="text-xs text-muted-foreground">Email Source</p>
                  </div>
                </div>
                <Badge variant={gmailConnected ? 'default' : 'destructive'} className={gmailConnected ? 'bg-accent' : ''}>
                  {gmailConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <SiSlack className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Slack</p>
                    <p className="text-xs text-muted-foreground">Notification Destination</p>
                  </div>
                </div>
                <Badge variant={slackConnected ? 'default' : 'destructive'} className={slackConnected ? 'bg-accent' : ''}>
                  {slackConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Layout - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiHash className="w-5 h-5 text-primary" />
                  Configuration
                </CardTitle>
                <CardDescription>Set up your email summary preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Slack Channel */}
                <div className="space-y-2">
                  <Label htmlFor="slack-channel" className="text-sm font-semibold">Slack Channel</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                    <Input
                      id="slack-channel"
                      placeholder="general"
                      value={slackChannel}
                      onChange={(e) => setSlackChannel(e.target.value)}
                      className="pl-8 bg-input border-border rounded-xl h-11"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Enter the channel name without the # symbol</p>
                </div>

                {/* Email Count */}
                <div className="space-y-2">
                  <Label htmlFor="email-count" className="text-sm font-semibold">Number of Emails</Label>
                  <Select value={emailCount} onValueChange={setEmailCount}>
                    <SelectTrigger id="email-count" className="bg-input border-border rounded-xl h-11">
                      <SelectValue placeholder="Select count" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border rounded-xl">
                      <SelectItem value="10">10 emails</SelectItem>
                      <SelectItem value="25">25 emails</SelectItem>
                      <SelectItem value="50">50 emails</SelectItem>
                      <SelectItem value="100">100 emails</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How many recent emails to analyze</p>
                </div>

                {/* Time Range */}
                <div className="space-y-2">
                  <Label htmlFor="time-range" className="text-sm font-semibold">Time Range (Optional)</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger id="time-range" className="bg-input border-border rounded-xl h-11">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border rounded-xl">
                      <SelectItem value="all">All recent emails</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Filter emails by recency</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Action & Results */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiSend className="w-5 h-5 text-accent" />
                  Generate Summary
                </CardTitle>
                <CardDescription>Fetch emails and send summary to Slack</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleGetSummary}
                  disabled={loading || !slackChannel.trim()}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiMail className="w-5 h-5 mr-2" />
                      Get Email Summary
                    </>
                  )}
                </Button>

                {/* Loading Steps */}
                {loading && loadingStep && (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">{loadingStep}</span>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/50 rounded-xl">
                    <FiAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-destructive">Error</p>
                      <p className="text-xs text-destructive/80">{error}</p>
                    </div>
                  </div>
                )}

                {/* Success Indicator */}
                {lastSummary && !loading && !error && (
                  <div className="flex items-center gap-3 p-4 bg-accent/10 border border-accent/50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                      <FiCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-accent">Summary Generated</p>
                      <p className="text-xs text-muted-foreground">
                        Sent to {lastSummary.slackChannelSent ?? `#${slackChannel}`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Preview */}
            {lastSummary && (
              <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FiMail className="w-5 h-5 text-primary" />
                        Last Summary
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <FiClock className="w-3 h-3" />
                        {lastSummary.timestamp ? new Date(lastSummary.timestamp).toLocaleString() : 'Just now'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      {lastSummary.emailCount ?? 0} emails
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-accent/20 text-accent border-accent/50">
                      Sent to {lastSummary.slackChannelSent ?? `#${slackChannel}`}
                    </Badge>
                  </div>

                  {/* Summary Content */}
                  <div className={`space-y-2 overflow-hidden transition-all duration-300 ${expandedSummary ? 'max-h-[600px] overflow-y-auto' : 'max-h-32'}`}>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      {lastSummary.summary ? (
                        renderMarkdown(lastSummary.summary)
                      ) : (
                        <p className="text-sm text-muted-foreground">No summary content available</p>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse Button */}
                  {lastSummary.summary && lastSummary.summary.length > 200 && (
                    <Button
                      variant="ghost"
                      onClick={() => setExpandedSummary(!expandedSummary)}
                      className="w-full text-primary hover:bg-primary/10 rounded-xl"
                    >
                      {expandedSummary ? 'Show Less' : 'Show Full Summary'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Agent Info */}
        <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <div>
                  <p className="text-xs font-semibold">Powered by Email Summary Agent</p>
                  <p className="text-xs text-muted-foreground">
                    Analyzes Gmail, extracts key information, and delivers summaries to Slack
                  </p>
                </div>
              </div>
              {loading && (
                <Badge variant="outline" className="border-primary/50 text-primary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
