import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {
    fetchUserProjects,
    fetchUserReports,
    fetchUserFolders,
    fetchUserDrawings, uploadDrawingFile, deleteStorageFile,
    fetchUserCalculations
} from '../lib/supabaseSync';
import { useAuthStore } from './useAuthStore';
import { powersync } from '@/lib/powersync/system';

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on-hold';
export type ReportType = 'daily' | 'snagging' | 'hse' | 'quick-log';
export type ReportStatus = 'draft' | 'submitted' | 'approved';

export interface ManpowerRow {
    id: string;
    company: string;          // "Main Contractor" or a subcontractor name
    isMainContractor: boolean;
    category: 'staff' | 'labor';
    trade: string;            // from PRESET_TRADES or custom
    shift: 'day' | 'night';
    inHouse: number;          // used only when isMainContractor
    supply: number;           // used only when isMainContractor
    count: number;            // used when !isMainContractor; for main contractor = inHouse + supply
}

export const PRESET_STAFF_ROLES = ['Project Manager','Construction Manager','Site Engineer','Foreman','Safety Officer','Surveyor','QA/QC Engineer','Document Controller','Other'] as const;
export const PRESET_LABOR_TRADES = ['Mason','Carpenter','Steel Fixer','Electrician','Plumber','HVAC Technician','Painter','Welder','Helper / Laborer','Scaffolder','Tiler','Equipment Operator','Driver','Other'] as const;

export const PRESET_TRADES = [
    'Mason', 'Carpenter', 'Steel Fixer', 'Electrician', 'Plumber',
    'HVAC Technician', 'Painter', 'Welder', 'Helper / Laborer',
    'Foreman', 'Site Engineer', 'Safety Officer', 'Surveyor',
    'Equipment Operator', 'Driver', 'Scaffolder', 'Tiler', 'Other',
] as const;

export interface EquipmentRow {
  id: string;
  description: string;    // equipment / vehicle name
  count: string;
  status?: 'working' | 'idle';
}

export interface ActivityRow {
  id: string;
  activityName: string;
  location: string;
  uom: string;            // unit of measure
  totalQty: string;
  prevQty: string;
  todayQty: string;
  balanceQty: string;     // auto: totalQty - (prevQty + todayQty)
  percentComplete: string;// auto: (prevQty + todayQty) / totalQty * 100
}

export interface MaterialRow {
  id: string;
  material: string;
  quantity: string;
  supplier: string;
}

export interface ConcernRow {
  id: string;
  location: string;
  concern: string;
  action: string;
  severity?: 'Low' | 'Moderate' | 'High';
}

export interface DailyReportData {
  // Section 0 — Header / Meta (project-fixed fields preloaded, but stored on report for snapshot)
  projectName: string;
  reportNumber: string;
  preparedBy: string;
  reportDate: string;
  startDate: string;              // preloaded from project
  forecastCompletionDate: string;// editable per report
  employerLogo?: string;         // preloaded from project
  consultantLogo?: string;       // preloaded from project
  contractorLogos?: string[];    // preloaded from project

  // Weather
  climateConditions?: string;

  // Section 1 — Manpower (unified)
  manpower?: ManpowerRow[];

  // Section 3 — Activities
  activities: ActivityRow[];

  // Section 4 — Materials
  materials: MaterialRow[];

  // Section 6 — Site Instructions / Notes
  siteNotes?: string;

  // Section 8 — AI Summary
  aiSummary?: string;

  // Header / meta
  logos?: string[];
  commencementDate?: string;
  completionDate?: string;
  anticipatedCompletionDate?: string;

  // Weather
  climateHumidity?: string;
  climateVisibility?: string;
  climateTemp?: string;
  climateWindSpeed?: string;

  // Manpower summary (kept as strings to match form inputs)
  manpowerMainContractor?: string;
  manpowerSubcontractors?: string;
  manpowerOthers?: string;
  manpowerTotal?: string;

