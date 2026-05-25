import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {
    fetchUserProjects, insertProject as insertProjectRemote, updateProjectRemote, deleteProjectRemote,
    fetchUserReports, insertReport as insertReportRemote, updateReportRemote, deleteReportRemote,
    fetchUserFolders, insertFolder as insertFolderRemote, updateFolderRemote, deleteFolderRemote,
    fetchUserDrawings, insertDrawing as insertDrawingRemote, updateDrawingRemote, deleteDrawingRemote,
    fetchUserProjectMembers, fetchUserActivities, fetchUserCalculations, insertActivity, insertCalculation
} from '../lib/supabaseSync';
import { useAuthStore } from './useAuthStore';

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on-hold';
export type ReportType = 'daily' | 'snagging' | 'hse' | 'quick-log';
export type ReportStatus = 'draft' | 'submitted' | 'approved';

export interface DailyReportData {
    // Top Info Bar
    commencementDate?: string;
    completionDate?: string;
    anticipatedCompletionDate?: string;

    manpowerMainContractor?: string;
    manpowerSubcontractors?: string;
    manpowerOthers?: string;
    manpowerTotal?: string;

    climateHumidity?: string;
    climateVisibility?: string;
    climateTemp?: string;
    climateWindSpeed?: string;

    // Logos (Array of local image URIs)
    logos?: string[];

    // 1. MAIN CONTRACTOR STAFF
    mainContractorStaff?: { id: string; description: string; count: string }[];

    // 2. SUBCONTRACTOR'S STAFF
    subcontractorStaff?: { id: string; name: string; count: string }[];

    // 3. EQUIPMENT
    equipment?: { id: string; description: string; count: string }[];

    // 4. MAIN CONTRACTOR LABOR
    mainContractorLabor?: { id: string; trade: string; inHouse: string; supply: string; total: string }[];

    // 5. SUBCONTRACTOR LABOR
    subcontractorLabor?: { id: string; name: string; count: string }[];

    // 6. Night Shift
    nightShift?: { id: string; trade: string; count: string }[];

    // 7. On-Going Activities
    activitiesProgress?: { id: string; activityName: string; uom: string; totalQty: string; prevQty: string; todayQty: string; balanceQty: string }[];

    // 8. Areas of Concern
    areasOfConcern?: { id: string; location: string; concern: string; action: string }[];

    // Original fallbacks
    activities?: string;
    delays?: string;
    photos?: string[];
}

export interface HSEChecklistItem {
    id: string;
    category: string;
    item: string;
    status: 'Pass' | 'Fail' | 'N/A';
    notes: string;
}

export interface HSEIncident {
    id: string;
    type: 'Near Miss' | 'First Aid' | 'Medical Treatment' | 'Lost Time' | 'Environmental' | 'Other';
    description: string;
    actionTaken: string;
}

export interface HSETraining {
    id: string;
    topic: string;
    trainer: string;
    numberOfParticipants: string;
}

export interface HSEReportData {
    inspectionDate: string;
    inspectorName: string;
    weatherConditions: string;
    totalManHours: string;
    checklists: HSEChecklistItem[];
    incidents: HSEIncident[];
    trainings: HSETraining[];
    generalObservations: string;
    correctiveActions: string;
    photos: string[];
}

export interface Snag {
    id: string;
    system: string; // e.g. 'CIVIL SYSTEM', 'PLUMBING', 'ELECTRICAL'
    assetName: string; // e.g. 'Faucet', 'Wall', 'Floor'
    location: string; // e.g. 'Bathroom', 'Balcony', 'Kitchen'
    level?: string; // Floor Level where the snag is located
    room: string; // Specific room inside the apartment/building
    issue: string;
    recommendation: string;
    severity: 'High' | 'Moderate' | 'Low';
    
    // Management Fields
    contractor: string; // Responsible party
    targetDate: string; // Deadline
    status: 'Pending' | 'In Progress' | 'Completed' | 'Defect Remains';
    
    reinspectionNotes: string;
    photoUri: string;
}

export interface SnaggingReportData {
    // Inspection Details
    inspectionDate: string;
    inspectionCompany: string;
    inspectorName: string;
    officeDetails: string;
    contactDetails: string;
    email: string;

    // Property Details
    propertyType: 'Building' | 'Apartment' | 'Villa' | 'Commercial' | 'Other';
    propertyName: string;
    propertyAddress: string;
    city: string;
    
