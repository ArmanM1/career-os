begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

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

insert into public.worker_devices(id,user_id,name,status,secret_hash,last_heartbeat_at) values ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','Worker','online','hash',now());
select has_table('public', 'onboarding_work_items', 'onboarding readiness ledger exists');

insert into public.onboarding_sessions(id,user_id,status,current_step) values
('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000101','in_progress',14),
('00000000-0000-4000-8000-000000000602','00000000-0000-4000-8000-000000000102','in_progress',14);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
select throws_ok(
  $$insert into public.onboarding_work_items(user_id,onboarding_session_id,stable_key,work_type,title) values ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000602','source:cross-user','source','Cross-user source')$$,
  'new row violates row-level security policy for table "onboarding_work_items"',
  'onboarding work items are user-isolated'
);
reset role;

insert into public.career_seasons(user_id,title,season_type,status) values
('00000000-0000-4000-8000-000000000101','Recruiting season','internship_peak','active');
insert into public.goals(user_id,title,horizon,status) values
('00000000-0000-4000-8000-000000000101','Find a strong internship','1_year','active');
insert into public.onboarding_work_items(id,user_id,onboarding_session_id,stable_key,work_type,title,status,phase,blocking_reason,next_user_action,created_by,updated_by) values
('00000000-0000-4000-8000-000000000611','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601','resume:primary','resume','Primary resume','ready','verified',null,'{}','user','user'),
('00000000-0000-4000-8000-000000000612','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601','source:instagram-zero2sudo','source','zero2sudo Instagram stories','waiting_for_user','authentication','Instagram login is required.','{"type":"open_browser_login","provider":"instagram"}','system','system');

select is(
  (public.evaluate_onboarding_readiness('00000000-0000-4000-8000-000000000601')->>'ready')::boolean,
  false,
  'onboarding readiness remains blocked by source authentication'
);
select is(
  (
    select blocker->'nextUserAction'->>'type'
    from jsonb_array_elements(public.evaluate_onboarding_readiness('00000000-0000-4000-8000-000000000601')->'blockers') blocker
    where blocker->>'workItemId'='00000000-0000-4000-8000-000000000612'
  ),
  'open_browser_login',
  'readiness exposes the exact setup action to the web UI'
);
select throws_like(
  $$select public.complete_onboarding('00000000-0000-4000-8000-000000000601',1)$$,
  'onboarding_not_ready',
  'onboarding cannot complete while a required source is waiting for the user'
);
update public.onboarding_work_items
set status='ready', phase='first_read_complete', next_user_action='{}'::jsonb
where id='00000000-0000-4000-8000-000000000612';
select lives_ok(
  $$select public.complete_onboarding('00000000-0000-4000-8000-000000000601',1)$$,
  'onboarding completes transactionally after all readiness gates pass'
);
select is(
  (select status from public.onboarding_sessions where id='00000000-0000-4000-8000-000000000601'),
  'completed',
  'completed onboarding status is persisted'
);
select is(
  (select count(*)::integer from public.audit_log_entries where action_type='onboarding.completed' and target_object_id='00000000-0000-4000-8000-000000000601'),
  1,
  'onboarding completion is audited'
);

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

select ok(
  'dead_letter' = any(enum_range(null::public.agent_job_status)::text[]),
  'agent job status includes an inspectable dead-letter state'
);

insert into public.source_monitors(id,user_id,title,status,source_type,url,fetch_strategy,schedule,created_by,updated_by)
values ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000101','GitHub source','proposed','github_repo','https://github.com/example/jobs','git_pull','every_6_hours','user','user');
insert into public.proposed_mutations(id,user_id,mutation_type,target_object_type,payload,rationale,confidence,approval_policy,status,idempotency_key)
values ('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000101','source_adapter.upsert','source_adapter','{"title":"GitHub Markdown adapter","sourceMonitorId":"00000000-0000-4000-8000-000000000701","adapterType":"github_markdown","definition":{"fetchUrl":"https://raw.githubusercontent.com/example/jobs/HEAD/README.md"},"checksum":"0123456789abcdef0123456789abcdef","domainAllowlist":["github.com","raw.githubusercontent.com"],"testResult":{"valid":true}}','Adapter test','high','auto_apply','pending','test-source-adapter');
select lives_ok($$select public.apply_career_mutation('00000000-0000-4000-8000-000000000702')$$, 'source adapter mutation applies');
select is((select source_monitor_id from public.source_adapters where checksum='0123456789abcdef0123456789abcdef'), '00000000-0000-4000-8000-000000000701'::uuid, 'source adapter remains linked to its monitor');

