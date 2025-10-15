import { addDays, differenceInDays } from 'date-fns';

export type ComplaintAge = 'new' | 'warning' | 'critical';

export interface ComplaintWithAge {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  submitter_id: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  age: ComplaintAge;
  daysOld: number;
}

export function getComplaintAge(createdAt: string): { age: ComplaintAge; daysOld: number } {
  const now = new Date();
  const created = new Date(createdAt);
  const daysOld = differenceInDays(now, created);
  
  if (daysOld >= 7) {
    return { age: 'critical', daysOld };
  } else if (daysOld >= 4) {
    return { age: 'warning', daysOld };
  } else {
    return { age: 'new', daysOld };
  }
}

export function getComplaintCardClass(age: ComplaintAge): string {
  switch (age) {
    case 'critical':
      return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10';
    case 'warning':
      return 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
    case 'new':
    default:
      return 'border-l-4 border-l-green-500 bg-white dark:bg-card';
  }
}

export function sortComplaintsByPriority(complaints: ComplaintWithAge[]): ComplaintWithAge[] {
  return [...complaints].sort((a, b) => {
    // First sort by age priority (critical -> warning -> new)
    const agePriority = { critical: 0, warning: 1, new: 2 };
    const ageComparison = agePriority[a.age] - agePriority[b.age];
    
    if (ageComparison !== 0) {
      return ageComparison;
    }
    
    // Within same age group, sort by creation date (oldest first)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function formatTimeAgo(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const daysOld = differenceInDays(now, created);
  
  if (daysOld === 0) {
    return 'היום';
  } else if (daysOld === 1) {
    return 'אתמול';
  } else {
    return `לפני ${daysOld} ימים`;
  }
}