    // specific Location Details
    buildingName: string;
    floorLevel: string;
    apartmentNumber: string;

    zoning: string;
    constructionType: string;
    propertySize: string;

    // Utilities
    waterProvider: string;
    sanitaryProvider: string;
    electricityProvider: string;

    // Property Photo for Cover
    pcaMainPhotoUri: string;

    // Snags List
}

export interface QuickLogData {
    notes: string;
    photos: { uri: string; caption?: string }[];
    audioUris?: string[];
    location?: string;
}

export interface Report {
    id: string;
    projectId: string;
    type: ReportType;
    date: string; // ISO string
    author: string;
    templateData: string; // JSON string of custom fields based on type
    status: ReportStatus;
    createdAt: string;
    updatedAt: string;
}

export interface DrawingFolder {
    id: string;
    projectId: string;
    name: string;
    parentId?: string; // For nested folders
    createdAt: string;
}

export interface Drawing {
    id: string;
    projectId: string;
    folderId?: string; // Nullable if in root
    name: string;
    type: 'pdf' | 'image' | 'cad' | 'word' | 'excel' | 'other';
    uri: string;
    size: number; // bytes
    uploadedAt: string;
    author: string;
}

export interface Project {
    id: string;
    name: string;
    location: string;
    client: string;
    description?: string;
    contractValue?: string;
    startDate?: string; // ISO string
    endDate?: string;   // ISO string
    projectManager?: string;
    referenceNumber?: string;
    status: ProjectStatus;
    photoUri?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectMember {
    id: string;
    projectId: string;
    userId: string;
    role: 'owner' | 'manager' | 'viewer';
    createdAt: string;
    profile?: {
        full_name?: string;
        avatar_url?: string;
        role?: string;
    };
}

export interface Activity {
    id: string;
    projectId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt: string;
    profile?: {
        full_name?: string;
        avatar_url?: string;
    };
}

export interface Calculation {
    id: string;
    projectId: string;
    userId: string;
    type: string;
    data: any;
    createdAt: string;
}

interface ProjectsState {
    projects: Project[];
    reports: Report[];
    folders: DrawingFolder[];
    drawings: Drawing[];
    members: ProjectMember[];
    activities: Activity[];
    calculations: Calculation[];
    
    // Sync state
    isSyncing: boolean;
    syncError: string | null;
    lastSyncAt: string | null;

    // Project Actions
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateProject: (id: string, project: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    getProject: (id: string) => Project | undefined;

    // Report Actions
    addReport: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateReport: (id: string, report: Partial<Report>) => Promise<void>;
    deleteReport: (id: string) => Promise<void>;
    getReportsForProject: (projectId: string) => Report[];
    getReport: (id: string) => Report | undefined;

    // Folder Actions
    addFolder: (folder: Omit<DrawingFolder, 'id' | 'createdAt'>) => Promise<void>;
    updateFolder: (id: string, folder: Partial<DrawingFolder>) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    getFoldersForProject: (projectId: string) => DrawingFolder[];

    // Drawing Actions
    addDrawing: (drawing: Omit<Drawing, 'id' | 'uploadedAt'>) => Promise<void>;
    updateDrawing: (id: string, drawing: Partial<Drawing>) => Promise<void>;
    deleteDrawing: (id: string) => Promise<void>;
    getDrawingsForProject: (projectId: string) => Drawing[];

    // Phase 4 Actions
    addActivity: (activity: Omit<Activity, 'id' | 'createdAt' | 'profile'>) => Promise<void>;
    addCalculation: (calc: Omit<Calculation, 'id' | 'createdAt'>) => Promise<void>;
    getMembersForProject: (projectId: string) => ProjectMember[];
    getActivitiesForProject: (projectId: string) => Activity[];
    getCalculationsForProject: (projectId: string) => Calculation[];

    // Sync Actions
    initialSync: () => Promise<void>;

    // Realtime internal actions (apply remote changes without pushing back to Supabase)
    _applyRemoteProjectUpsert: (row: any) => void;
    _applyRemoteProjectDelete: (id: string) => void;
    _applyRemoteReportUpsert: (row: any) => void;
    _applyRemoteReportDelete: (id: string) => void;
}

// Helper: Get current user ID (returns null if not authenticated)
function getCurrentUserId(): string | null {
    return useAuthStore.getState().user?.id ?? null;
}

// Helper: Convert Supabase snake_case row to camelCase Project
function mapProjectRow(row: any): Project {
    return {
        id: row.id,
        name: row.name,
        location: row.location || '',
        client: row.client || '',
        description: row.description || undefined,
        contractValue: row.contract_value || undefined,
        startDate: row.start_date || undefined,
        endDate: row.end_date || undefined,
        projectManager: row.project_manager || undefined,
        referenceNumber: row.reference_number || undefined,
        status: row.status || 'active',
        photoUri: row.photo_url || undefined,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
    };
}

function mapReportRow(row: any): Report {
    return {
        id: row.id,
        projectId: row.project_id,
        type: row.type,
        date: row.date,
        author: row.author || '',
        templateData: typeof row.template_data === 'string' ? row.template_data : JSON.stringify(row.template_data),
        status: row.status || 'draft',
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
    };
}

function mapFolderRow(row: any): DrawingFolder {
    return {
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        parentId: row.parent_id || undefined,
        createdAt: row.created_at || new Date().toISOString(),
    };
}

function mapDrawingRow(row: any): Drawing {
    return {
        id: row.id,
        projectId: row.project_id,
        folderId: row.folder_id || undefined,
        name: row.name,
        type: row.type,
        uri: row.file_url,
        size: row.size_bytes || 0,
        uploadedAt: row.uploaded_at || new Date().toISOString(),
        author: row.author || '',
    };
}

function mapMemberRow(row: any): ProjectMember {
    return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at,
        profile: row.profiles,
    };
}

function mapActivityRow(row: any): Activity {
    return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
        profile: row.profiles,
    };
}

