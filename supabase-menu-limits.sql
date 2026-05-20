alter table public.menus
add column if not exists queue_limit integer;

comment on column public.menus.queue_limit is
'Maximum number of orders that can include this menu. Null means unlimited.';
