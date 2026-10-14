import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initDbSchema } from '../src/lib/server/db.ts';
import { canAccessSubOrganizerTask, canAssignSubOrganizerToEvent } from '../src/lib/server/team-repository.ts';
import { createTaskCompletionNotification, listAssignedTasksForSubOrganizer, listTaskActivities, recordTaskActivity, recordTaskActivityId } from '../src/lib/server/task-repository.ts';

function fixture() {
  const database = new DatabaseSync(':memory:');
  initDbSchema(database);
  const now = new Date().toISOString();
  const insertUser = database.prepare('INSERT INTO users(id,name,email,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
  insertUser.run('owner', 'Organizer', 'owner@example.test', 'test-hash', 'organizer', 'active', now, now);
  insertUser.run('worker-a', 'Responder A', 'worker-a@example.test', 'test-hash', 'sub_organizer', 'active', now, now);
  insertUser.run('worker-b', 'Responder B', 'worker-b@example.test', 'test-hash', 'sub_organizer', 'active', now, now);
  insertUser.run('participant', 'Participant', 'participant@example.test', 'test-hash', 'participant', 'active', now, now);
  database.prepare(`INSERT INTO events(id,organizer_id,name,event_type,format,start_at,end_at,timezone,created_at,updated_at)
    VALUES('event-a','owner','Event A','conference','in-person',?,?, 'UTC',?,?)`).run(now, now, now, now);
  database.prepare(`INSERT INTO events(id,organizer_id,name,event_type,format,start_at,end_at,timezone,created_at,updated_at)
    VALUES('event-b','owner','Event B','conference','in-person',?,?, 'UTC',?,?)`).run(now, now, now, now);
  const assignment = database.prepare(`INSERT INTO team_assignments(id,event_id,user_id,responsibility,status,created_at,updated_at)
    VALUES(?,?,?,'Transport','active',?,?)`);
  assignment.run('assignment-a', 'event-a', 'worker-a', now, now);
  assignment.run('assignment-b', 'event-a', 'worker-b', now, now);
  database.prepare(`INSERT INTO tasks(id,event_id,title,description,priority,status,due_at,owner_id,created_by,assigned_at,created_at,updated_at)
    VALUES('task-a','event-a','Move equipment','', 'high','pending',?,'worker-a','owner',? ,?,?)`).run(now, now, now, now);
  database.prepare(`INSERT INTO in_app_notifications(id,user_id,event_id,task_id,type,title,message,created_at)
    VALUES('legacy-notif','owner','event-a','task-a','info','Existing notice','Keep this notice',?)`).run(now);
  return { database, now };
}

test('shared task persistence migration is repeatable and preserves legacy task rows', () => {
  const { database } = fixture();
  try {
    database.exec(`DROP INDEX tasks_creator_request_unique; DROP INDEX tasks_related_incident_unique; DROP TABLE task_activities;
      DROP INDEX notifications_source_key_unique;
      ALTER TABLE in_app_notifications DROP COLUMN source_key;
      ALTER TABLE tasks DROP COLUMN created_by; ALTER TABLE tasks DROP COLUMN assigned_at;
      ALTER TABLE tasks DROP COLUMN completed_at; ALTER TABLE tasks DROP COLUMN related_incident_id;
      ALTER TABLE tasks DROP COLUMN request_key;`);
    initDbSchema(database);
    initDbSchema(database);
    const columns = new Set(database.prepare('PRAGMA table_info(tasks)').all().map(row => row.name));
    for (const column of ['created_by', 'assigned_at', 'completed_at', 'related_incident_id', 'request_key']) assert.ok(columns.has(column));
    const preserved = database.prepare('SELECT title,owner_id,created_by,assigned_at,completed_at,related_incident_id,request_key FROM tasks WHERE id=?').get('task-a');
    assert.equal(preserved.title, 'Move equipment');
    assert.equal(preserved.owner_id, 'worker-a');
    assert.equal(preserved.created_by, null);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM task_activities").get().n, 0);
    assert.ok(database.prepare('PRAGMA table_info(in_app_notifications)').all().some(row => row.name === 'source_key'));
    assert.equal(database.prepare("SELECT message FROM in_app_notifications WHERE id='legacy-notif'").get().message, 'Keep this notice');
  } finally { database.close(); }
});

test('assignment authorization is active, event-scoped, and removed from the former assignee', () => {
  const { database } = fixture();
  try {
    assert.equal(canAssignSubOrganizerToEvent(database, 'event-a', 'worker-a'), true);
    assert.equal(canAssignSubOrganizerToEvent(database, 'event-b', 'worker-a'), false);
    assert.equal(canAssignSubOrganizerToEvent(database, 'event-a', 'participant'), false);
    assert.equal(canAccessSubOrganizerTask(database, 'task-a', 'worker-a'), true);
    assert.equal(canAccessSubOrganizerTask(database, 'task-a', 'worker-b'), false);
    database.prepare('UPDATE tasks SET owner_id=? WHERE id=?').run('worker-b', 'task-a');
    assert.equal(canAccessSubOrganizerTask(database, 'task-a', 'worker-a'), false);
    assert.equal(canAccessSubOrganizerTask(database, 'task-a', 'worker-b'), true);
    database.prepare("UPDATE team_assignments SET status='inactive' WHERE user_id='worker-b'").run();
    assert.equal(canAccessSubOrganizerTask(database, 'task-a', 'worker-b'), false);
  } finally { database.close(); }
});

test('My Tasks reads the shared task by authenticated owner ID and active event membership', () => {
  const { database } = fixture();
  try {
    const allAssigned = listAssignedTasksForSubOrganizer(database, 'worker-a');
    assert.equal(allAssigned.length, 1);
    assert.equal(allAssigned[0].id, 'task-a');
    assert.equal(allAssigned[0].event_id, 'event-a');
    assert.equal(allAssigned[0].owner_id, 'worker-a');
    assert.equal(allAssigned[0].status, 'pending');
    assert.equal(allAssigned[0].event_name, 'Event A');
    assert.equal(allAssigned[0].organizer_name, 'Organizer');

    assert.equal(listAssignedTasksForSubOrganizer(database, 'worker-b').length, 0);
    assert.equal(listAssignedTasksForSubOrganizer(database, 'worker-a', 'event-b').length, 0);

    database.prepare("UPDATE team_assignments SET status='inactive' WHERE event_id='event-a' AND user_id='worker-a'").run();
    assert.equal(listAssignedTasksForSubOrganizer(database, 'worker-a').length, 0);
    database.prepare("UPDATE team_assignments SET status='active' WHERE event_id='event-a' AND user_id='worker-a'").run();
    database.prepare("UPDATE users SET status='inactive' WHERE id='worker-a'").run();
    assert.equal(listAssignedTasksForSubOrganizer(database, 'worker-a').length, 0);
  } finally { database.close(); }
});

test('task activity records are durable and request-key retries do not duplicate history', () => {
  const { database, now } = fixture();
  try {
    const activity = { taskId: 'task-a', actorId: 'worker-a', action: 'blocked', details: 'Waiting for venue access', fromStatus: 'in-progress', toStatus: 'blocked', requestKey: 'request-123-status', createdAt: now };
    assert.equal(recordTaskActivity(database, activity), true);
    assert.equal(recordTaskActivity(database, activity), false);
    const history = listTaskActivities(database, 'task-a');
    assert.equal(history.length, 1);
    assert.equal(history[0].actorName, 'Responder A');
    assert.equal(history[0].details, 'Waiting for venue access');
  } finally { database.close(); }
});

test('completion transition history and organizer notification are idempotent', () => {
  const { database, now } = fixture();
  try {
    const completion = { taskId: 'task-a', actorId: 'worker-a', action: 'completed', details: 'Equipment staged', fromStatus: 'in-progress', toStatus: 'completed', requestKey: 'complete-request-status', createdAt: now };
    const activityId = recordTaskActivityId(database, completion);
    assert.ok(activityId);
    assert.equal(recordTaskActivityId(database, completion), null);
    const notification = { userId: 'owner', eventId: 'event-a', taskId: 'task-a', taskTitle: 'Move equipment', actorName: 'Responder A', eventName: 'Event A', completedAt: now, sourceKey: `task-completion:${activityId}`, summary: 'Equipment staged' };
    assert.equal(createTaskCompletionNotification(database, notification), true);
    assert.equal(createTaskCompletionNotification(database, notification), false);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM in_app_notifications WHERE user_id='owner' AND task_id='task-a' AND source_key IS NOT NULL").get().n, 1);
    const saved = database.prepare("SELECT title,message FROM in_app_notifications WHERE user_id='owner' AND task_id='task-a' AND source_key IS NOT NULL").get();
    assert.match(saved.title, /Move equipment/);
    assert.match(saved.message, /Responder A.*Event A.*202/);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM task_activities WHERE task_id='task-a' AND action='completed'").get().n, 1);
  } finally { database.close(); }
});
