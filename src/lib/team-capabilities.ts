export const CAPABILITY_CATEGORIES = [
  { id: 'registration_checkin', label: 'Registration and check-in' },
  { id: 'venue_stage', label: 'Venue and stage operations' },
  { id: 'transport_logistics', label: 'Transport and logistics' },
  { id: 'safety_emergency', label: 'Safety and emergency coordination' },
  { id: 'participant_support', label: 'Participant support' },
  { id: 'technical_av', label: 'Technical and AV operations' },
  { id: 'volunteer_coordination', label: 'Volunteer coordination' },
  { id: 'sponsor_partners', label: 'Sponsor and partner coordination' },
  { id: 'communications_outreach', label: 'Communications and outreach' },
  { id: 'scheduling_programme', label: 'Event scheduling and programme management' },
] as const;

export const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type CapabilityCategory = typeof CAPABILITY_CATEGORIES[number]['id'];
export type ProficiencyLevel = typeof PROFICIENCY_LEVELS[number];

export interface TeamCapability {
  id: string;
  eventId: string;
  userId: string;
  category: CapabilityCategory;
  name: string;
  proficiency: ProficiencyLevel;
  experienceYears: number | null;
  description: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface TeamPerformance {
  incidentsAssigned: number;
  incidentsResolved: number;
  openIncidents: number;
  tasksCompleted: number;
  tasksOverdue: number;
  tasksActive: number;
  medianResolutionMinutes: number | null;
  resolutionSampleSize: number;
  activeIncidents: Array<{ id: string; referenceNumber: string; title: string; category: string; urgency: string; status: string; zone: string | null; createdAt: string }>;
  recentActivity: Array<{ action: string; details: string; createdAt: string; incidentReference: string; incidentTitle: string }>;
}

export interface TeamMemberProfile {
  assignment_id: string;
  responsibility: string;
  assignment_status: string;
  id: string;
  name: string;
  email: string;
  role: string;
  availability: 'available' | 'busy' | 'offline' | 'unknown';
  skills: string;
  zones: string;
  active_incidents: number;
  phone: string | null;
  preferred_contact_method: 'email' | 'phone' | 'sms' | null;
  capabilities: TeamCapability[];
  performance: TeamPerformance;
}

export interface CapabilityInput {
  category: unknown;
  name: unknown;
  proficiency: unknown;
  experienceYears?: unknown;
  description?: unknown;
  verified?: unknown;
}

export interface ValidatedCapability {
  category: CapabilityCategory;
  name: string;
  proficiency: ProficiencyLevel;
  experienceYears: number | null;
  description: string;
  verified: boolean;
}

export function validateCapability(input: CapabilityInput) {
  const category = typeof input.category === 'string' && CAPABILITY_CATEGORIES.some(item => item.id === input.category)
    ? input.category as CapabilityCategory : null;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const proficiency = typeof input.proficiency === 'string' && PROFICIENCY_LEVELS.includes(input.proficiency as ProficiencyLevel)
    ? input.proficiency as ProficiencyLevel : null;
  const experienceYears = input.experienceYears == null || input.experienceYears === ''
    ? null : Number(input.experienceYears);
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!category) return { error: 'Choose a valid capability category.' } as const;
  if (!name || name.length > 80) return { error: 'Capability name must be between 1 and 80 characters.' } as const;
  if (!proficiency) return { error: 'Choose a valid proficiency level.' } as const;
  if (experienceYears !== null && (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 80)) {
    return { error: 'Experience must be between 0 and 80 years.' } as const;
  }
  if (description.length > 300) return { error: 'Description must be 300 characters or fewer.' } as const;
  return { value: { category, name, proficiency, experienceYears, description, verified: input.verified === true } } as const;
}

export interface SuggestedResponderInput {
  id: string;
  name: string;
  availability: string;
  zones: string[];
  activeIncidents: number;
  activeTasks?: number;
  capabilities: Array<Pick<TeamCapability, 'name' | 'category' | 'proficiency' | 'verified' | 'experienceYears'>>;
  legacySkills?: string[];
}

const CATEGORY_TERMS: Record<string, CapabilityCategory[]> = {
  transport: ['transport_logistics'],
  venue: ['venue_stage'],
  safety: ['safety_emergency'],
  accessibility: ['participant_support', 'venue_stage'],
  registration: ['registration_checkin'],
  'technical issue': ['technical_av'],
  food: ['venue_stage'],
  accommodation: ['participant_support', 'transport_logistics'],
  programme: ['scheduling_programme', 'venue_stage'],
  other: [],
};

export function suggestResponders(
  responders: SuggestedResponderInput[],
  requiredSkill: string,
  zone?: string,
) {
  const wanted = requiredSkill.trim().toLowerCase();
  const relatedCategories = CATEGORY_TERMS[wanted] ?? [];
  return responders.map(responder => {
    const matched = responder.capabilities.filter(capability =>
      capability.name.toLowerCase() === wanted || relatedCategories.includes(capability.category),
    );
    const legacyMatch = (responder.legacySkills ?? []).some(skill => skill.toLowerCase() === wanted);
    const matchingZones = zone ? responder.zones.filter(item => item.toLowerCase() === zone.toLowerCase()) : [];
    const allZones = responder.zones.some(item => item.toLowerCase() === 'all');
    const reasons: string[] = [];
    if (matched.length) {
      const verified = matched.find(item => item.verified);
      const selected = verified ?? matched[0];
      const experience = verified && selected.experienceYears != null ? `, ${selected.experienceYears} years’ experience` : '';
      reasons.push(`${verified ? 'Verified' : 'Listed'} ${selected.name} capability (${selected.proficiency}${experience})`);
    } else if (legacyMatch) reasons.push(`Listed skill match: ${requiredSkill}`);
    if (zone && (matchingZones.length || allZones)) reasons.push(`Assigned to ${matchingZones[0] ?? 'all zones'}`);
    reasons.push(`Availability: ${responder.availability}`);
    if (responder.activeIncidents) reasons.push(`${responder.activeIncidents} active incident${responder.activeIncidents === 1 ? '' : 's'}`);
    if (responder.activeTasks) reasons.push(`${responder.activeTasks} active task${responder.activeTasks === 1 ? '' : 's'}`);
    const verifiedMatch = matched.find(item => item.verified);
    const proficiencyWeight = verifiedMatch ? { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }[verifiedMatch.proficiency] : 0;
    const verifiedExperience = verifiedMatch?.experienceYears ?? 0;
    const score = (verifiedMatch ? 45 + proficiencyWeight * 3 + Math.min(verifiedExperience, 10) : matched.length ? 30 : legacyMatch ? 20 : 0)
      + (zone && (matchingZones.length || allZones) ? 20 : 0)
      + (responder.availability === 'available' ? 15 : responder.availability === 'busy' ? 0 : -30)
      - responder.activeIncidents * 10 - (responder.activeTasks ?? 0) * 5;
    return { ...responder, score, reason: reasons.join(' · '), matchedCapabilities: matched.map(item => item.name) };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