function mapCalculationRow(row: any): Calculation {
    return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        type: row.type,
        data: row.data,
        createdAt: row.created_at,
    };
}

export const useProjectsStore = create<ProjectsState>()(
    persist(
        (set, get) => ({
            projects: [],
            reports: [],
            folders: [],
            drawings: [],
            members: [],
            activities: [],
            calculations: [],
            
            isSyncing: false,
            syncError: null,
            lastSyncAt: null,

            // ──────────────────────────────────────────
            // Sync: Pull all data from Supabase
            // ──────────────────────────────────────────
            initialSync: async () => {
                const userId = getCurrentUserId();
                if (!userId) {
                    set({ 
                        projects: [], reports: [], folders: [], drawings: [],
                        members: [], activities: [], calculations: [],
                        isSyncing: false 
                    });
                    return;
                }
                if (get().isSyncing) return;

                set({ isSyncing: true, syncError: null });
                try {
                    // Fetch all core resources concurrently, with fallbacks
                    const results = await Promise.allSettled([
                        fetchUserProjects(userId),
                        fetchUserReports(userId),
                        fetchUserFolders(userId),
                        fetchUserDrawings(userId),
                        fetchUserProjectMembers(userId),
                        fetchUserActivities(userId),
                        fetchUserCalculations(userId),
                    ]);

                    const remoteProjects = results[0].status === 'fulfilled' ? results[0].value.map(mapProjectRow) : get().projects;
                    const remoteReports = results[1].status === 'fulfilled' ? results[1].value.map(mapReportRow) : get().reports;
                    const remoteFolders = results[2].status === 'fulfilled' ? results[2].value.map(mapFolderRow) : get().folders;
                    const remoteDrawings = results[3].status === 'fulfilled' ? results[3].value.map(mapDrawingRow) : get().drawings;
                    const remoteMembers = results[4].status === 'fulfilled' ? results[4].value.map(mapMemberRow) : get().members;
                    const remoteActivities = results[5].status === 'fulfilled' ? results[5].value.map(mapActivityRow) : get().activities;
                    const remoteCalculations = results[6].status === 'fulfilled' ? results[6].value.map(mapCalculationRow) : get().calculations;

                    set({
                        projects: remoteProjects,
                        reports: remoteReports,
                        folders: remoteFolders,
                        drawings: remoteDrawings,
                        members: remoteMembers,
                        activities: remoteActivities,
                        calculations: remoteCalculations,
                        lastSyncAt: new Date().toISOString(),
                    });
                } catch (error: any) {
                    console.error('initialSync error:', error);
                    set({ syncError: error.message || 'Sync failed' });
                } finally {
                    set({ isSyncing: false });
                }
            },

            // ──────────────────────────────────────────
            // Projects
            // ──────────────────────────────────────────

            addProject: async (project) => {
                const userId = getCurrentUserId();
                const now = new Date().toISOString();
                const localId = uuidv4();

                // Optimistic local update
                const newProject: Project = {
                    ...project,
                    id: localId,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({ projects: [...state.projects, newProject] }));

                // Push to Supabase
                if (userId) {
                    try {
                        const remoteProject = await insertProjectRemote({
                            user_id: userId,
                            name: project.name,
                            location: project.location || null,
                            client: project.client || null,
                            description: project.description || null,
                            contract_value: project.contractValue || null,
                            start_date: project.startDate || null,
                            end_date: project.endDate || null,
                            project_manager: project.projectManager || null,
                            reference_number: project.referenceNumber || null,
                            status: project.status || 'active',
                            photo_url: project.photoUri || null,
                        });
                        // Replace local ID with server ID
                        set((state) => ({
                            projects: state.projects.map((p) =>
                                p.id === localId ? mapProjectRow(remoteProject) : p
                            ),
                        }));
                    } catch (error) {
                        console.error('Failed to sync project to Supabase:', error);
                        // Local data preserved — will sync later
                    }
                }
            },

            updateProject: async (id, projectUpdates) => {
                const now = new Date().toISOString();
                
                // Optimistic local update
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, ...projectUpdates, updatedAt: now } : p
                    ),
                }));

                // Push to Supabase
                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        const remoteUpdates: any = {};
                        if (projectUpdates.name !== undefined) remoteUpdates.name = projectUpdates.name;
                        if (projectUpdates.location !== undefined) remoteUpdates.location = projectUpdates.location;
                        if (projectUpdates.client !== undefined) remoteUpdates.client = projectUpdates.client;
                        if (projectUpdates.description !== undefined) remoteUpdates.description = projectUpdates.description;
                        if (projectUpdates.contractValue !== undefined) remoteUpdates.contract_value = projectUpdates.contractValue;
                        if (projectUpdates.startDate !== undefined) remoteUpdates.start_date = projectUpdates.startDate;
                        if (projectUpdates.endDate !== undefined) remoteUpdates.end_date = projectUpdates.endDate;
                        if (projectUpdates.projectManager !== undefined) remoteUpdates.project_manager = projectUpdates.projectManager;
                        if (projectUpdates.referenceNumber !== undefined) remoteUpdates.reference_number = projectUpdates.referenceNumber;
                        if (projectUpdates.status !== undefined) remoteUpdates.status = projectUpdates.status;
                        if (projectUpdates.photoUri !== undefined) remoteUpdates.photo_url = projectUpdates.photoUri;

                        await updateProjectRemote(id, remoteUpdates);
                    } catch (error) {
                        console.error('Failed to sync project update to Supabase:', error);
                    }
                }
            },

            deleteProject: async (id) => {
                // Optimistic local update (cascade delete associated data)
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    reports: state.reports.filter((r) => r.projectId !== id),
                    folders: state.folders.filter((f) => f.projectId !== id),
                    drawings: state.drawings.filter((d) => d.projectId !== id),
                }));

                // Push to Supabase (server cascade will handle related records)
                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        await deleteProjectRemote(id);
                    } catch (error) {
                        console.error('Failed to delete project from Supabase:', error);
                    }
                }
            },

            getProject: (id) => {
                return get().projects.find((p) => p.id === id);
            },

            // ──────────────────────────────────────────
            // Reports
            // ──────────────────────────────────────────

            addReport: async (report) => {
                const userId = getCurrentUserId();
                const now = new Date().toISOString();
                const localId = uuidv4();

                const newReport: Report = {
                    ...report,
                    id: localId,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({ reports: [...state.reports, newReport] }));

                if (userId) {
                    try {
                        // Parse template_data — it's stored as a JSON string locally
                        let templateDataJson: any = {};
                        try {
                            templateDataJson = JSON.parse(report.templateData);
                        } catch {
                            templateDataJson = {};
                        }

                        const remoteReport = await insertReportRemote({
                            project_id: report.projectId,
                            user_id: userId,
                            type: report.type,
                            date: report.date,
                            author: report.author || null,
                            template_data: templateDataJson,
                            status: report.status || 'draft',
                        });
                        set((state) => ({
                            reports: state.reports.map((r) =>
                                r.id === localId ? mapReportRow(remoteReport) : r
                            ),
                        }));
                    } catch (error) {
                        console.error('Failed to sync report to Supabase:', error);
                    }
                }
            },

            updateReport: async (id, reportUpdates) => {
                const now = new Date().toISOString();
                set((state) => ({
                    reports: state.reports.map((r) =>
                        r.id === id ? { ...r, ...reportUpdates, updatedAt: now } : r
                    ),
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        const remoteUpdates: any = {};
                        if (reportUpdates.type !== undefined) remoteUpdates.type = reportUpdates.type;
                        if (reportUpdates.date !== undefined) remoteUpdates.date = reportUpdates.date;
                        if (reportUpdates.author !== undefined) remoteUpdates.author = reportUpdates.author;
                        if (reportUpdates.status !== undefined) remoteUpdates.status = reportUpdates.status;
                        if (reportUpdates.templateData !== undefined) {
                            try {
                                remoteUpdates.template_data = JSON.parse(reportUpdates.templateData);
                            } catch {
                                remoteUpdates.template_data = {};
                            }
                        }

                        await updateReportRemote(id, remoteUpdates);
                    } catch (error) {
                        console.error('Failed to sync report update to Supabase:', error);
                    }
                }
            },

            deleteReport: async (id) => {
                set((state) => ({
                    reports: state.reports.filter((r) => r.id !== id),
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        await deleteReportRemote(id);
                    } catch (error) {
                        console.error('Failed to delete report from Supabase:', error);
                    }
                }
            },

            getReportsForProject: (projectId) => {
                return get().reports.filter((r) => r.projectId === projectId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            },

            getReport: (id) => {
                return get().reports.find((r) => r.id === id);
            },

            // ──────────────────────────────────────────
            // Folders
            // ──────────────────────────────────────────

            addFolder: async (folder) => {
                const userId = getCurrentUserId();
                const now = new Date().toISOString();
                const localId = uuidv4();

                const newFolder: DrawingFolder = {
                    ...folder,
                    id: localId,
                    createdAt: now,
                };
                set((state) => ({ folders: [...state.folders, newFolder] }));

                if (userId) {
                    try {
                        const remoteFolder = await insertFolderRemote({
                            project_id: folder.projectId,
                            user_id: userId,
                            name: folder.name,
                            parent_id: folder.parentId || null,
                        });
                        set((state) => ({
                            folders: state.folders.map((f) =>
                                f.id === localId ? mapFolderRow(remoteFolder) : f
                            ),
                        }));
                    } catch (error) {
                        console.error('Failed to sync folder to Supabase:', error);
                    }
                }
            },

            updateFolder: async (id, updatedFields) => {
                set((state) => ({
                    folders: state.folders.map(f => f.id === id ? { ...f, ...updatedFields } : f)
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        const remoteUpdates: any = {};
                        if (updatedFields.name !== undefined) remoteUpdates.name = updatedFields.name;
                        if (updatedFields.parentId !== undefined) remoteUpdates.parent_id = updatedFields.parentId;
                        await updateFolderRemote(id, remoteUpdates);
                    } catch (error) {
                        console.error('Failed to sync folder update to Supabase:', error);
                    }
                }
            },

            deleteFolder: async (id) => {
                set((state) => ({
                    folders: state.folders.filter((f) => f.id !== id),
                    drawings: state.drawings.filter(d => d.folderId !== id)
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        await deleteFolderRemote(id);
                    } catch (error) {
                        console.error('Failed to delete folder from Supabase:', error);
                    }
                }
            },

            getFoldersForProject: (projectId) => {
                return get().folders.filter((f) => f.projectId === projectId);
            },

            // ──────────────────────────────────────────
            // Drawings
            // ──────────────────────────────────────────

            addDrawing: async (drawing) => {
                const userId = getCurrentUserId();
                const now = new Date().toISOString();
                const localId = uuidv4();

                const newDrawing: Drawing = {
                    ...drawing,
                    id: localId,
                    uploadedAt: now,
                };
                set((state) => ({ drawings: [...state.drawings, newDrawing] }));

                if (userId) {
                    try {
                        const remoteDrawing = await insertDrawingRemote({
                            project_id: drawing.projectId,
                            user_id: userId,
                            folder_id: drawing.folderId || null,
                            name: drawing.name,
                            type: drawing.type || 'other',
                            storage_path: drawing.uri || null,
                            size: drawing.size || 0,
                            author: drawing.author || null,
                        });
                        set((state) => ({
                            drawings: state.drawings.map((d) =>
                                d.id === localId ? mapDrawingRow(remoteDrawing) : d
                            ),
                        }));
                    } catch (error) {
                        console.error('Failed to sync drawing to Supabase:', error);
                    }
                }
            },

            updateDrawing: async (id, updatedFields) => {
                set((state) => ({
                    drawings: state.drawings.map(d => d.id === id ? { ...d, ...updatedFields } : d)
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        const remoteUpdates: any = {};
                        if (updatedFields.name !== undefined) remoteUpdates.name = updatedFields.name;
                        if (updatedFields.folderId !== undefined) remoteUpdates.folder_id = updatedFields.folderId;
                        if (updatedFields.type !== undefined) remoteUpdates.type = updatedFields.type;
                        if (updatedFields.uri !== undefined) remoteUpdates.storage_path = updatedFields.uri;
                        if (updatedFields.size !== undefined) remoteUpdates.size = updatedFields.size;
                        if (updatedFields.author !== undefined) remoteUpdates.author = updatedFields.author;
                        await updateDrawingRemote(id, remoteUpdates);
                    } catch (error) {
                        console.error('Failed to sync drawing update to Supabase:', error);
                    }
                }
            },

            deleteDrawing: async (id) => {
                set((state) => ({
                    drawings: state.drawings.filter((d) => d.id !== id),
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        await deleteDrawingRemote(id);
                    } catch (error) {
                        console.error('Failed to delete drawing from Supabase:', error);
                    }
                }
            },

            getDrawingsForProject: (projectId) => {
                return get().drawings.filter((d) => d.projectId === projectId).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
            },

            addActivity: async (activity) => {
                const userId = getCurrentUserId();
                const now = new Date().toISOString();
                const localId = uuidv4();
                
                const newActivity: Activity = {
                    ...activity,
                    id: localId,
                    createdAt: now,
                };
                
                set(state => ({ activities: [newActivity, ...state.activities] }));
                
                if (userId) {
                    try {
                        const remoteAct = await insertActivity({
                            project_id: activity.projectId,
                            user_id: activity.userId,
                            action: activity.action,
                            entity_type: activity.entityType,
                            entity_id: activity.entityId,
                        });
                        set(state => ({
                            activities: state.activities.map(a => a.id === localId ? mapActivityRow(remoteAct) : a)
                        }));
                    } catch (error) {
                        console.error('Failed to log activity remote:', error);
                    }
                }
            },
            
            addCalculation: async (calc) => {
                const userId = getCurrentUserId();
                const now = new Date().toISOString();
                const localId = uuidv4();
                
                const newCalc: Calculation = {
                    ...calc,
                    id: localId,
                    createdAt: now,
                };
                
                set(state => ({ calculations: [newCalc, ...state.calculations] }));
                
                if (userId) {
                    try {
                        const remoteCalc = await insertCalculation({
                            project_id: calc.projectId,
                            user_id: calc.userId,
                            type: calc.type,
                            data: calc.data,
                        });
                        set(state => ({
                            calculations: state.calculations.map(c => c.id === localId ? mapCalculationRow(remoteCalc) : c)
                        }));
                    } catch (error) {
                        console.error('Failed to save calculation remote:', error);
                    }
                }
            },
            
            getMembersForProject: (projectId) => get().members.filter((m) => m.projectId === projectId),
            getActivitiesForProject: (projectId) => get().activities.filter((a) => a.projectId === projectId),
            getCalculationsForProject: (projectId) => get().calculations.filter((c) => c.projectId === projectId),

            // ──────────────────────────────────────────
            // Realtime: Apply remote changes locally only
            // ──────────────────────────────────────────

            _applyRemoteProjectUpsert: (row) => {
                const mapped = mapProjectRow(row);
                set((state) => {
                    const exists = state.projects.some((p) => p.id === mapped.id);
                    if (exists) {
                        return { projects: state.projects.map((p) => p.id === mapped.id ? mapped : p) };
                    }
                    return { projects: [...state.projects, mapped] };
                });
            },

            _applyRemoteProjectDelete: (id) => {
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    reports: state.reports.filter((r) => r.projectId !== id),
                }));
            },

            _applyRemoteReportUpsert: (row) => {
                const mapped = mapReportRow(row);
                set((state) => {
                    const exists = state.reports.some((r) => r.id === mapped.id);
                    if (exists) {
                        return { reports: state.reports.map((r) => r.id === mapped.id ? mapped : r) };
                    }
                    return { reports: [...state.reports, mapped] };
                });
            },

            _applyRemoteReportDelete: (id) => {
                set((state) => ({
                    reports: state.reports.filter((r) => r.id !== id),
                }));
            },
        }),
        {
            name: 'construction-pro-projects-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
