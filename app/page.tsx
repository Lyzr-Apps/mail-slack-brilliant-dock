'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { FiMail, FiCheck, FiAlertCircle, FiClock, FiHash, FiSend, FiUser, FiInbox, FiRefreshCw } from 'react-icons/fi'
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

interface Email {
  id: string
  sender_name: string
  sender_email: string
  subject: string
  snippet: string
  date: string
  timestamp?: number
}

interface SlackChannel {
  id: string
  name: string
  member_count?: number
  is_private?: boolean
}

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

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return dateString
  }
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState('')
  const [lastSummary, setLastSummary] = useState<SummaryResponse | null>(null)
  const [expandedSummary, setExpandedSummary] = useState(false)
  const [useSampleData, setUseSampleData] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(true)
  const [slackConnected, setSlackConnected] = useState(true)

  // Email browser state
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([])
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [emailsError, setEmailsError] = useState<string | null>(null)

  // Slack channels state
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [channelsError, setChannelsError] = useState<string | null>(null)

  useEffect(() => {
    if (useSampleData) {
      // Sample emails
      setEmails([
        {
          id: '1',
          sender_name: 'Sarah Chen',
          sender_email: 'sarah.chen@company.com',
          subject: 'Project Deadline Update - Urgent Action Required',
          snippet: 'The Q4 roadmap deadline has been moved up to Friday. Need your approval on the final design mockups by EOD tomorrow...',
          date: new Date(Date.now() - 2 * 3600000).toISOString(),
          timestamp: Date.now() - 2 * 3600000
        },
        {
          id: '2',
          sender_name: 'Michael Torres',
          sender_email: 'michael.torres@client.com',
          subject: 'Client Meeting Reschedule Request',
          snippet: 'Client requested to move Thursday\'s presentation to Wednesday 2 PM. Please confirm your availability as soon as possible...',
          date: new Date(Date.now() - 5 * 3600000).toISOString(),
          timestamp: Date.now() - 5 * 3600000
        },
        {
          id: '3',
          sender_name: 'IT Department',
          sender_email: 'security@company.com',
          subject: 'Security Alert - Immediate Action Required',
          snippet: 'Unusual login activity detected on your account from an unknown location. Please review and update your password immediately...',
          date: new Date(Date.now() - 1 * 3600000).toISOString(),
          timestamp: Date.now() - 1 * 3600000
        },
        {
          id: '4',
          sender_name: 'Amanda Rodriguez',
          sender_email: 'amanda.r@company.com',
          subject: 'Weekly Team Sync Notes - January 15',
          snippet: 'Here are the key takeaways from today\'s team sync: Product roadmap updates, sprint planning for next quarter, new hiring updates...',
          date: new Date(Date.now() - 24 * 3600000).toISOString(),
          timestamp: Date.now() - 24 * 3600000
        },
        {
          id: '5',
          sender_name: 'Finance Team',
          sender_email: 'finance@company.com',
          subject: 'Q1 Budget Approval Request',
          snippet: 'Please review and approve the Q1 budget allocation for your department. Deadline for approval is end of this week...',
          date: new Date(Date.now() - 36 * 3600000).toISOString(),
          timestamp: Date.now() - 36 * 3600000
        },
        {
          id: '6',
          sender_name: 'Product Team',
          sender_email: 'product@company.com',
          subject: 'New Feature Requests from Customer Feedback',
          snippet: 'We\'ve compiled the top feature requests from our Q4 customer surveys. Would love to get your technical input on feasibility...',
          date: new Date(Date.now() - 48 * 3600000).toISOString(),
          timestamp: Date.now() - 48 * 3600000
        },
        {
          id: '7',
          sender_name: 'Conference Team',
          sender_email: 'events@techconf.com',
          subject: 'TechConf 2026 - Speaker Invitation',
          snippet: 'We would be honored to have you speak at TechConf 2026 in San Francisco. The event is scheduled for March 15-17...',
          date: new Date(Date.now() - 72 * 3600000).toISOString(),
          timestamp: Date.now() - 72 * 3600000
        },
        {
          id: '8',
          sender_name: 'Code Review Bot',
          sender_email: 'bot@github.com',
          subject: 'Code Review Required - PR #234',
          snippet: 'Your review is requested on Pull Request #234: "Implement new authentication flow". Changes include updates to login system...',
          date: new Date(Date.now() - 8 * 3600000).toISOString(),
          timestamp: Date.now() - 8 * 3600000
        },
        {
          id: '9',
          sender_name: 'Engineering Leadership',
          sender_email: 'engineering@company.com',
          subject: 'Monthly Engineering Newsletter - January 2026',
          snippet: 'Welcome to the January edition of our monthly newsletter! This month: new tech stack decisions, team growth updates, upcoming hackathon...',
          date: new Date(Date.now() - 96 * 3600000).toISOString(),
          timestamp: Date.now() - 96 * 3600000
        },
        {
          id: '10',
          sender_name: 'HR Training',
          sender_email: 'training@company.com',
          subject: 'Upcoming Training: New Development Tools Workshop',
          snippet: 'Join us for a hands-on workshop covering our new development tools and workflow. Session scheduled for next Tuesday at 2 PM...',
          date: new Date(Date.now() - 120 * 3600000).toISOString(),
          timestamp: Date.now() - 120 * 3600000
        }
      ])

      // Sample Slack channels
      setSlackChannels([
        { id: 'C001', name: 'general', member_count: 245, is_private: false },
        { id: 'C002', name: 'engineering', member_count: 48, is_private: false },
        { id: 'C003', name: 'product-updates', member_count: 89, is_private: false },
        { id: 'C004', name: 'random', member_count: 156, is_private: false },
        { id: 'C005', name: 'design', member_count: 22, is_private: false },
        { id: 'C006', name: 'support-team', member_count: 15, is_private: false },
        { id: 'C007', name: 'leadership', member_count: 12, is_private: true },
        { id: 'C008', name: 'marketing', member_count: 34, is_private: false },
      ])

      setGmailConnected(true)
      setSlackConnected(true)
      setSelectedEmailIds(['1', '2', '3'])
      setSelectedChannelId('C001')
    } else {
      setEmails([])
      setSlackChannels([])
      setSelectedEmailIds([])
      setSelectedChannelId('')
      setLastSummary(null)
    }
  }, [useSampleData])

  const handleFetchEmails = async () => {
    setLoadingEmails(true)
    setEmailsError(null)

    try {
      const message = 'Fetch my last 10 emails from Gmail. Return them in a structured format with sender name, sender email, subject, snippet, date, and email ID.'
      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const agentData = result?.response?.result
        const emailsData = Array.isArray(agentData?.emails) ? agentData.emails : []
        setEmails(emailsData)
        if (emailsData.length === 0) {
          setEmailsError('No emails found')
        }
      } else {
        setEmailsError(result.error || 'Failed to fetch emails')
      }
    } catch (err) {
      setEmailsError(err instanceof Error ? err.message : 'Failed to fetch emails')
    } finally {
      setLoadingEmails(false)
    }
  }

  const handleFetchChannels = async () => {
    setLoadingChannels(true)
    setChannelsError(null)

    try {
      const message = 'Fetch all my Slack channels. Return them with channel name, ID, member count, and whether they are private.'
      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const agentData = result?.response?.result
        const channelsData = Array.isArray(agentData?.channels) ? agentData.channels : []
        setSlackChannels(channelsData)
        if (channelsData.length === 0) {
          setChannelsError('No channels found')
        }
      } else {
        setChannelsError(result.error || 'Failed to fetch channels')
      }
    } catch (err) {
      setChannelsError(err instanceof Error ? err.message : 'Failed to fetch channels')
    } finally {
      setLoadingChannels(false)
    }
  }

  const handleEmailToggle = (emailId: string) => {
    setSelectedEmailIds(prev => {
      if (prev.includes(emailId)) {
        return prev.filter(id => id !== emailId)
      } else {
        return [...prev, emailId]
      }
    })
  }

  const handleSelectAllEmails = () => {
    if (selectedEmailIds.length === emails.length) {
      setSelectedEmailIds([])
    } else {
      setSelectedEmailIds(emails.map(email => email.id))
    }
  }

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId)
  }

  const handleSendSummary = async () => {
    if (selectedEmailIds.length === 0) {
      setError('Please select at least one email')
      return
    }

    if (!selectedChannelId) {
      setError('Please select a Slack channel')
      return
    }

    setLoading(true)
    setError('')
    setLoadingStep('Analyzing selected emails...')

    try {
      const selectedEmails = emails.filter(email => selectedEmailIds.includes(email.id))
      const selectedChannel = slackChannels.find(ch => ch.id === selectedChannelId)

      const emailDetails = selectedEmails.map(email =>
        `Subject: ${email.subject}\nFrom: ${email.sender_name} (${email.sender_email})\nSnippet: ${email.snippet}`
      ).join('\n\n---\n\n')

      setTimeout(() => {
        setLoadingStep('Generating summary...')
      }, 1000)

      setTimeout(() => {
        setLoadingStep('Sending to Slack...')
      }, 2000)

      const message = `Generate a concise summary of these ${selectedEmails.length} emails and send it to Slack channel #${selectedChannel?.name || selectedChannelId}:\n\n${emailDetails}`

      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const agentData = result?.response?.result
        const summaryData: SummaryResponse = {
          summary: agentData?.summary ?? '',
          emailCount: selectedEmails.length,
          slackChannelSent: `#${selectedChannel?.name || selectedChannelId}`,
          timestamp: new Date().toISOString()
        }
        setLastSummary(summaryData)
        setExpandedSummary(true)
      } else {
        setError(result.error || 'Failed to generate and send summary')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  const canSendSummary = selectedEmailIds.length > 0 && selectedChannelId !== ''

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
              <p className="text-sm text-muted-foreground">Browse, select, and summarize emails</p>
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

        {/* Email Browser Section */}
        <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FiInbox className="w-5 h-5 text-primary" />
                  Email Browser
                </CardTitle>
                <CardDescription>Fetch and select emails to summarize</CardDescription>
              </div>
              <Button
                onClick={handleFetchEmails}
                disabled={loadingEmails}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20"
              >
                {loadingEmails ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4 mr-2" />
                    Fetch My Emails
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error State */}
            {emailsError && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/50 rounded-xl">
                <FiAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Error</p>
                  <p className="text-xs text-destructive/80">{emailsError}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {emails.length === 0 && !loadingEmails && !emailsError && (
              <div className="text-center py-12">
                <FiInbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No emails loaded</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Fetch My Emails" to load your latest messages</p>
              </div>
            )}

            {/* Select All */}
            {emails.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedEmailIds.length === emails.length}
                    onCheckedChange={handleSelectAllEmails}
                  />
                  <Label htmlFor="select-all" className="text-sm font-semibold cursor-pointer">
                    Select All ({emails.length} emails)
                  </Label>
                </div>
                <Badge variant="outline" className="border-primary/50 text-primary">
                  {selectedEmailIds.length} selected
                </Badge>
              </div>
            )}

            {/* Email List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {emails.map((email) => {
                const isSelected = selectedEmailIds.includes(email.id)
                return (
                  <div
                    key={email.id}
                    onClick={() => handleEmailToggle(email.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-md shadow-primary/10'
                        : 'bg-card/40 border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleEmailToggle(email.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FiUser className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm font-semibold truncate">{email.sender_name}</p>
                            <span className="text-xs text-muted-foreground truncate">({email.sender_email})</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatRelativeTime(email.date)}
                          </span>
                        </div>
                        <p className="text-sm font-bold mb-1 line-clamp-1">{email.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{email.snippet}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Slack Channels Section */}
        <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FiHash className="w-5 h-5 text-primary" />
                  Slack Channels
                </CardTitle>
                <CardDescription>Select a destination channel</CardDescription>
              </div>
              <Button
                onClick={handleFetchChannels}
                disabled={loadingChannels}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20"
              >
                {loadingChannels ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4 mr-2" />
                    Load My Channels
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error State */}
            {channelsError && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/50 rounded-xl">
                <FiAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Error</p>
                  <p className="text-xs text-destructive/80">{channelsError}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {slackChannels.length === 0 && !loadingChannels && !channelsError && (
              <div className="text-center py-12">
                <FiHash className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No channels loaded</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Load My Channels" to see available destinations</p>
              </div>
            )}

            {/* Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
              {slackChannels.map((channel) => {
                const isSelected = selectedChannelId === channel.id
                return (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? 'bg-accent/10 border-accent shadow-md shadow-accent/10'
                        : 'bg-card/40 border-border hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'border-accent bg-accent' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold flex items-center gap-1">
                          <FiHash className="w-3 h-3" />
                          {channel.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{channel.id}</p>
                        {channel.member_count !== undefined && (
                          <div className="flex items-center gap-1 mt-1">
                            <FiUser className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{channel.member_count} members</span>
                          </div>
                        )}
                        {channel.is_private && (
                          <Badge variant="outline" className="mt-1 text-xs">Private</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary Action Section */}
        <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiSend className="w-5 h-5 text-accent" />
              Send Summary
            </CardTitle>
            <CardDescription>Generate and send email summary to selected channel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <FiMail className="w-4 h-4 text-primary" />
                <span className="text-sm">
                  <strong>{selectedEmailIds.length}</strong> email{selectedEmailIds.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FiHash className="w-4 h-4 text-accent" />
                <span className="text-sm">
                  {selectedChannelId ? (
                    <>Channel: <strong>#{slackChannels.find(ch => ch.id === selectedChannelId)?.name || selectedChannelId}</strong></>
                  ) : (
                    <span className="text-muted-foreground">No channel selected</span>
                  )}
                </span>
              </div>
            </div>

            {/* Validation Message */}
            {!canSendSummary && (
              <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/50 rounded-xl">
                <FiAlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary">Action Required</p>
                  <p className="text-xs text-primary/80">
                    {selectedEmailIds.length === 0 && !selectedChannelId && 'Please select emails and a Slack channel'}
                    {selectedEmailIds.length === 0 && selectedChannelId && 'Please select at least one email'}
                    {selectedEmailIds.length > 0 && !selectedChannelId && 'Please select a Slack channel'}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleSendSummary}
              disabled={loading || !canSendSummary}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FiSend className="w-5 h-5 mr-2" />
                  Send Summary to Slack
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
                  <p className="text-sm font-semibold text-accent">Summary Sent Successfully</p>
                  <p className="text-xs text-muted-foreground">
                    Sent to {lastSummary.slackChannelSent}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section - Summary Preview */}
        {lastSummary && (
          <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FiMail className="w-5 h-5 text-primary" />
                    Summary Preview
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
                  Sent to {lastSummary.slackChannelSent}
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

        {/* Agent Info */}
        <Card className="backdrop-blur-[24px] bg-card/65 border-white/25 shadow-2xl rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <div>
                  <p className="text-xs font-semibold">Powered by Email Summary Agent</p>
                  <p className="text-xs text-muted-foreground">
                    Fetches Gmail, browses Slack channels, and delivers customized summaries
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
