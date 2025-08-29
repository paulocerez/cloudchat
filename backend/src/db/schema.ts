import { bigint, boolean, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  storageUsedBytes: bigint('storage_used_bytes', { mode: 'number' }).default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const uploadStatusEnum = pgEnum('upload_status', ['pending', 'uploading', 'completed', 'failed']);
export const virusScanResultEnum = pgEnum('virus_scan_result', ['clean', 'infected', 'pending', 'failed']);

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'cascade' }),
  uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  
  // File metadata
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  
  // S3 storage details
  s3Bucket: varchar('s3_bucket', { length: 63 }).notNull(),
  s3Key: varchar('s3_key', { length: 1024 }).notNull().unique(),
  s3Etag: varchar('s3_etag', { length: 255 }),

  uploadStatus: uploadStatusEnum('upload_status').default('pending'),  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  parentFolderId: uuid('parent_folder_id').references(() => folders.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  shareToken: varchar('share_token', { length: 64 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  isPublic: boolean('is_public').default(false),
  totalSizeBytes: bigint('total_size_bytes', { mode: 'number' }).default(0),
  fileCount: integer('file_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const accessLevelEnum = pgEnum('access_level', ['view', 'edit']);

export const folderShares = pgTable('folder_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'cascade' }).notNull(),
  sharedWithUserId: uuid('shared_with_user_id').references(() => users.id, { onDelete: 'cascade' }),
  sharedByUserId: uuid('shared_by_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accessLevel: accessLevelEnum('access_level').default('view'),
  inviteToken: varchar('invite_token', { length: 64 }).unique(),
  invitedEmail: varchar('invited_email', { length: 255 }),
  isAccepted: boolean('is_accepted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});


export type User = typeof users.$inferInsert;
export type NewUser = typeof users.$inferSelect;

export type File = typeof files.$inferInsert;
export type NewFile = typeof files.$inferSelect;

export type Folder = typeof folders.$inferInsert;
export type NewFolder = typeof folders.$inferSelect;

export type FolderShare = typeof folderShares.$inferInsert;
export type NewFolderShare = typeof folderShares.$inferSelect;