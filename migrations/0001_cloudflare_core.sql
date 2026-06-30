create table if not exists exams (
  id text primary key,
  slug text not null unique,
  title text not null,
  role text not null
);

create table if not exists users (
  clerk_user_id text primary key,
  email text,
  first_name text,
  last_name text,
  image_url text,
  created_at integer not null default (unixepoch() * 1000),
  updated_at integer not null default (unixepoch() * 1000)
);

create table if not exists subscriptions (
  clerk_user_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  status text not null default 'none',
  current_period_end integer,
  updated_at integer not null default (unixepoch() * 1000)
);

create index if not exists subscriptions_by_stripe_customer on subscriptions (stripe_customer_id);
create index if not exists subscriptions_by_stripe_subscription on subscriptions (stripe_subscription_id);

create table if not exists practice_sessions (
  id text primary key,
  clerk_user_id text not null,
  exam_id text not null,
  title text not null,
  total integer not null,
  correct integer not null,
  duration_sec integer not null,
  created_at integer not null
);

create index if not exists practice_sessions_by_user_exam on practice_sessions (clerk_user_id, exam_id, created_at desc);

create table if not exists session_answers (
  id text primary key,
  clerk_user_id text not null,
  session_id text not null,
  exam_id text not null,
  question_id text not null,
  position integer not null,
  selected integer not null,
  correct integer not null
);

create index if not exists session_answers_by_session on session_answers (session_id, position);

create table if not exists question_progress (
  clerk_user_id text not null,
  exam_id text not null,
  question_id text not null,
  status text not null,
  flagged integer not null default 0,
  last_selected integer not null default -1,
  attempts integer not null default 0,
  updated_at integer not null,
  primary key (clerk_user_id, question_id)
);

create index if not exists question_progress_by_user_exam on question_progress (clerk_user_id, exam_id);

create table if not exists question_feedback (
  id text primary key,
  clerk_user_id text,
  exam_id text not null,
  question_id text not null,
  issue_type text not null,
  note text not null,
  selected_answer integer,
  status text not null default 'open',
  created_at integer not null
);

create index if not exists question_feedback_by_exam on question_feedback (exam_id);
create index if not exists question_feedback_by_question on question_feedback (question_id);

create table if not exists uploads (
  id text primary key,
  clerk_user_id text not null,
  key text not null,
  name text not null,
  size integer not null,
  content_type text,
  url text,
  created_at integer not null
);

create index if not exists uploads_by_user on uploads (clerk_user_id, created_at desc);

create table if not exists ai_threads (
  id text primary key,
  clerk_user_id text not null,
  exam_id text,
  question_id text,
  kind text not null,
  title text not null,
  message_count integer not null default 0,
  last_message_at integer,
  summary text,
  created_at integer not null
);

create index if not exists ai_threads_by_user_exam on ai_threads (clerk_user_id, exam_id, last_message_at desc);

create table if not exists ai_messages (
  id text primary key,
  thread_id text not null,
  clerk_user_id text not null,
  role text not null,
  content text not null,
  created_at integer not null
);

create index if not exists ai_messages_by_thread on ai_messages (thread_id, created_at);

create table if not exists ai_usage_events (
  id text primary key,
  clerk_user_id text not null,
  exam_id text,
  thread_id text,
  kind text,
  model text not null,
  prompt_tokens integer not null,
  completion_tokens integer not null,
  estimated_cost_usd real not null,
  billing_period_start integer not null,
  created_at integer not null
);

create index if not exists ai_usage_by_clerk_period on ai_usage_events (clerk_user_id, billing_period_start);

create table if not exists analytics_events (
  id text primary key,
  name text not null,
  clerk_user_id text,
  path text,
  metadata text,
  user_agent text,
  referrer text,
  country text,
  created_at integer not null
);

create index if not exists analytics_events_by_name_time on analytics_events (name, created_at desc);
create index if not exists analytics_events_by_time on analytics_events (created_at desc);
