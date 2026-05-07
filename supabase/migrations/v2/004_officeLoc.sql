create table public.office_location_history (
  id serial not null,
  employee_id integer not null,
  office_location_id integer null,
  is_current boolean null default true,
  effective_from date not null,
  effective_to date null,
  created_at timestamp with time zone null default now(),
  constraint office_location_history_pkey primary key (id)
) TABLESPACE pg_default;