  // Itemized arrays (current model — to be replaced in Phase B)
  mainContractorStaff?: { id: string; description: string; count: string }[];
  subcontractorStaff?: { id: string; name: string; count: string }[];
  mainContractorLabor?: { id: string; trade: string; inHouse: string; supply: string; total: string }[];
  subcontractorLabor?: { id: string; name: string; count: string }[];
  nightShift?: { id: string; trade: string; count: string }[];
  equipment?: { id: string; description: string; count: string }[];
  activitiesProgress?: { id: string; activityName: string; uom: string; totalQty: string; prevQty: string; todayQty: string; balanceQty: string }[];
  areasOfConcern?: { id: string; location: string; concern: string; action: string }[];
  delays?: { id: string; startTime?: string; endTime?: string; cause: string; description: string; affectedActivity?: string }[];

  // Photos & section control
  photos?: any[];
  hiddenSections?: string[];
  transcript?: string;
}

export const DAILY_SECTIONS = [
  { key: 'header', label: 'Header & Weather' },
  { key: 'manpower', label: 'Manpower' },
  { key: 'equipment', label: 'Equipment & Plant' },
  { key: 'activities', label: 'Work Activities' },
  { key: 'materials', label: 'Materials Received' },
  { key: 'concerns', label: 'Areas of Concern' },
  { key: 'delays', label: 'Delays / Disruptions' },
  { key: 'notes', label: 'Site Instructions / Notes' },
  { key: 'photos', label: 'Photos' },
  { key: 'summary', label: 'AI Executive Summary' },
] as const;

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
    syncStatus?: 'synced' | 'pending';
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

export interface Building {
  id: string;            // stable uuid
  code: string;          // short user prefix, e.g. "A", "T1" — may be empty
  name?: string;         // optional label
  floorSpec?: string;    // raw descriptor as typed, e.g. "3B+G+26+R" — informational only, NEVER parsed for tower count
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
    employerLogo?: string;
    consultantLogo?: string;
    contractorLogos?: string[];
    mainContractorName?: string;
    knownCompanies?: string[];
    knownRooms?: string[];
    buildings?: Building[];
    snagCounter?: number;
    createdAt: string;
    updatedAt: string;
    syncStatus?: 'synced' | 'pending';
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

export interface ProjectSnag {
    id: string;
    projectId: string;
    seq: number;
    buildingId?: string;
    floor?: number;
    flat?: number;
    areaType: 'unit' | 'elevation' | 'parking' | 'landscape' | 'roof' | 'mep' | 'common';
    severity: 'critical' | 'major' | 'minor' | 'cosmetic';
    trade?: string;
    room?: string;
    description: string;
    photos: string[];   // HARD max 2: [context, detail], base64
    status: 'open' | 'in_progress' | 'closed';
    legacyCode?: string;
    createdAt: string;
}

interface ProjectsState {
    projects: Project[];
    reports: Report[];
    folders: DrawingFolder[];
    drawings: Drawing[];
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
    addKnownRoom: (projectId: string, room: string) => Promise<'added' | 'exists' | 'error'>;
    addKnownCompany: (projectId: string, company: string) => Promise<'added' | 'exists' | 'error'>;

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
    getCalculationsForProject: (projectId: string) => Calculation[];

    // Snags (Phase S2)
    addSnag: (snag: Omit<ProjectSnag, 'id' | 'seq' | 'createdAt'>) => Promise<number | undefined>;
    updateSnag: (id: string, snag: Partial<ProjectSnag>) => Promise<void>;
    deleteSnag: (id: string) => Promise<void>;

