-- Queue retries end in an explicit dead-letter state so exhausted work remains
-- inspectable and recoverable from the web UI.
alter type public.agent_job_status add value if not exists 'dead_letter';
