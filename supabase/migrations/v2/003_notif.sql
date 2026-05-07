create table public.notifications (
  id bigserial not null,
  user_id uuid null,
  type character varying(50) null,
  title character varying(255) not null,
  message text null,
  is_read boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;