    // Sync Actions
    initialSync: () => Promise<void>;

}

// Helper: Get current user ID (returns null if not authenticated)
function getCurrentUserId(): string | null {
    return useAuthStore.getState().user?.id ?? null;
}

// Helper: Convert Supabase snake_case row to camelCase Project
function mapProjectRow(row: any): Project {
    let contractorLogosParsed = [];
    try {
        contractorLogosParsed = row.contractor_logos ? JSON.parse(row.contractor_logos) : [];
    } catch (e) {
        contractorLogosParsed = [];
    }

    let knownCompaniesParsed: string[] = [];
    try {
        knownCompaniesParsed = JSON.parse(row.known_companies || '[]');
    } catch (e) {
        knownCompaniesParsed = [];
    }

    let knownRoomsParsed: string[] = [];
    try {
        knownRoomsParsed = JSON.parse(row.known_rooms || '[]');
    } catch (e) {
        knownRoomsParsed = [];
    }

    let buildingsParsed: Building[] = [];
    try {
        buildingsParsed = JSON.parse(row.buildings || '[]');
    } catch (e) {
        buildingsParsed = [];
    }

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
        employerLogo: row.employer_logo || undefined,
        consultantLogo: row.consultant_logo || undefined,
        contractorLogos: contractorLogosParsed,
        mainContractorName: row.main_contractor_name || undefined,
        knownCompanies: knownCompaniesParsed,
        knownRooms: knownRoomsParsed,
        buildings: buildingsParsed,
        snagCounter: row.snag_counter || 0,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
        syncStatus: 'synced',
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
        syncStatus: 'synced',
    };
}

