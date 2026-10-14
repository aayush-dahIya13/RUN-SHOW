import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { authenticateUser } from '../src/lib/server/auth-credentials.ts';
import { initDbSchema, nowIso } from '../src/lib/server/db.ts';
import { acceptTeamInvitation, digestTeamInviteToken, InvalidTeamInvitationError, InvitationIdentityMismatchError, signupAccount, SignupConflictError } from '../src/lib/server/signup-repository.ts';
import { canReadEventTeam } from '../src/lib/server/team-repository.ts';

function fixture() {
  const db = new DatabaseSync(':memory:'); initDbSchema(db); const now=nowIso();
  db.prepare(`INSERT INTO users(id,name,email,password_hash,role,status,created_at,updated_at) VALUES('owner','Owner','owner@example.test',?,'organizer','active',?,?)`).run('not-a-login-hash',now,now);
  db.prepare(`INSERT INTO events(id,organizer_id,name,event_type,format,start_at,end_at,timezone,created_at,updated_at) VALUES('ev','owner','Event','conference','in-person',?,?,'UTC',?,?)`).run(now,now,now,now);
  return {db,now};
}
function invitation(db, now, token='team-token-for-test-000000000000000000000000000000', email='sub@example.test', approval=0, status='pending', days=7) {
  db.prepare(`INSERT INTO team_invitations(id,event_id,organizer_id,token_hash,intended_email,responsibility,responsibilities_json,zones,requires_approval,status,expires_at,created_at,updated_at) VALUES('invite','ev','owner',?,?,?,?,?,?,?, ?,?,?)`)
    .run(digestTeamInviteToken(token),email,'Operations','["Transport","Check-in"]','Gate A',approval,status,new Date(Date.now()+days*86400000).toISOString(),now,now);
  return token;
}

test('invitation-backed sub-organizer signup is atomic, normalized and produces a usable login with event-only membership', async () => {
  const {db,now}=fixture(); const token=invitation(db,now);
  try {
    const result=await signupAccount(db,{name:'New Member',email:' SUB@EXAMPLE.TEST ',password:'a-secure-password',role:'sub_organizer',teamInvitationToken:token});
    assert.equal(result.email,'sub@example.test'); assert.equal(result.invitation.eventId,'ev');
    assert.equal(db.prepare('SELECT user_id FROM auth_sessions WHERE id=?').get(createHash('sha256').update(result.session.token).digest('hex')).user_id,result.id);
    assert.equal(db.prepare('SELECT status FROM team_invitations WHERE id=\'invite\'').get().status,'accepted');
    const secretRow=db.prepare('SELECT token_hash FROM team_invitations WHERE id=\'invite\'').get();
    assert.equal(secretRow.token_hash,digestTeamInviteToken(token));
    assert.equal(JSON.stringify(secretRow).includes(token),false);
    const assignment=db.prepare('SELECT status,responsibility,permissions_json,zones FROM team_assignments WHERE user_id=?').get(result.id);
    assert.deepEqual({...assignment},{status:'active',responsibility:'Operations',permissions_json:'["Transport","Check-in"]',zones:'Gate A'});
    assert.equal(canReadEventTeam(db,'ev',result.id,'sub_organizer'),true);
    assert.equal(canReadEventTeam(db,'other-event',result.id,'sub_organizer'),false);
    assert.equal((await authenticateUser(db,'sub@example.test','a-secure-password')).id,result.id);
    assert.throws(()=>acceptTeamInvitation(db,token,result.id,result.email),InvalidTeamInvitationError);
    assert.equal(String(db.prepare('SELECT password_hash FROM users WHERE id=?').get(result.id).password_hash).startsWith('scrypt$'),true);
  } finally {db.close();}
});

