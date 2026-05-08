-- Allow public (anonymous + authenticated) read access to helper profiles.
-- Without this policy, the /taskers listing returns 0 real helpers for
-- all unauthenticated visitors and for posters (who can only see their own row).
--
-- Sensitive columns (phone, notifications, verification_doc_url, etc.) are
-- still only writable by the owner via the existing profiles_update_own policy.
-- SELECT for public use is acceptable for marketplace helper profiles.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_helpers_public" ON public.profiles;

CREATE POLICY "profiles_select_helpers_public"
  ON public.profiles FOR SELECT
  USING (
    role = 'helper'
    AND deleted_at IS NULL
  );

-- Also allow posters to read their own profile (login/dashboard needs it)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
