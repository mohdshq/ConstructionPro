-- Logs a "joined the project" activity when a non-owner member is added to project_members.
-- Applied manually via Supabase SQL editor. Kept here for version tracking.
create or replace function public.log_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'owner' then
    insert into public.activities (project_id, user_id, action, entity_type, entity_id)
    values (new.project_id, new.user_id, 'joined the project', 'member', new.id);
  end if;
  return new;
end;

$$;

drop trigger if exists trg_log_member_joined on public.project_members;

create trigger trg_log_member_joined
after insert on public.project_members
for each row
execute function public.log_member_joined();