test('wrong invitation email and invalid invitations roll back signup without creating an account', async()=>{
  const {db,now}=fixture(); const token=invitation(db,now,'team-token-mismatch-000000000000000000000000000000','invited@example.test');
  try {
    await assert.rejects(()=>signupAccount(db,{name:'Wrong Person',email:'wrong@example.test',password:'a-secure-password',role:'sub_organizer',teamInvitationToken:token}),InvitationIdentityMismatchError);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE role=\'sub_organizer\'').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);
    await assert.rejects(()=>signupAccount(db,{name:'No Invite',email:'none@example.test',password:'a-secure-password',role:'sub_organizer'}),InvalidTeamInvitationError);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE email=\'none@example.test\'').get().n,0);
  } finally {db.close();}
});

test('approval-required acceptance remains pending and does not grant event access until organizer approval', async()=>{
  const {db,now}=fixture(); const token=invitation(db,now,'team-token-approval-000000000000000000000000000000','sub@example.test',1);
  try {
    const user=await signupAccount(db,{name:'Pending Member',email:'sub@example.test',password:'a-secure-password',role:'sub_organizer',teamInvitationToken:token});
    assert.equal(user.invitation.requiresApproval,true);
    assert.equal(db.prepare('SELECT status FROM team_invitations WHERE id=\'invite\'').get().status,'pending_approval');
    assert.equal(db.prepare('SELECT status FROM team_assignments WHERE user_id=?').get(user.id).status,'inactive');
    assert.equal(canReadEventTeam(db,'ev',user.id,'sub_organizer'),false);
    assert.equal((await authenticateUser(db,user.email,'a-secure-password')).id,user.id);
    assert.equal(await authenticateUser(db,user.email,'wrong-password'),null);
    db.prepare(`UPDATE team_assignments SET status='active' WHERE user_id=?`).run(user.id);
    db.prepare(`UPDATE team_invitations SET status='accepted' WHERE id='invite'`).run();
    assert.equal(canReadEventTeam(db,'ev',user.id,'sub_organizer'),true);
  } finally {db.close();}
});

test('expired and revoked team invitations cannot create accounts', async()=>{
  for (const [status,days] of [['pending',-1],['revoked',7]]) {
    const {db,now}=fixture(); const token=invitation(db,now,`team-token-${status}-000000000000000000000000000000`,'sub@example.test',0,status,days);
    try { await assert.rejects(()=>signupAccount(db,{name:'Member',email:'sub@example.test',password:'a-secure-password',role:'sub_organizer',teamInvitationToken:token}),InvalidTeamInvitationError); assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE role=\'sub_organizer\'').get().n,0); }
    finally {db.close();}
  }
});

test('organizer and participant public signup persists the selected global role without event access', async()=>{
  const {db}=fixture();
  try {
    const organizer=await signupAccount(db,{name:'New Organizer',email:' ORG@EXAMPLE.TEST ',password:'organizer-password',role:'organizer'});
    const participant=await signupAccount(db,{name:'New Participant',email:'part@example.test',password:'participant-password',role:'participant'});
    assert.equal(organizer.email,'org@example.test'); assert.equal((await authenticateUser(db,organizer.email,'organizer-password')).role,'organizer');
    assert.equal((await authenticateUser(db,participant.email,'participant-password')).role,'participant');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM team_assignments WHERE user_id IN (?,?)').get(organizer.id,participant.id).n,0);
  } finally {db.close();}
});

test('normalized duplicate signup is rejected without changing the existing account or creating a session', async()=>{
  const {db,now}=fixture();
  try {
    db.prepare(`INSERT INTO users(id,name,email,password_hash,role,status,created_at,updated_at) VALUES('existing','Existing','taken@example.test','existing-hash','participant','active',?,?)`).run(now,now);
    await assert.rejects(()=>signupAccount(db,{name:'Different',email:' TAKEN@example.test ',password:'new-password-123',role:'organizer'}),SignupConflictError);
    const existing=db.prepare('SELECT name,password_hash,role FROM users WHERE id=\'existing\'').get();
    assert.deepEqual({...existing},{name:'Existing',password_hash:'existing-hash',role:'participant'});
    assert.equal(db.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);
  } finally {db.close();}
});
