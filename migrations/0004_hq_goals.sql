create table if not exists hq_goals (
  name text primary key,
  label text not null,
  category text not null,
  description text not null,
  source_table text,
  source_column text,
  match_value text,
  enabled integer not null default 1,
  created_at integer not null default (unixepoch() * 1000),
  updated_at integer not null default (unixepoch() * 1000)
);

create index if not exists hq_goals_by_enabled on hq_goals (enabled, category);

insert or ignore into hq_goals
  (name, label, category, description, source_table, source_column, match_value, enabled)
values
  ('app_opened', 'App opened', 'Acquisition', 'A visitor loaded DrKard.', null, null, null, 1),
  ('signup_started', 'Signup started', 'Activation', 'A visitor started Clerk signup.', null, null, null, 1),
  ('exam_opened', 'Exam opened', 'Activation', 'A user opened an exam bank.', null, null, null, 1),
  ('question_bank_loaded', 'Question bank loaded', 'Learning', 'Questions were loaded from the bank endpoint.', null, null, null, 1),
  ('practice_started', 'Practice started', 'Learning', 'A user started a quiz or practice session.', null, null, null, 1),
  ('practice_session_completed', 'Practice completed', 'Learning', 'A user finished and saved a practice session.', null, null, null, 1),
  ('question_reported', 'Question reported', 'Quality', 'A user reported a content issue.', null, null, null, 1),
  ('upload_completed', 'Upload completed', 'Activation', 'A user uploaded notes, a link, or a file.', null, null, null, 1),
  ('ai_message_sent', 'AI message sent', 'Retention', 'A Pro user sent a message to the AI tutor.', null, null, null, 1),
  ('pricing_opened', 'Pricing opened', 'Revenue', 'A user opened pricing or upgrade UI.', null, null, null, 1),
  ('checkout_initiated', 'Checkout initiated', 'Revenue', 'A user started Stripe checkout.', null, null, null, 1),
  ('subscription_active', 'Subscription active', 'Revenue', 'Stripe marked a subscription active or trialing.', null, null, null, 1);
