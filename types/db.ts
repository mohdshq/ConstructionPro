/**
 * Database row types — kept in sync with db/schema.sql.
 *
 * This file is hand-written for now to keep the dev loop simple. Once the
 * schema stabilises we can regenerate it with `supabase gen types typescript`
 * to guarantee 1:1 parity with the live database.
 *
 * Naming convention:
 *   <Table>Row     — exactly the shape returned by a SELECT.
 *   <Table>Insert  — fields accepted by an INSERT (server-defaulted columns optional).
 *   <Table>Update  — partial of Insert.
 */

// ----- Enums (mirror the Postgres enums) -------------------------------------
export type MemberRole =
    | 'owner'
    | 'admin'
    | 'pm'
    | 'engineer'
    | 'inspector'
    | 'subcontractor'
    | 'viewer';

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on-hold';

export type ReportType = 'daily' | 'hse' | 'snagging' | 'quick-log';
export type ReportStatus = 'draft' | 'submitted' | 'approved';

export type SnagSeverity = 'high' | 'moderate' | 'low';
export type SnagStatus =
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'defect_remains';

// ----- Common -----------------------------------------------------------------
export interface Timestamps {
    created_at: string;
    updated_at: string;
}

// ----- profiles ---------------------------------------------------------------
export interface ProfileRow extends Timestamps {
    id: string;
    display_name: string;
    avatar_url: string | null;
    locale: string;
}
export type ProfileUpdate = Partial<
    Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>
>;

// ----- organizations ----------------------------------------------------------
export interface OrganizationRow extends Timestamps {
    id: string;
    name: string;
    slug: string;
    created_by: string;
}
export interface OrganizationInsert {
    name: string;
    slug: string;
    created_by: string;
}

// ----- organization_members ---------------------------------------------------
export interface OrganizationMemberRow {
    organization_id: string;
    user_id: string;
    role: MemberRole;
    invited_by: string | null;
    invited_at: string | null;
    accepted_at: string | null;
}

// ----- projects ---------------------------------------------------------------
export interface ProjectRow extends Timestamps {
    id: string;
    organization_id: string;
    name: string;
    location: string;
    client: string;
    description: string | null;
    contract_value: number | null;
    start_date: string | null;
    end_date: string | null;
    project_manager: string | null;
    status: ProjectStatus;
    photo_url: string | null;
    created_by: string;
}
export type ProjectInsert = Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>;
export type ProjectUpdate = Partial<ProjectInsert>;

// ----- reports ----------------------------------------------------------------
export interface ReportRow extends Timestamps {
    id: string;
    organization_id: string;
    project_id: string;
    type: ReportType;
    report_date: string;
    author: string;
    author_user_id: string | null;
    /** JSON blob mirroring the legacy templateData shape. */
    template_data: Record<string, unknown>;
    status: ReportStatus;
}
export type ReportInsert = Omit<ReportRow, 'id' | 'created_at' | 'updated_at'>;
export type ReportUpdate = Partial<ReportInsert>;

// ----- snags ------------------------------------------------------------------
export interface SnagRow extends Timestamps {
    id: string;
    organization_id: string;
    project_id: string;
    report_id: string | null;
    system: string | null;
    asset_name: string | null;
    location: string | null;
    level: string | null;
    room: string | null;
    issue: string;
    recommendation: string | null;
    severity: SnagSeverity;
    contractor: string | null;
    target_date: string | null;
    status: SnagStatus;
    reinspection_notes: string | null;
    photo_url: string | null;
    assigned_to: string | null;
    created_by: string;
}
export type SnagInsert = Omit<SnagRow, 'id' | 'created_at' | 'updated_at'>;
export type SnagUpdate = Partial<SnagInsert>;

// ----- drawings ---------------------------------------------------------------
export interface DrawingFolderRow {
    id: string;
    organization_id: string;
    project_id: string;
    parent_id: string | null;
    name: string;
    created_by: string;
    created_at: string;
}

export type DrawingFileType =
    | 'pdf'
    | 'image'
    | 'cad'
    | 'word'
    | 'excel'
    | 'other';

export interface DrawingRow {
    id: string;
    organization_id: string;
    project_id: string;
    folder_id: string | null;
    name: string;
    file_type: DrawingFileType;
    /** Path inside the `constructionpro` Storage bucket. */
    storage_path: string;
    size_bytes: number;
    author: string;
    author_user_id: string | null;
    uploaded_at: string;
}

// ----- Aggregated Database type used by the supabase client ------------------
export interface Database {
    public: {
        Tables: {
            profiles: { Row: ProfileRow; Insert: ProfileRow; Update: ProfileUpdate };
            organizations: {
                Row: OrganizationRow;
                Insert: OrganizationInsert;
                Update: Partial<OrganizationInsert>;
            };
            organization_members: {
                Row: OrganizationMemberRow;
                Insert: OrganizationMemberRow;
                Update: Partial<OrganizationMemberRow>;
            };
            projects: {
                Row: ProjectRow;
                Insert: ProjectInsert;
                Update: ProjectUpdate;
            };
            reports: {
                Row: ReportRow;
                Insert: ReportInsert;
                Update: ReportUpdate;
            };
            snags: { Row: SnagRow; Insert: SnagInsert; Update: SnagUpdate };
            drawing_folders: {
                Row: DrawingFolderRow;
                Insert: Omit<DrawingFolderRow, 'id' | 'created_at'>;
                Update: Partial<Omit<DrawingFolderRow, 'id'>>;
            };
            drawings: {
                Row: DrawingRow;
                Insert: Omit<DrawingRow, 'id' | 'uploaded_at'>;
                Update: Partial<Omit<DrawingRow, 'id'>>;
            };
        };
    };
}
