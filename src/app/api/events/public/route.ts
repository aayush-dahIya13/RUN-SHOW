import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { jsonError, validOrigin } from '@/lib/server/http';

interface EventRow {
  id: string;
  name: string;
  description: string;
  event_type: string;
  start_at: string;
  end_at: string;
  timezone: string;
  format: 'in-person' | 'virtual' | 'hybrid';
  venue: string | null;
  meeting_url: string | null;
  joining_instructions: string | null;
  audience: string;
  objectives: string | null;
  capacity: number | null;
  registration_target: number;
  lifecycle: string;
  visibility: string;
  ticket_type: string | null;
  ticket_price: number | null;
  ticket_currency: string | null;
  registration_deadline: string | null;
  cancellation_policy: string | null;
  eligibility_requirements: string | null;
  banner_image_url: string | null;
  organizer_institution: string | null;
  tags: string | null;
  organizer_name: string | null;
  organizer_email: string | null;
}

interface TicketOptionRow {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  type: 'free' | 'paid';
  price: number;
  currency: string;
  capacity: number | null;
  sold_count: number;
  sales_start: string | null;
  sales_end: string | null;
  is_active: number;
}

export async function GET(request: Request) {
  const user = await currentUser();
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const format = searchParams.get('format') || '';
  const ticketType = searchParams.get('ticketType') || '';
  const location = searchParams.get('location') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const sort = searchParams.get('sort') || 'upcoming';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '12', 10);
  const offset = (page - 1) * limit;

  const database = db();

  // Build WHERE clause for public events
  const conditions = ['e.lifecycle IN (\'upcoming\', \'in-progress\')', 'e.visibility = \'public\''];
  const values: (string | number)[] = [];

  if (search) {
    conditions.push('(e.name LIKE ? OR e.description LIKE ? OR e.event_type LIKE ? OR e.organizer_institution LIKE ?)');
    const searchTerm = `%${search}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (category) {
    conditions.push('e.event_type = ?');
    values.push(category);
  }

  if (format) {
    conditions.push('e.format = ?');
    values.push(format);
  }

  if (ticketType) {
    if (ticketType === 'free') {
      conditions.push('(e.ticket_type IS NULL OR e.ticket_type = \'free\' OR e.ticket_price IS NULL OR e.ticket_price = 0)');
    } else if (ticketType === 'paid') {
      conditions.push('e.ticket_type = \'paid\' AND e.ticket_price > 0');
    }
  }

  if (location) {
    conditions.push('(e.venue LIKE ? OR e.organizer_institution LIKE ?)');
    const locationTerm = `%${location}%`;
    values.push(locationTerm, locationTerm);
  }

  if (dateFrom) {
    conditions.push('e.start_at >= ?');
    values.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('e.start_at <= ?');
    values.push(dateTo + 'T23:59:59');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build ORDER BY clause
  let orderBy = 'e.start_at ASC';
  if (sort === 'recent') orderBy = 'e.created_at DESC';
  else if (sort === 'price_asc') orderBy = 'e.ticket_price ASC';
  else if (sort === 'price_desc') orderBy = 'e.ticket_price DESC';

  // Get total count
  const countRow = database.prepare(`SELECT COUNT(*) as total FROM events e ${whereClause}`).get(...values);
  const total = (countRow as { total: number } | undefined)?.total || 0;

  // Get events with organizer info
  const rows = database.prepare(`
    SELECT e.*, u.name as organizer_name, u.email as organizer_email
    FROM events e
    LEFT JOIN users u ON u.id = e.organizer_id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset) as unknown as EventRow[];

  // Get ticket options for each event
  const events = rows.map(row => {
    const ticketOptions = database.prepare('SELECT * FROM ticket_options WHERE event_id = ? AND is_active = 1').all(row.id) as unknown as TicketOptionRow[];
    const registrationCount = database.prepare('SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status = \'confirmed\'').get(row.id) as { count: number } | undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.event_type,
      date: row.start_at.slice(0, 10),
      startDate: row.start_at.slice(0, 10),
      endDate: row.end_at.slice(0, 10),
      startTime: row.start_at.slice(11, 16),
      endTime: row.end_at.slice(11, 16),
      timezone: row.timezone,
      format: row.format,
      venue: row.venue,
      meetingUrl: row.meeting_url,
      joiningInstructions: row.joining_instructions,
      audience: row.audience,
      objectives: row.objectives ? row.objectives.split(',').map(s => s.trim()).filter(Boolean) : [],
      participantCapacity: row.capacity,
      currentRegistrations: registrationCount?.count || 0,
      targetRegistrations: row.registration_target,
      partnerConfirmations: 0,
      totalPartners: 0,
      venueConfirmed: Boolean(row.venue),
      daysRemaining: Math.max(0, Math.ceil((Date.parse(row.start_at) - Date.now()) / (1000 * 60 * 60 * 24))),
      lifecycle: row.lifecycle,
      visibility: row.visibility,
      ticketType: row.ticket_type,
      ticketPrice: row.ticket_price,
      ticketCurrency: row.ticket_currency,
      registrationDeadline: row.registration_deadline,
      cancellationPolicy: row.cancellation_policy,
      eligibilityRequirements: row.eligibility_requirements,
      bannerImageUrl: row.banner_image_url,
      organizerInstitution: row.organizer_institution,
      tags: row.tags ? row.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      organizer: {
        name: row.organizer_name,
        email: row.organizer_email,
      },
      ticketOptions: ticketOptions.map(opt => ({
        id: opt.id,
        eventId: opt.event_id,
        name: opt.name,
        description: opt.description || '',
        type: opt.type,
        price: opt.price,
        currency: opt.currency,
        capacity: opt.capacity,
        soldCount: opt.sold_count,
        salesStart: opt.sales_start,
        salesEnd: opt.sales_end,
        isActive: Boolean(opt.is_active),
      })),
    };
  });

  return NextResponse.json({
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}