function reconcile<T extends { id: string; syncStatus?: 'synced' | 'pending' }>(
    serverRecords: T[],
    localRecords: T[]
): T[] {
    const serverIds = new Set(serverRecords.map(r => r.id));
    const pendingLocalRecords = localRecords.filter(r => r.syncStatus === 'pending' && !serverIds.has(r.id));
    return [...serverRecords, ...pendingLocalRecords];
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
        uri: row.storage_path,
        size: row.size || 0,
        uploadedAt: row.uploaded_at || new Date().toISOString(),
        author: row.author || '',
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
                        calculations: [],
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
                        fetchUserCalculations(userId),
                    ]);

                    const remoteProjects = results[0].status === 'fulfilled' ? reconcile(results[0].value.map(mapProjectRow), get().projects) : get().projects;
                    const remoteReports = results[1].status === 'fulfilled' ? reconcile(results[1].value.map(mapReportRow), get().reports) : get().reports;
                    const remoteFolders = results[2].status === 'fulfilled' ? results[2].value.map(mapFolderRow) : get().folders;
                    const remoteDrawings = results[3].status === 'fulfilled' ? results[3].value.map(mapDrawingRow) : get().drawings;
                    const remoteCalculations = results[4].status === 'fulfilled' ? results[4].value.map(mapCalculationRow) : get().calculations;

                    set({
                        projects: remoteProjects,
                        reports: remoteReports,
                        folders: remoteFolders,
                        drawings: remoteDrawings,
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

                // Optimistic local Zustand update (dashboard reads this)
                const newProject: Project = {
                    ...project,
                    id: localId,
                    createdAt: now,
                    updatedAt: now,
                    syncStatus: 'pending',
                };
                set((state) => ({ projects: [...state.projects, newProject] }));

                if (!userId) return;

                // Write to PowerSync local SQLite; uploadData() pushes to Supabase.
                try {
                    await powersync.execute(
                        `INSERT OR REPLACE INTO projects (
                            id, user_id, name, location, client, description, contract_value,
                            start_date, end_date, project_manager, reference_number, status,
                            photo_url, employer_logo, consultant_logo, contractor_logos, main_contractor_name, known_companies, known_rooms, buildings, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            localId, userId, project.name, project.location || null, project.client || null,
                            project.description || null, project.contractValue || null,
                            project.startDate || null, project.endDate || null,
                            project.projectManager || null, project.referenceNumber || null,
                            project.status || 'active', project.photoUri || null,
                            project.employerLogo || null, project.consultantLogo || null,
                            project.contractorLogos ? JSON.stringify(project.contractorLogos) : null,
                            project.mainContractorName || null,
                            project.knownCompanies ? JSON.stringify(project.knownCompanies) : null,
                            project.knownRooms ? JSON.stringify(project.knownRooms) : null,
                            project.buildings ? JSON.stringify(project.buildings) : null,
                            now, now,
                        ]
                    );
                } catch (error) {
                    console.error('Failed to write project to PowerSync:', error);
                }
            },

            updateProject: async (id, projectUpdates) => {
                const now = new Date().toISOString();
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, ...projectUpdates, updatedAt: now, syncStatus: 'pending' } : p
                    ),
                }));

                try {
                    const cols: string[] = [];
                    const vals: any[] = [];
                    const add = (col: string, val: any) => { cols.push(`${col} = ?`); vals.push(val); };
                    if (projectUpdates.name !== undefined) add('name', projectUpdates.name);
                    if (projectUpdates.location !== undefined) add('location', projectUpdates.location);
                    if (projectUpdates.client !== undefined) add('client', projectUpdates.client);
                    if (projectUpdates.description !== undefined) add('description', projectUpdates.description);
                    if (projectUpdates.contractValue !== undefined) add('contract_value', projectUpdates.contractValue);
                    if (projectUpdates.startDate !== undefined) add('start_date', projectUpdates.startDate);
                    if (projectUpdates.endDate !== undefined) add('end_date', projectUpdates.endDate);
                    if (projectUpdates.projectManager !== undefined) add('project_manager', projectUpdates.projectManager);
                    if (projectUpdates.referenceNumber !== undefined) add('reference_number', projectUpdates.referenceNumber);
                    if (projectUpdates.status !== undefined) add('status', projectUpdates.status);
                    if (projectUpdates.photoUri !== undefined) add('photo_url', projectUpdates.photoUri);
                    if (projectUpdates.employerLogo !== undefined) add('employer_logo', projectUpdates.employerLogo);
                    if (projectUpdates.consultantLogo !== undefined) add('consultant_logo', projectUpdates.consultantLogo);
                    if (projectUpdates.contractorLogos !== undefined) add('contractor_logos', projectUpdates.contractorLogos ? JSON.stringify(projectUpdates.contractorLogos) : null);
                    if (projectUpdates.mainContractorName !== undefined) add('main_contractor_name', projectUpdates.mainContractorName || null);
                    if (projectUpdates.knownCompanies !== undefined) add('known_companies', projectUpdates.knownCompanies ? JSON.stringify(projectUpdates.knownCompanies) : null);
                    if (projectUpdates.knownRooms !== undefined) add('known_rooms', projectUpdates.knownRooms ? JSON.stringify(projectUpdates.knownRooms) : null);
                    if (projectUpdates.buildings !== undefined) add('buildings', projectUpdates.buildings ? JSON.stringify(projectUpdates.buildings) : null);
                    add('updated_at', now);

                    vals.push(id);
                    await powersync.execute(`UPDATE projects SET ${cols.join(', ')} WHERE id = ?`, vals);

                    set((state) => ({
                        projects: state.projects.map((p) =>
                            p.id === id ? { ...p, syncStatus: 'synced' } : p
                        ),
                    }));
                } catch (error) {
                    console.error('Failed to update project in PowerSync:', error);
                }
            },

            addKnownRoom: async (projectId: string, room: string) => {
                const { projects, updateProject } = get();
                const project = projects.find(p => p.id === projectId);
                if (!project) return 'error';

                // We need to import ROOM_PRESETS and namesMatch, normalizeName
                // But since we can't easily import them at the top without replacing the whole file,
                // we can dynamically require or just import them at the top. I'll add the imports at the top next.
                // For now, assume normalizeName, namesMatch, ROOM_PRESETS are available.
                // Actually, I must add imports at the top. I'll do that in another chunk.
                const { normalizeName, namesMatch } = require('../lib/units/normalizeName');
                const { ROOM_PRESETS } = require('../lib/units/roomPresets');

                const normalizedRoom = normalizeName(room);
                const existingKnownRooms = project.knownRooms || [];
                
                const exists = ROOM_PRESETS.some((p: string) => namesMatch(p, normalizedRoom)) ||
                               existingKnownRooms.some(r => namesMatch(r, normalizedRoom));
                
                if (exists) return 'exists';

                const newKnownRooms = [...existingKnownRooms, normalizedRoom];
                await updateProject(projectId, { knownRooms: newKnownRooms });
                return 'added';
            },

            addKnownCompany: async (projectId: string, company: string) => {
                const { projects, updateProject } = get();
                const project = projects.find(p => p.id === projectId);
                if (!project) return 'error';

                const { normalizeCompanyName, companyNamesMatch } = require('../lib/units/normalizeName');
                const normalizedCompany = normalizeCompanyName(company);
                const existingKnownCompanies = project.knownCompanies || [];

                const isMain = companyNamesMatch("Main Contractor", normalizedCompany);
                const exists = isMain || existingKnownCompanies.some(c => companyNamesMatch(c, normalizedCompany));
                
                if (exists) return 'exists';

                const newKnownCompanies = [...existingKnownCompanies, normalizedCompany];
                await updateProject(projectId, { knownCompanies: newKnownCompanies });
                return 'added';
            },

            deleteProject: async (id) => {
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    reports: state.reports.filter((r) => r.projectId !== id),
                    folders: state.folders.filter((f) => f.projectId !== id),
                    drawings: state.drawings.filter((d) => d.projectId !== id),
                }));

                try {
                    await powersync.execute(`DELETE FROM projects WHERE id = ?`, [id]);
                } catch (error) {
                    console.error('Failed to delete project from PowerSync:', error);
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
                    syncStatus: 'pending',
                };
                set((state) => ({ reports: [...state.reports, newReport] }));

                if (userId) {
                    try {
                        await powersync.execute(
                          `INSERT INTO reports
                            (id, project_id, user_id, type, date, author, template_data, status, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                          [
                            localId, report.projectId, userId, report.type, report.date,
                            report.author || null, report.templateData, report.status || 'draft',
                            now, now,
                          ]
                        );
                        set((state) => ({
                          reports: state.reports.map((r) =>
                            r.id === localId ? { ...r, syncStatus: 'synced' } : r
                          ),
                        }));

                        await get().addActivity({
                            projectId: report.projectId,
                            userId,
                            action: 'created a new ' + report.type + ' report',
                            entityType: 'report',
                            entityId: localId,
                        });
                    } catch (error) {
                        console.error('Failed to write report to PowerSync:', error);
                    }
                }
            },

            updateReport: async (id, reportUpdates) => {
                const now = new Date().toISOString();
                // M3.3: pending flag set on edit; M3.3b reconcile preserves unsynced CREATES only — offline EDIT conflict resolution deferred to M4 (PowerSync).
                set((state) => ({
                    reports: state.reports.map((r) =>
                        r.id === id ? { ...r, ...reportUpdates, updatedAt: now, syncStatus: 'pending' } : r
                    ),
                }));

                try {
                    const cols: string[] = [];
                    const vals: any[] = [];
                    const add = (col: string, val: any) => { cols.push(`${col} = ?`); vals.push(val); };
                    if (reportUpdates.type !== undefined) add('type', reportUpdates.type);
                    if (reportUpdates.date !== undefined) add('date', reportUpdates.date);
                    if (reportUpdates.author !== undefined) add('author', reportUpdates.author);
                    if (reportUpdates.status !== undefined) add('status', reportUpdates.status);
                    if (reportUpdates.templateData !== undefined) add('template_data', reportUpdates.templateData);
                    add('updated_at', now);

                    vals.push(id);
                    await powersync.execute(`UPDATE reports SET ${cols.join(', ')} WHERE id = ?`, vals);

                    set((state) => ({
                        reports: state.reports.map((r) =>
                            r.id === id ? { ...r, syncStatus: 'synced' } : r
                        ),
                    }));
                } catch (error) {
                    console.error('Failed to update report in PowerSync:', error);
                }
            },

            deleteReport: async (id) => {
                set((state) => ({
                    reports: state.reports.filter((r) => r.id !== id),
                }));

                try {
                    await powersync.execute(`DELETE FROM reports WHERE id = ?`, [id]);
                } catch (error) {
                    console.error('Failed to delete report from PowerSync:', error);
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
                        await powersync.execute(
                            `INSERT INTO drawing_folders (id, project_id, user_id, name, parent_id, created_at)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [localId, folder.projectId, userId, folder.name, folder.parentId ?? null, now]
                        );
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
                        const cols: string[] = [];
                        const vals: any[] = [];
                        const add = (col: string, val: any) => { cols.push(`${col} = ?`); vals.push(val); };
                        if (updatedFields.name !== undefined) add('name', updatedFields.name);
                        if (updatedFields.parentId !== undefined) add('parent_id', updatedFields.parentId);
                        
                        if (cols.length > 0) {
                            vals.push(id);
                            await powersync.execute(`UPDATE drawing_folders SET ${cols.join(', ')} WHERE id = ?`, vals);
                        }
                    } catch (error) {
                        console.error('Failed to sync folder update to Supabase:', error);
                    }
                }
            },

            deleteFolder: async (id) => {
                const childDrawings = get().drawings.filter(d => d.folderId === id);
                set((state) => ({
                    folders: state.folders.filter((f) => f.id !== id),
                    drawings: state.drawings.filter(d => d.folderId !== id)
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        await powersync.execute('DELETE FROM drawing_folders WHERE id = ?', [id]);
                        for (const d of childDrawings) {
                            try {
                                await powersync.execute('DELETE FROM drawings WHERE id = ?', [d.id]);
                                if (d.uri && !d.uri.startsWith('file:') && !d.uri.startsWith('http')) {
                                    await deleteStorageFile('drawings', d.uri);
                                }
                            } catch (e) {
                                console.error('Failed to delete child drawing:', e);
                            }
                        }
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
                        await powersync.execute(
                            `INSERT INTO drawings (id, project_id, user_id, folder_id, name, type, storage_path, size, uploaded_at, author)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [localId, drawing.projectId, userId, drawing.folderId ?? null, drawing.name,
                             drawing.type ?? 'other', drawing.uri ?? null, drawing.size ?? 0, now, drawing.author ?? null]
                        );

                        await get().addActivity({
                            projectId: drawing.projectId,
                            userId,
                            action: 'uploaded ' + drawing.name,
                            entityType: 'drawing',
                            entityId: localId,
                        });
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
                        const cols: string[] = [];
                        const vals: any[] = [];
                        const add = (col: string, val: any) => { cols.push(`${col} = ?`); vals.push(val); };
                        if (updatedFields.name !== undefined) add('name', updatedFields.name);
                        if (updatedFields.folderId !== undefined) add('folder_id', updatedFields.folderId);
                        if (updatedFields.type !== undefined) add('type', updatedFields.type);
                        if (updatedFields.uri !== undefined) add('storage_path', updatedFields.uri);
                        if (updatedFields.size !== undefined) add('size', updatedFields.size);
                        if (updatedFields.author !== undefined) add('author', updatedFields.author);
                        
                        if (cols.length > 0) {
                            vals.push(id);
                            await powersync.execute(`UPDATE drawings SET ${cols.join(', ')} WHERE id = ?`, vals);
                        }
                    } catch (error) {
                        console.error('Failed to sync drawing update to Supabase:', error);
                    }
                }
            },

            deleteDrawing: async (id) => {
                const d = get().drawings.find(x => x.id === id);
                set((state) => ({
                    drawings: state.drawings.filter((d) => d.id !== id),
                }));

                const userId = getCurrentUserId();
                if (userId) {
                    try {
                        await powersync.execute('DELETE FROM drawings WHERE id = ?', [id]);
                        if (d?.uri && !d.uri.startsWith('file:') && !d.uri.startsWith('http')) {
                            try { await deleteStorageFile('drawings', d.uri); } catch (e) { console.error('Storage delete error:', e); }
                        }
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
                if (!userId) return;
                const now = new Date().toISOString();
                const localId = uuidv4();
                try {
                    await powersync.execute(
                        `INSERT INTO activities (id, project_id, user_id, action, entity_type, entity_id, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            localId,
                            activity.projectId,
                            activity.userId || userId,
                            activity.action,
                            activity.entityType,
                            activity.entityId ?? null,
                            now,
                        ]
                    );
                } catch (error) {
                    console.error('Failed to write activity to PowerSync:', error);
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
                        await powersync.execute(
                            `INSERT INTO calculations (id, project_id, user_id, type, data, created_at)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [localId, calc.projectId, calc.userId, calc.type, JSON.stringify(calc.data ?? {}), now]
                        );
                    } catch (error) {
                        console.error('Failed to write calculation to PowerSync:', error);
                    }
                }
            },
            
            getCalculationsForProject: (projectId) => get().calculations.filter((c) => c.projectId === projectId),

            // Snags
            addSnag: async (snag) => {
                const userId = getCurrentUserId();
                const now = new Date().toISOString();
                const localId = uuidv4();

                // Get project to get the current counter
                const project = get().projects.find(p => p.id === snag.projectId);
                if (!project) {
                    console.error('Project not found for snag');
                    return undefined;
                }
                const newSeq = (project.snagCounter || 0) + 1;

                        if (userId) {
                    try {
                        const photosStr = JSON.stringify(snag.photos || []);
                        await powersync.writeTransaction(async (tx) => {
                            await tx.execute(
                                `INSERT INTO snags (
                                    id, project_id, user_id, seq, building_id, floor, flat,
                                    area_type, severity, trade, room, description, photos, status,
                                    legacy_code, created_at
                                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    localId, snag.projectId, userId, newSeq, snag.buildingId || null,
                                    snag.floor ?? null, snag.flat ?? null, snag.areaType, snag.severity,
                                    snag.trade || null, snag.room || null, snag.description, photosStr, snag.status,
                                    snag.legacyCode || null, now
                                ]
                            );
                            await tx.execute(
                                `UPDATE projects SET snag_counter = ? WHERE id = ?`,
                                [newSeq, snag.projectId]
                            );
                        });
                        
                        // Update local store immediately for project (optimistic, but after successful local transaction)
                        set((state) => ({
                            projects: state.projects.map(p =>
                                p.id === snag.projectId ? { ...p, snagCounter: newSeq } : p
                            )
                        }));

                        return newSeq;
                    } catch (error: any) {
                        set({ syncError: error.message });
                        console.error('Failed to add snag:', error);
                        return undefined;
                    }
                }
                return undefined;
            },
            updateSnag: async (id, snag) => {
                if (!getCurrentUserId()) return;
                
                try {
                    const updates: any[] = [];
                    const vals: any[] = [];
                    
                    if (snag.buildingId !== undefined) { updates.push('building_id = ?'); vals.push(snag.buildingId); }
                    if (snag.floor !== undefined) { updates.push('floor = ?'); vals.push(snag.floor); }
                    if (snag.flat !== undefined) { updates.push('flat = ?'); vals.push(snag.flat); }
                    if (snag.areaType !== undefined) { updates.push('area_type = ?'); vals.push(snag.areaType); }
                    if (snag.severity !== undefined) { updates.push('severity = ?'); vals.push(snag.severity); }
                    if (snag.trade !== undefined) { updates.push('trade = ?'); vals.push(snag.trade); }
                    if (snag.room !== undefined) { updates.push('room = ?'); vals.push(snag.room); }
                    if (snag.description !== undefined) { updates.push('description = ?'); vals.push(snag.description); }
                    if (snag.photos !== undefined) { updates.push('photos = ?'); vals.push(JSON.stringify(snag.photos)); }
                    if (snag.status !== undefined) { updates.push('status = ?'); vals.push(snag.status); }
                    if (snag.legacyCode !== undefined) { updates.push('legacy_code = ?'); vals.push(snag.legacyCode); }
                    
                    if (updates.length > 0) {
                        vals.push(id);
                        await powersync.execute(`UPDATE snags SET ${updates.join(', ')} WHERE id = ?`, vals);
                    }
                } catch (error: any) {
                    console.error('Failed to update snag:', error);
                }
            },
            deleteSnag: async (id) => {
                if (!getCurrentUserId()) return;
                try {
                    await powersync.execute(`DELETE FROM snags WHERE id = ?`, [id]);
                } catch (error: any) {
                    console.error('Failed to delete snag:', error);
                }
            },

        }),
        {
            name: 'construction-pro-projects-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
