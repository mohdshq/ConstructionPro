import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { compressImage, compressThumbnail, generateStorageFilename } from './imageUtils';
import type { Database } from '../types/supabase';

// ──────────────────────────────────────────────
// Type aliases from generated Supabase types
// ──────────────────────────────────────────────
type ProjectRow = Database['public']['Tables']['projects']['Row'];

type ReportRow = Database['public']['Tables']['reports']['Row'];

type DrawingFolderRow = Database['public']['Tables']['drawing_folders']['Row'];
type DrawingFolderInsert = Database['public']['Tables']['drawing_folders']['Insert'];

type DrawingRow = Database['public']['Tables']['drawings']['Row'];
type DrawingInsert = Database['public']['Tables']['drawings']['Insert'];

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// ──────────────────────────────────────────────
// Profiles
// ──────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
    }
    return data;
}

export async function updateProfile(
    userId: string,
    updates: Partial<Pick<ProfileRow, 'full_name' | 'avatar_url' | 'company' | 'role'>>
) {
    const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data;
}

// ──────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────

export async function fetchUserProjects(userId: string): Promise<ProjectRow[]> {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
    return data ?? [];
}

// ──────────────────────────────────────────────
// Reports
// ──────────────────────────────────────────────

export async function fetchUserReports(userId: string): Promise<ReportRow[]> {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
    return data ?? [];
}

// ──────────────────────────────────────────────
// Drawing Folders
// ──────────────────────────────────────────────

export async function fetchUserFolders(userId: string): Promise<DrawingFolderRow[]> {
    const { data, error } = await supabase
        .from('drawing_folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch folders: ${error.message}`);
    return data ?? [];
}

export async function insertFolder(folder: DrawingFolderInsert): Promise<DrawingFolderRow> {
    const { data, error } = await supabase
        .from('drawing_folders')
        .insert(folder)
        .select()
        .single();

    if (error) throw new Error(`Failed to create folder: ${error.message}`);
    return data;
}



// ──────────────────────────────────────────────
// Drawings
// ──────────────────────────────────────────────

export async function fetchUserDrawings(userId: string): Promise<DrawingRow[]> {
    const { data, error } = await supabase
        .from('drawings')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch drawings: ${error.message}`);
    return data ?? [];
}

export async function insertDrawing(drawing: DrawingInsert): Promise<DrawingRow> {
    const { data, error } = await supabase
        .from('drawings')
        .insert(drawing)
        .select()
        .single();

    if (error) throw new Error(`Failed to create drawing: ${error.message}`);
    return data;
}



// ──────────────────────────────────────────────
// Storage Helpers
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Team & Activities (Phase 4)
// ──────────────────────────────────────────────

export async function fetchUserProjectMembers(userId: string) {
    const { data, error } = await supabase
        .from('project_members')
        .select('*, profiles:user_id (full_name, avatar_url, role)')
        .eq('user_id', userId);
    
    // Also fetch members of projects the user is in
    const projectIds = data?.map(m => m.project_id) || [];
    if (projectIds.length === 0) return [];

    const { data: allMembers, error: err2 } = await supabase
        .from('project_members')
        .select('*, profiles:user_id (full_name, avatar_url, role)')
        .in('project_id', projectIds);

    if (err2) throw new Error(`Failed to fetch project members: ${err2.message}`);
    return allMembers ?? [];
}

export async function fetchUserActivities(userId: string) {
    // Fetch activities for projects the user is a member of
    const { data: members } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
        
    const projectIds = members?.map(m => m.project_id) || [];
    if (projectIds.length === 0) return [];

    const { data, error } = await supabase
        .from('activities')
        .select('*, profiles:user_id (full_name, avatar_url)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw new Error(`Failed to fetch activities: ${error.message}`);
    return data ?? [];
}

export async function fetchUserCalculations(userId: string) {
    const { data: members } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
        
    const projectIds = members?.map(m => m.project_id) || [];
    if (projectIds.length === 0) return [];

    const { data, error } = await supabase
        .from('calculations')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch calculations: ${error.message}`);
    return data ?? [];
}

export async function insertCalculation(calculation: any) {
    const { data, error } = await supabase
        .from('calculations')
        .insert(calculation)
        .select()
        .single();
    if (error) throw new Error(`Failed to save calculation: ${error.message}`);
    return data;
}

/**
 * Upload a photo to Supabase Storage with compression.
 * Path format: {userId}/{projectId}/{filename}
 * Returns the storage path (not a URL).
 */
export async function uploadPhoto(
    bucket: 'report-photos' | 'drawings' | 'avatars',
    userId: string,
    localUri: string,
    options?: {
        projectId?: string;
        prefix?: string;
        skipCompression?: boolean;
    }
): Promise<string> {
    // Compress the image
    let processedUri = localUri;
    if (!options?.skipCompression) {
        if (bucket === 'avatars') {
            processedUri = await compressThumbnail(localUri);
        } else {
            const compressed = await compressImage(localUri);
            processedUri = compressed.uri;
        }
    }

    // Create the storage path
    const filename = generateStorageFilename(options?.prefix ?? 'img');
    const pathParts = [userId];
    if (options?.projectId) pathParts.push(options.projectId);
    pathParts.push(filename);
    const storagePath = pathParts.join('/');

    // Upload file contents
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('Not authenticated');

    const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;

    const result = await FileSystem.uploadAsync(uploadUrl, processedUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'false',
        },
    });

    if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Failed to upload photo: status ${result.status} - ${result.body}`);
    }

    return storagePath;
}

/**
 * Get a signed URL for a private storage file (valid for 1 hour).
 */
export async function getSignedUrl(
    bucket: 'report-photos' | 'drawings' | 'avatars',
    path: string,
    expiresIn: number = 3600
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error) {
        console.error('Error getting signed URL:', error.message);
        return null;
    }
    return data.signedUrl;
}

/**
 * Upload a user avatar to Supabase Storage.
 * Uses upsert=true so it replaces the previous avatar.
 */
export async function uploadAvatar(
    storagePath: string,
    localUri: string,
): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('Not authenticated');

    const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/avatars/${storagePath}`;

    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
        },
    });

    if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Failed to upload avatar: status ${result.status} - ${result.body}`);
    }

    return storagePath;
}

/**
 * Get a public URL for files in public buckets (like avatars).
 */
export function getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Delete a file from storage.
 */
export async function deleteStorageFile(
    bucket: 'report-photos' | 'drawings' | 'avatars',
    path: string
): Promise<void> {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) console.error('Error deleting file:', error.message);
}

/**
 * Upload a drawing file (PDF, image, etc.) to Supabase Storage.
 * For non-image files, skip compression.
 */
export async function uploadDrawingFile(
    userId: string,
    projectId: string,
    localUri: string,
    mimeType: string
): Promise<string> {
    const isImage = mimeType.startsWith('image/');
    let processedUri = localUri;
    if (isImage) {
        const compressed = await compressImage(localUri, { quality: 0.8 });
        processedUri = compressed.uri;
    }

    const ext = isImage ? 'jpg' : (localUri.split('.').pop() || 'bin');
    const filename = `drawing_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `${userId}/${projectId}/${filename}`;

    // Get current session token for authenticated upload
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('Not authenticated');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/drawings/${storagePath}`;

    const result = await FileSystem.uploadAsync(uploadUrl, processedUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': isImage ? 'image/jpeg' : mimeType,
            'x-upsert': 'false',
        },
    });

    if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Failed to upload drawing: status ${result.status} ${result.body}`);
    }
    return storagePath;
}
