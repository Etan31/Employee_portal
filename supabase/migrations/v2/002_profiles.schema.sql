create table public.profiles (
  id uuid not null,
  email character varying(150) not null,
  first_name character varying(100) null,
  last_name character varying(100) null,
  role_id bigint null,
  avatar_url text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profiles_role_id_fkey foreign KEY (role_id) references roles (id)
) TABLESPACE pg_default;
