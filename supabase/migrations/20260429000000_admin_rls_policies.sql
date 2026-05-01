-- Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Mark the existing admin user
-- Admin UUID matches the hardcoded ADMIN_ID in the frontend
UPDATE public.profiles
SET is_admin = true
WHERE id = 'bb2569f9-7fb0-485d-b728-eff242861852';

-- SECURITY DEFINER: bypasses RLS when checking the caller's own admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Films: admin-only write policies
CREATE POLICY "Admins can insert films"
  ON public.films FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update films"
  ON public.films FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete films"
  ON public.films FOR DELETE
  USING (public.is_admin());

-- Prevent privilege escalation: block non-admins from self-granting is_admin
-- Replace the original open UPDATE policy with one that locks the is_admin column
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- is_admin must stay unchanged, unless the caller is already an admin
      is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
      OR public.is_admin()
    )
  );
