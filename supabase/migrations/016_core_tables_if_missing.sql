-- Core tables: posts, bookings, messages
-- Idempotent — safe to run on both fresh and existing databases.
-- All ALTER TABLE ADD COLUMN IF NOT EXISTS operations in BASELINE_PRODUCTION.sql
-- remain necessary for databases created before this migration existed.

BEGIN;

-- ─── posts ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.posts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  category    text,
  price       integer,
  location    text,
  status      text        NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'closed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id     ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status      ON public.posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at  ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category    ON public.posts (category);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_open"   ON public.posts;
DROP POLICY IF EXISTS "posts_insert_own"    ON public.posts;
DROP POLICY IF EXISTS "posts_update_own"    ON public.posts;
DROP POLICY IF EXISTS "posts_select_own"    ON public.posts;

-- Anyone (incl. anonymous) can read open posts
CREATE POLICY "posts_select_open"
  ON public.posts FOR SELECT
  USING (status = 'open' OR auth.uid() = user_id);

-- Owner can insert, update, and read their own posts regardless of status
CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── bookings ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bookings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  poster_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helper_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  message        text,
  post_id        uuid        REFERENCES public.posts(id) ON DELETE SET NULL,
  scheduled_date date,
  budget         integer
);

CREATE INDEX IF NOT EXISTS idx_bookings_poster_id   ON public.bookings (poster_id);
CREATE INDEX IF NOT EXISTS idx_bookings_helper_id   ON public.bookings (helper_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_post_id     ON public.bookings (post_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at  ON public.bookings (created_at DESC);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own"         ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_participant"  ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_participant"  ON public.bookings;

CREATE POLICY "bookings_select_own"
  ON public.bookings FOR SELECT
  USING (auth.uid() = poster_id OR auth.uid() = helper_id);

CREATE POLICY "bookings_insert_participant"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = poster_id OR auth.uid() = helper_id);

CREATE POLICY "bookings_update_participant"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = poster_id OR auth.uid() = helper_id)
  WITH CHECK (auth.uid() = poster_id OR auth.uid() = helper_id);

-- ─── messages ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  booking_id  uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text        NOT NULL,
  read_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id  ON public.messages (booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id   ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at  ON public.messages (created_at ASC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant"  ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant"  ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender"       ON public.messages;

-- Both participants of a booking can read and send messages in that thread
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.poster_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.poster_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );

-- Sender can mark their own messages as read (update read_at)
CREATE POLICY "messages_update_sender"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Allow the other participant to mark messages as read
DROP POLICY IF EXISTS "messages_update_read_participant" ON public.messages;
CREATE POLICY "messages_update_read_participant"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.poster_id = auth.uid() OR b.helper_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.poster_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );

-- ─── unread message count (used by Navbar badge) ──────────────────────────────

CREATE OR REPLACE FUNCTION public.unread_message_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.messages m
  JOIN public.bookings b ON b.id = m.booking_id
  WHERE (b.poster_id = p_user_id OR b.helper_id = p_user_id)
    AND m.sender_id <> p_user_id
    AND m.read_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.unread_message_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unread_message_count(uuid) TO authenticated;

COMMIT;
