import { column, Schema, Table } from '@powersync/react-native';

const profiles = new Table({
  full_name: column.text, avatar_url: column.text, company: column.text,
  role: column.text, created_at: column.text, updated_at: column.text,
});
const projects = new Table({
  user_id: column.text, name: column.text, location: column.text, client: column.text,
  description: column.text, contract_value: column.text, start_date: column.text,
  end_date: column.text, project_manager: column.text, status: column.text,
  photo_url: column.text, created_at: column.text, updated_at: column.text,
  reference_number: column.text, employer_logo: column.text, consultant_logo: column.text,
  contractor_logos: column.text, main_contractor_name: column.text, known_companies: column.text,
  known_rooms: column.text, buildings: column.text, snag_counter: column.integer,
});
const reports = new Table({
  project_id: column.text, user_id: column.text, type: column.text, date: column.text,
  author: column.text, template_data: column.text, status: column.text,
  created_at: column.text, updated_at: column.text,
}, { indexes: { by_project: ['project_id'] } });
const drawings = new Table({
  project_id: column.text, user_id: column.text, folder_id: column.text, name: column.text,
  type: column.text, storage_path: column.text, size: column.integer,
  uploaded_at: column.text, author: column.text,
}, { indexes: { by_project: ['project_id'], by_folder: ['folder_id'] } });
const drawing_folders = new Table({
  project_id: column.text, user_id: column.text, name: column.text,
  parent_id: column.text, created_at: column.text,
}, { indexes: { by_project: ['project_id'] } });
const calculations = new Table({
  project_id: column.text, user_id: column.text, type: column.text,
  data: column.text, created_at: column.text,
}, { indexes: { by_project: ['project_id'] } });
const project_members = new Table({
  project_id: column.text, user_id: column.text, role: column.text, created_at: column.text,
}, { indexes: { by_project: ['project_id'] } });
const activities = new Table({
  project_id: column.text, user_id: column.text, action: column.text,
  entity_type: column.text, entity_id: column.text, created_at: column.text,
}, { indexes: { by_project: ['project_id'] } });

const snags = new Table({
  project_id: column.text, user_id: column.text, seq: column.integer, building_id: column.text,
  floor: column.integer, flat: column.integer, area_type: column.text, severity: column.text,
  trade: column.text, room: column.text, description: column.text, photos: column.text, status: column.text,
  legacy_code: column.text, created_at: column.text,
  ai_status: column.text, ai_error: column.text, ai_attempts: column.integer, ai_updated_at: column.text,
}, { indexes: { by_project: ['project_id'] } });

export const AppSchema = new Schema({
  profiles, projects, reports, drawings, drawing_folders, calculations, project_members, activities, snags,
});
export type Database = (typeof AppSchema)['types'];
