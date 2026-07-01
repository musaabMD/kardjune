create table if not exists lst_tasks (
  id text primary key,
  title text not null,
  type text not null,
  status text not null,
  description text not null default '',
  subtasks text not null default '[]',
  tags text not null default '[]',
  done_at integer,
  cloudflare_url text not null default '',
  public_url text not null default '',
  location_url text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at integer not null default (unixepoch() * 1000),
  updated_at integer not null default (unixepoch() * 1000)
);

create index if not exists lst_tasks_by_type_status on lst_tasks (type, status, sort_order);
create index if not exists lst_tasks_by_status on lst_tasks (status, sort_order);
