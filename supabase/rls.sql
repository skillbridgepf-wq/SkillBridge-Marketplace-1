-- ============================================================
-- SkillBridge — Row Level Security Policies
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CATEGORIES (read-only for everyone)
-- ============================================================
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all"
  ON categories FOR SELECT USING (true);

-- ============================================================
-- PROFILES
-- ============================================================
-- Anyone can view profiles (needed for project/proposal cards)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT USING (true);

-- Users can only insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users cannot delete profiles
-- (no DELETE policy = no delete allowed)

-- ============================================================
-- PROJECTS
-- ============================================================
-- Anyone can view open projects; authenticated users can see all
DROP POLICY IF EXISTS "projects_select_open" ON projects;
CREATE POLICY "projects_select_open"
  ON projects FOR SELECT
  USING (
    status = 'open'
    OR auth.uid() = client_id
    OR auth.uid() IN (
      SELECT freelancer_id FROM proposals
      WHERE proposals.project_id = projects.id
      AND proposals.status = 'accepted'
    )
  );

-- Only authenticated users can post projects
DROP POLICY IF EXISTS "projects_insert_authenticated" ON projects;
CREATE POLICY "projects_insert_authenticated"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = client_id
  );

-- Only project owner can update their project
DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Only project owner can delete their open project
DROP POLICY IF EXISTS "projects_delete_own_open" ON projects;
CREATE POLICY "projects_delete_own_open"
  ON projects FOR DELETE
  USING (
    auth.uid() = client_id
    AND status = 'open'
  );

-- ============================================================
-- PROPOSALS
-- ============================================================
-- Freelancers can see their own proposals
-- Project owners can see proposals for their projects
DROP POLICY IF EXISTS "proposals_select_own_or_owner" ON proposals;
CREATE POLICY "proposals_select_own_or_owner"
  ON proposals FOR SELECT
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() IN (
      SELECT client_id FROM projects
      WHERE projects.id = proposals.project_id
    )
  );

-- Authenticated freelancers can submit proposals to open projects
-- (one proposal per freelancer per project enforced at DB level via unique index)
DROP POLICY IF EXISTS "proposals_insert_freelancer" ON proposals;
CREATE POLICY "proposals_insert_freelancer"
  ON proposals FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = freelancer_id
    -- Must be an open project
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = proposals.project_id
      AND projects.status = 'open'
    )
    -- Cannot propose on own project
    AND NOT EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = proposals.project_id
      AND projects.client_id = auth.uid()
    )
  );

-- Project owner can update proposal status (accept/reject)
-- Freelancer cannot change their own proposal status
DROP POLICY IF EXISTS "proposals_update_owner" ON proposals;
CREATE POLICY "proposals_update_owner"
  ON proposals FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT client_id FROM projects
      WHERE projects.id = proposals.project_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT client_id FROM projects
      WHERE projects.id = proposals.project_id
    )
  );

-- ============================================================
-- UNIQUE CONSTRAINT — one proposal per freelancer per project
-- (Run separately if not already applied)
-- ============================================================
-- ALTER TABLE proposals
--   ADD CONSTRAINT proposals_unique_freelancer_project
--   UNIQUE (project_id, freelancer_id);

-- ============================================================
-- HELPER FUNCTION — auto-reject other proposals when one is accepted
-- ============================================================
CREATE OR REPLACE FUNCTION reject_other_proposals()
RETURNS TRIGGER AS $$
BEGIN
  -- When a proposal is accepted, reject all other pending proposals for the same project
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE proposals
    SET status = 'rejected'
    WHERE project_id = NEW.project_id
      AND id <> NEW.id
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_proposal_accepted ON proposals;
CREATE TRIGGER on_proposal_accepted
  AFTER UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION reject_other_proposals();
