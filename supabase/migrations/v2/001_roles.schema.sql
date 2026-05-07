create table public.roles (
  id bigserial not null,
  name character varying(50) not null,
  created_at timestamp with time zone null default now(),
  constraint roles_pkey primary key (id),
  constraint roles_name_key unique (name)
) TABLESPACE pg_default;