// ────────────────────────────────────────────────────────────────────────────
// Supabase Database type — typed for createClient<Database>
// ────────────────────────────────────────────────────────────────────────────

// Concrete column-only row types (no join relations)
export interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  location: string | null;
  is_freelancer: boolean;
  is_client: boolean;
  website: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: 'fixed' | 'hourly';
  skills_required: string[] | null;
  experience_level: 'beginner' | 'intermediate' | 'expert';
  is_remote: boolean;
  status: 'open' | 'in_progress' | 'completed';
  client_id: string;
  deadline: string | null;
  created_at: string;
  featured: boolean;
  proposals_count: number;
}

export interface ProposalRow {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string;
  proposed_rate: number | null;
  estimated_duration: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

// Insert types (fields that callers supply; omit server-generated fields)
export type ProfileInsert = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  hourly_rate?: number | null;
  location?: string | null;
  is_freelancer?: boolean;
  is_client?: boolean;
  website?: string | null;
};

export type ProjectInsert = {
  title: string;
  description: string;
  category: string;
  budget_type: 'fixed' | 'hourly';
  budget_min?: number | null;
  budget_max?: number | null;
  skills_required?: string[] | null;
  experience_level: 'beginner' | 'intermediate' | 'expert';
  is_remote?: boolean;
  status?: 'open' | 'in_progress' | 'completed';
  client_id: string;
  deadline?: string | null;
  featured?: boolean;
  proposals_count?: number;
};

export type ProposalInsert = {
  project_id: string;
  freelancer_id: string;
  cover_letter: string;
  proposed_rate?: number | null;
  estimated_duration?: string | null;
  status?: 'pending' | 'accepted' | 'rejected';
};

export type ProjectUpdate = Partial<Omit<ProjectRow, 'id' | 'created_at' | 'client_id'>>;
export type ProposalUpdate = Partial<Pick<ProposalRow, 'status'>>;
export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at'>>;

// ────────────────────────────────────────────────────────────────────────────
// Supabase client generic — uses explicit Insert types to avoid never[] issue
// ────────────────────────────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [];
      };
      proposals: {
        Row: ProposalRow;
        Insert: ProposalInsert;
        Update: ProposalUpdate;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Omit<CategoryRow, 'id'>;
        Update: Partial<Omit<CategoryRow, 'id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ────────────────────────────────────────────────────────────────────────────
// Application-level interfaces — include join relations, used in UI
// ────────────────────────────────────────────────────────────────────────────

export interface Profile extends ProfileRow {}

export interface Project extends ProjectRow {
  profiles?: Profile; // populated by .select('*, profiles(*)')
}

export interface Proposal extends ProposalRow {
  profiles?: Profile;
  projects?: Project;
}

export interface Category extends CategoryRow {
  project_count?: number;
}

// Contract = an accepted proposal with related project and freelancer info
// No separate DB table needed — it IS the accepted proposal
export interface Contract extends ProposalRow {
  status: 'accepted'; // narrowed from Proposal
  profiles?: Profile; // freelancer
  projects?: Project; // the project
}