insert into public.artifacts(id,user_id,title,artifact_type,bucket,storage_path,sha256,origin,retention_policy,created_by,updated_by)
values ('00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-000000000101','Resume.pdf','resume_source_pdf','resume-sources','00000000-0000-4000-8000-000000000101/resume.pdf',repeat('a',64),'user_upload','canonical','user','user');
insert into public.proposed_mutations(id,user_id,mutation_type,target_object_type,payload,rationale,confidence,approval_policy,status,idempotency_key)
values ('00000000-0000-4000-8000-000000000712','00000000-0000-4000-8000-000000000101','experience.upsert','experience','{"title":"Software Engineering Intern","organization":"Example","componentType":"work","sourceArtifactId":"00000000-0000-4000-8000-000000000711","sourceSpan":{"page":1},"labels":["software"],"metadata":{}}','Resume extraction test','high','auto_apply','pending','test-resume-experience');
select lives_ok($$select public.apply_career_mutation('00000000-0000-4000-8000-000000000712')$$, 'resume experience component mutation applies');
select is((select status from public.experiences where title='Software Engineering Intern'), 'draft', 'extracted experience requires user verification');
select is((select metadata->'sourceArtifactIds'->>0 from public.experiences where title='Software Engineering Intern'), '00000000-0000-4000-8000-000000000711', 'extracted component keeps source artifact provenance');

insert into public.opportunities(id,user_id,title,opportunity_type,status,url,created_by,updated_by)
values ('00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000101','Platform Engineering Intern','internship','open','https://example.com/jobs/platform','system','system');
insert into public.applications(id,user_id,title,status,opportunity_id,created_by,updated_by)
values ('00000000-0000-4000-8000-000000000802','00000000-0000-4000-8000-000000000101','Example — Platform Engineering Intern','drafting','00000000-0000-4000-8000-000000000801','user','user');
insert into public.proposed_mutations(id,user_id,mutation_type,target_object_type,target_object_id,payload,rationale,confidence,approval_policy,status,idempotency_key)
values ('00000000-0000-4000-8000-000000000803','00000000-0000-4000-8000-000000000101','application.upsert','application','00000000-0000-4000-8000-000000000802','{"title":"Example — Platform Engineering Intern","status":"drafting","opportunityId":"00000000-0000-4000-8000-000000000801","nextAction":"Review the generated packet."}','Application packet refresh','high','auto_apply','pending','test-application-workflow');
select lives_ok($$select public.apply_career_mutation('00000000-0000-4000-8000-000000000803')$$, 'application workflow mutation applies through the trusted dispatcher');
select is((select next_action from public.applications where id='00000000-0000-4000-8000-000000000802'), 'Review the generated packet.', 'application workflow persists one explicit next action');
select is((select count(*)::integer from public.audit_log_entries where target_object_id='00000000-0000-4000-8000-000000000802' and action_type='mutation.applied'), 1, 'application workflow mutation is audited transactionally');
insert into public.resume_variants(id,user_id,title,status,application_id,latex_path,created_by,updated_by)
values ('00000000-0000-4000-8000-000000000804','00000000-0000-4000-8000-000000000101','Platform role resume','ready_for_review','00000000-0000-4000-8000-000000000802','workspace/platform/main.tex','agent','agent');
select is((select resume_variant_id from public.applications where id='00000000-0000-4000-8000-000000000802'), '00000000-0000-4000-8000-000000000804'::uuid, 'ready resume variant links back to its application');

select * from finish();
rollback;
