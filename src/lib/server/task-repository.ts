import { id, type SqliteDatabase } from './db.ts';

export type TaskActivityAction = 'created' | 'assigned' | 'reassigned' | 'status_changed' | 'progress_update' | 'assistance_requested' | 'blocked' | 'completed' | 'reopened';

export function recordTaskActivityId(database: SqliteDatabase, input: {
  taskId: string;
  actorId: string;
  action: TaskActivityAction;
  details?: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  requestKey?: string | null;
  createdAt: string;
}): string | null {
  const activityId = id('taskactivity');
  const result = database.prepare(`
    INSERT INTO task_activities(id,task_id,actor_id,action,details,from_status,to_status,request_key,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(task_id,actor_id,request_key) WHERE request_key IS NOT NULL DO NOTHING
  `).run(activityId, input.taskId, input.actorId, input.action, input.details ?? '', input.fromStatus ?? null, input.toStatus ?? null, input.requestKey ?? null, input.createdAt);
  return result.changes > 0 ? activityId : null;
}

export function recordTaskActivity(database: SqliteDatabase, input: Parameters<typeof recordTaskActivityId>[1]): boolean {
  return recordTaskActivityId(database, input) !== null;
}

export function createTaskCompletionNotification(database: SqliteDatabase, input: {
  userId: string; eventId: string; taskId: string; sourceKey: string;
  taskTitle: string; actorName: string; eventName: string; completedAt: string; summary?: string;
}): boolean {
  const message = `${input.actorName} completed “${input.taskTitle}” for ${input.eventName} at ${input.completedAt}.${input.summary ? ` Summary: ${input.summary}` : ''}`;
  const result = database.prepare(`INSERT INTO in_app_notifications
    (id,user_id,event_id,task_id,type,title,message,read,created_at,source_key)
    VALUES(?,?,?,?, 'success',?,?,0,?,?)
    ON CONFLICT(user_id,source_key) WHERE source_key IS NOT NULL DO NOTHING`)
    .run(id('notif'), input.userId, input.eventId, input.taskId, `Task completed: ${input.taskTitle}`, message, input.completedAt, input.sourceKey);
  return result.changes > 0;
}

export function listTaskActivities(database: SqliteDatabase, taskId: string) {
  return database.prepare(`
    SELECT a.id,a.task_id AS taskId,a.actor_id AS actorId,u.name AS actorName,
      a.action,a.details,a.from_status AS fromStatus,a.to_status AS toStatus,a.created_at AS createdAt
    FROM task_activities a JOIN users u ON u.id=a.actor_id
    WHERE a.task_id=? ORDER BY a.created_at,a.id
  `).all(taskId);
}

/**
 * Shared My Tasks query. The task owner is the authenticated user ID, and the
 * active event membership is checked in the same query so stale/revoked
 * memberships cannot make an assignment visible.
 */
export function listAssignedTasksForSubOrganizer(database: SqliteDatabase, userId: string, eventId?: string) {
  const eventFilter = eventId ? 'AND t.event_id=?' : '';
  return database.prepare(`
    SELECT t.*,e.name AS event_name,o.name AS organizer_name
    FROM tasks t
    JOIN events e ON e.id=t.event_id
    JOIN users o ON o.id=e.organizer_id
    JOIN users assignee ON assignee.id=t.owner_id
    WHERE t.owner_id=? AND assignee.role='sub_organizer' AND assignee.status='active'
      AND EXISTS (
        SELECT 1 FROM team_assignments ta
        WHERE ta.event_id=t.event_id AND ta.user_id=assignee.id AND ta.status='active'
      ) ${eventFilter}
    ORDER BY CASE t.status WHEN 'blocked' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,t.due_at,t.created_at DESC
  `).all(...(eventId ? [userId, eventId] : [userId]));
}
