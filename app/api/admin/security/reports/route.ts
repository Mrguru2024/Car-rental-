/**
 * Security Reports API
 * GET /api/admin/security/reports - Generate security reports (CSV/PDF)
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/utils/roleHierarchy'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !isAdmin(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const severity = searchParams.get('severity')
    const eventType = searchParams.get('eventType')
    const resolved = searchParams.get('resolved')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Build query for security events
    let eventsQuery = adminSupabase
      .from('security_events')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (severity && severity !== 'all') {
      eventsQuery = eventsQuery.eq('severity', severity)
    }

    if (eventType && eventType !== 'all') {
      eventsQuery = eventsQuery.eq('event_type', eventType)
    }

    if (resolved && resolved !== 'all') {
      eventsQuery = eventsQuery.eq('resolved', resolved === 'resolved')
    }

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      throw eventsError
    }

    // Build query for audit logs
    let auditQuery = adminSupabase
      .from('audit_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    const { data: auditLogs, error: auditError } = await auditQuery

    if (auditError) {
      throw auditError
    }

    if (format === 'csv') {
      // Generate CSV
      const csvRows: string[] = []

      // CSV Header
      csvRows.push('Report Type,ID,Timestamp,Severity,Event Type,Description,User ID,IP Address,Resolved,Metadata')

      // Security Events
      events?.forEach((event) => {
        csvRows.push(
          [
            'Security Event',
            event.id,
            event.created_at,
            event.severity,
            event.event_type,
            event.description?.replace(/,/g, ';') || '',
            event.user_id || '',
            event.ip_address || '',
            event.resolved ? 'Yes' : 'No',
            JSON.stringify(event.metadata || {}).replace(/,/g, ';'),
          ].join(',')
        )
      })

      // Audit Logs
      auditLogs?.forEach((log) => {
        csvRows.push(
          [
            'Audit Log',
            log.id,
            log.created_at,
            '',
            log.action,
            log.notes?.replace(/,/g, ';') || '',
            log.user_id || '',
            log.ip_address || '',
            log.success ? 'Yes' : 'No',
            JSON.stringify(log.details || {}).replace(/,/g, ';'),
          ].join(',')
        )
      })

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="security-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      // For PDF, we'll return JSON data that can be used by a PDF generation library
      // In a production environment, you'd use a library like pdfkit or puppeteer
      const reportData = {
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate,
        },
        summary: {
          totalEvents: events?.length || 0,
          totalAuditLogs: auditLogs?.length || 0,
          criticalEvents: events?.filter((e) => e.severity === 'critical').length || 0,
          highSeverityEvents: events?.filter((e) => e.severity === 'high').length || 0,
          unresolvedEvents: events?.filter((e) => !e.resolved).length || 0,
        },
        events: events || [],
        auditLogs: auditLogs || [],
      }

      // For now, return JSON. In production, generate actual PDF using a library
      return NextResponse.json(
        {
          message: 'PDF generation not yet implemented. Please use CSV export.',
          data: reportData,
        },
        { status: 501 }
      )
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use "csv" or "pdf"' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Security report generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
