begin;

create or replace function public.sync_user_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (
    user_id,
    county,
    town,
    area
  )
  values (
    new.id,
    new.county_id,
    new.town_id,
    null
  )
  on conflict (user_id)
  do update
  set
    county = excluded.county,
    town = excluded.town,
    area =
      case
        when public.user_preferences.town = excluded.town then public.user_preferences.area
        else null
      end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

commit;
