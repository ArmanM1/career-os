begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity), 0, 'RLS enabled on every public table');
select is((select count(*)::integer from storage.buckets where id in ('resume-sources','resume-artifacts','thread-attachments','evidence','exports') and public=false), 5, 'all storage buckets are private');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='oauth_credentials'), 0, 'OAuth credentials have no browser policies');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('00000000-0000-4000-8000-000000000101','00000000-0000-0000-0000-000000000000','authenticated','authenticated','one@example.com','x',now(),now()),
('00000000-0000-4000-8000-000000000102','00000000-0000-0000-0000-000000000000','authenticated','authenticated','two@example.com','x',now(),now());
insert into public.profiles(user_id,title) values ('00000000-0000-4000-8000-000000000101','One'),('00000000-0000-4000-8000-000000000102','Two');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
select is((select count(*)::integer from public.profiles), 1, 'RLS isolates the first user');
select throws_ok($$insert into public.tasks(user_id,title,task_type,source) values ('00000000-0000-4000-8000-000000000102','Cross-user','admin','user')$$, 'new row violates row-level security policy for table "tasks"', 'cross-user insert is denied');
reset role;

insert into public.worker_devices(id,user_id,name,status,secret_hash) values ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','Worker','online','hash');
insert into public.agent_jobs(id,user_id,agent_id,title,status,scheduled_for) values
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101','career-advisor','Due','queued',now()-interval '1 minute'),
('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000101','career-advisor','Future','queued',now()+interval '1 day');
select is((select count(*)::integer from public.claim_agent_jobs('00000000-0000-4000-8000-000000000201',1,300)), 1, 'atomic claim returns one due job');
select is((select count(*)::integer from public.claim_agent_jobs('00000000-0000-4000-8000-000000000201',10,300)), 0, 'claimed and future jobs are not duplicated or early');

insert into public.worker_pairing_codes(user_id,worker_device_id,code_hash,expires_at) values ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201','pairhash',now()+interval '10 minutes');
select is((select count(*)::integer from public.consume_worker_pairing_code('pairhash','newhash','test',array['codex'])), 1, 'pairing code is consumed once');
select throws_ok($$select * from public.consume_worker_pairing_code('pairhash','again','test',array[]::text[])$$, 'invalid or expired pairing code', 'pairing code cannot be reused');

insert into public.proposed_mutations(id,user_id,mutation_type,target_object_type,payload,rationale,confidence,approval_policy,status,idempotency_key)
values ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','profile.upsert','profile','{"title":"Updated Profile","headline":"Ready for recruiting"}','Profile test','high','auto_apply','pending','test-profile-upsert');
select lives_ok($$select public.apply_career_mutation('00000000-0000-4000-8000-000000000401')$$, 'registered profile mutation applies');
select is((select headline from public.profiles where user_id='00000000-0000-4000-8000-000000000101'), 'Ready for recruiting', 'profile mutation updates canonical data');

insert into public.proposed_mutations(id,user_id,mutation_type,target_object_type,payload,rationale,confidence,approval_policy,status,idempotency_key)
values ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000101','task.create','task','{"title":"Apply to role","taskType":"job_app","priority":90}','Task test','high','auto_apply','pending','test-task-create');
select lives_ok($$select public.apply_career_mutation('00000000-0000-4000-8000-000000000402')$$, 'registered task mutation applies transactionally');
select is((select count(*)::integer from public.audit_log_entries where payload->>'mutationId'='00000000-0000-4000-8000-000000000402'), 1, 'mutation and audit entry commit together');

select lives_ok($$
  select public.complete_agent_job(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000301',
    '{"summary":"Form is ready for approval","proposedMutations":[{"id":"00000000-0000-4000-8000-000000000403","mutationType":"application.form_fill.request","targetObjectType":"application","payload":{"applicationId":"00000000-0000-4000-8000-000000000501","portalUrl":"https://example.com/apply","fields":[],"artifactIds":[],"finalSubmitSelectors":["button[type=submit]"]},"rationale":"Prepare fields only","evidenceIds":[],"confidence":"high","approvalPolicy":"approval_required","idempotencyKey":"test-form-fill"}]}'::jsonb,
    '{}'::jsonb
  )
$$, 'job completion persists approval-required mutations');
select is((select status::text from public.proposed_mutations where id='00000000-0000-4000-8000-000000000403'), 'approval_required', 'approval mutation cannot enter the auto-apply queue');
select is((select count(*)::integer from public.approval_requests where payload->>'proposedMutationId'='00000000-0000-4000-8000-000000000403' and status='pending'), 1, 'approval mutation creates one review request');

select * from finish();
rollback;
