import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const generateId = () =>
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

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
    status: ProjectStatus;
    photoUri?: string;
    createdAt: string;
    updatedAt: string;
}

interface ProjectsState {
    projects: Project[];
    reports: Report[];
    folders: DrawingFolder[];
    drawings: Drawing[];

    // Project Actions
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateProject: (id: string, project: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    getProject: (id: string) => Project | undefined;

    // Report Actions
    addReport: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateReport: (id: string, report: Partial<Report>) => void;
    deleteReport: (id: string) => void;
    getReportsForProject: (projectId: string) => Report[];
    getReport: (id: string) => Report | undefined;

    // Folder Actions
    addFolder: (folder: Omit<DrawingFolder, 'id' | 'createdAt'>) => void;
    updateFolder: (id: string, folder: Partial<DrawingFolder>) => void;
    deleteFolder: (id: string) => void;
    getFoldersForProject: (projectId: string) => DrawingFolder[];

    // Drawing Actions
    addDrawing: (drawing: Omit<Drawing, 'id' | 'uploadedAt'>) => void;
    updateDrawing: (id: string, drawing: Partial<Drawing>) => void;
    deleteDrawing: (id: string) => void;
    getDrawingsForProject: (projectId: string) => Drawing[];
}

export const useProjectsStore = create<ProjectsState>()(
    persist(
        (set, get) => ({
            projects: [],
            reports: [],
            folders: [],
            drawings: [],

            addProject: (project) => {
                const newProject: Project = {
                    ...project,
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => ({ projects: [...state.projects, newProject] }));
            },

            updateProject: (id, projectUpdates) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, ...projectUpdates, updatedAt: new Date().toISOString() } : p
                    ),
                }));
            },

            deleteProject: (id) => {
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    // Also cleanup associated reports and drawings
                    reports: state.reports.filter((r) => r.projectId !== id),
                    folders: state.folders.filter((f) => f.projectId !== id),
                    drawings: state.drawings.filter((d) => d.projectId !== id),
                }));
            },

            getProject: (id) => {
                return get().projects.find((p) => p.id === id);
            },

            addReport: (report) => {
                const newReport: Report = {
                    ...report,
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => ({ reports: [...state.reports, newReport] }));
            },

            updateReport: (id, reportUpdates) => {
                set((state) => ({
                    reports: state.reports.map((r) =>
                        r.id === id ? { ...r, ...reportUpdates, updatedAt: new Date().toISOString() } : r
                    ),
                }));
            },

            deleteReport: (id) => {
                set((state) => ({
                    reports: state.reports.filter((r) => r.id !== id),
                }));
            },

            getReportsForProject: (projectId) => {
                return get().reports.filter((r) => r.projectId === projectId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            },

            getReport: (id) => {
                return get().reports.find((r) => r.id === id);
            },

            addFolder: (folder) => {
                const newFolder: DrawingFolder = {
                    ...folder,
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({ folders: [...state.folders, newFolder] }));
            },
            updateFolder: (id, updatedFields) => {
                set((state) => ({
                    folders: state.folders.map(f => f.id === id ? { ...f, ...updatedFields } : f)
                }));
            },
            deleteFolder: (id) => {
                // Also delete child folders and drawings
                // For simplicity, we just delete the folder here. Recursive delete could be added.
                set((state) => ({
                    folders: state.folders.filter((f) => f.id !== id),
                    drawings: state.drawings.filter(d => d.folderId !== id)
                }));
            },
            getFoldersForProject: (projectId) => {
                return get().folders.filter((f) => f.projectId === projectId);
            },

            addDrawing: (drawing) => {
                const newDrawing: Drawing = {
                    ...drawing,
                    id: generateId(),
                    uploadedAt: new Date().toISOString(),
                };
                set((state) => ({ drawings: [...state.drawings, newDrawing] }));
            },
            updateDrawing: (id, updatedFields) => {
                set((state) => ({
                    drawings: state.drawings.map(d => d.id === id ? { ...d, ...updatedFields } : d)
                }));
            },
            deleteDrawing: (id) => {
                set((state) => ({
                    drawings: state.drawings.filter((d) => d.id !== id),
                }));
            },

            getDrawingsForProject: (projectId) => {
                return get().drawings.filter((d) => d.projectId === projectId).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
            },
        }),
        {
            name: 'construction-pro-projects-storage',
            storage: createJSONStorage(() => AsyncStorage),
            version: 1,
        }
    )
);
