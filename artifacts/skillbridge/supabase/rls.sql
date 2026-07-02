-- ============================================================
-- SkillBridge — Row Level Security Policies
-- Run once against your Supabase project (SQL Editor).
-- Safe to re-run: policies use IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: authenticated users can read"  ON public.profiles;
DROP POLICY IF EXISTS "profiles: user can insert own"           ON public.profiles;
DROP POLICY IF EXISTS "profiles: user can update own"           ON public.profiles;

-- Anyone authenticated can read profiles (needed for proposal/project detail views)
CREATE POLICY "profiles: authenticated users can read"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only insert their own profile row
CREATE POLICY "profiles: user can insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles: user can update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- projects
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects: anyone can read"           ON public.projects;
DROP POLICY IF EXISTS "projects: authenticated can insert"  ON public.projects;
DROP POLICY IF EXISTS "projects: owner can update"          ON public.projects;
DROP POLICY IF EXISTS "projects: owner can delete"          ON public.projects;

-- Public read for all projects
CREATE POLICY "projects: anyone can read"
  ON public.projects FOR SELECT
  USING (true);

-- Only authenticated users can post projects (client_id must match caller)
CREATE POLICY "projects: authenticated can insert"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = client_id AND auth.role() = 'authenticated');

-- Only the project owner can update — status transitions enforced by trigger below
CREATE POLICY "projects: owner can update"
  ON public.projects FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Only the project owner can hard-delete their project
CREATE POLICY "projects: owner can delete"
  ON public.projects FOR DELETE
  USING (auth.uid() = client_id);

-- ─────────────────────────────────────────────────────────────
-- proposals
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "proposals: freelancer or project owner can read"  ON public.proposals;
DROP POLICY IF EXISTS "proposals: freelancer can insert"                 ON public.proposals;
DROP POLICY IF EXISTS "proposals: project owner can update status"       ON public.proposals;

-- Freelancer sees their own proposals; project owner sees all proposals for their projects
CREATE POLICY "proposals: freelancer or project owner can read"
  ON public.proposals FOR SELECT
  USING (
    auth.uid() = freelancer_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = proposals.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- Only authenticated freelancers can submit a proposal on someone else's project
-- One proposal per (freelancer, project) enforced by unique index below
CREATE POLICY "proposals: freelancer can insert"
  ON public.proposals FOR INSERT
  WITH CHECK (
    auth.uid() = freelancer_id
    AND auth.role() = 'authenticated'
    -- Cannot propose on your own project
    AND NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = proposals.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- Status updates come from the accept_proposal() RPC (SECURITY DEFINER).
-- No direct UPDATE allowed for proposal rows — status transitions must use the RPC.
-- This prevents both unauthorized changes AND column-level tampering.
-- (We allow owner updates as a fallback for reject, but restrict via trigger.)
CREATE POLICY "proposals: project owner can update status"
  ON public.proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = proposals.project_id
        AND projects.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = proposals.project_id
        AND projects.client_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "categories: anyone can read" ON public.categories;

CREATE POLICY "categories: anyone can read"
  ON public.categories FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- Constraint: only one accepted proposal per project (prevents race condition)
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_proposals_one_accepted_per_project
  ON public.proposals (project_id)
  WHERE status = 'accepted';

-- Constraint: one proposal per (freelancer, project)
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_proposals_unique_per_freelancer_project
  ON public.proposals (project_id, freelancer_id);

-- ─────────────────────────────────────────────────────────────
-- Trigger: protect immutable proposal columns on update
-- Only `status` may change after insert; all other fields are locked.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_proposal_immutable_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.project_id    <> OLD.project_id    THEN RAISE EXCEPTION 'project_id is immutable';    END IF;
  IF NEW.freelancer_id <> OLD.freelancer_id THEN RAISE EXCEPTION 'freelancer_id is immutable'; END IF;
  IF NEW.cover_letter  <> OLD.cover_letter  THEN RAISE EXCEPTION 'cover_letter is immutable';  END IF;
  -- Allow status transitions: pending→accepted, pending→rejected only
  IF OLD.status <> 'pending' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'cannot change status once it is %', OLD.status;
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'invalid proposal status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_proposal_immutable ON public.proposals;
CREATE TRIGGER trg_protect_proposal_immutable
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_proposal_immutable_columns();

-- ─────────────────────────────────────────────────────────────
-- Trigger: auto-reject OTHER pending proposals when one is accepted
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_other_proposals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE public.proposals
    SET status = 'rejected'
    WHERE project_id = NEW.project_id
      AND id <> NEW.id
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_other_proposals ON public.proposals;
CREATE TRIGGER trg_reject_other_proposals
  AFTER UPDATE OF status ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_other_proposals();

-- ─────────────────────────────────────────────────────────────
-- Trigger: enforce project status lifecycle transitions
-- open -> in_progress (requires accepted proposal)
-- in_progress -> completed
-- No other transitions allowed.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_project_status_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only validate when status changes
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- open → in_progress: must have exactly one accepted proposal
  IF OLD.status = 'open' AND NEW.status = 'in_progress' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.proposals
      WHERE project_id = NEW.id AND status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Cannot move project to in_progress without an accepted proposal';
    END IF;

  -- in_progress → completed: allowed
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    NULL; -- OK

  -- All other transitions are forbidden
  ELSE
    RAISE EXCEPTION 'Invalid project status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_status_lifecycle ON public.projects;
CREATE TRIGGER trg_project_status_lifecycle
  BEFORE UPDATE OF status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_project_status_lifecycle();

-- ─────────────────────────────────────────────────────────────
-- Trigger: auto-create profile on user signup
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_freelancer, is_client)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    true,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Trigger: keep proposals_count in sync
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_proposals_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects SET proposals_count = proposals_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects SET proposals_count = GREATEST(proposals_count - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_proposals_count ON public.proposals;
CREATE TRIGGER trg_sync_proposals_count
  AFTER INSERT OR DELETE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_proposals_count();
