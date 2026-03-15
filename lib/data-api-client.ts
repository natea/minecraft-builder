/**
 * Data API Client for Busibox App Template
 *
 * Provides typed CRUD operations for demo notes using the Busibox data-api service.
 * Uses shared client from @jazzmind/busibox-app.
 *
 * Replace the demo document/schema with your own app's data model.
 */

import {
  generateId,
  getNow,
  queryRecords,
  insertRecords,
  updateRecords,
  deleteRecords,
  ensureDocuments,
} from '@jazzmind/busibox-app';
import type { AppDataSchema } from '@jazzmind/busibox-app';
import type { DemoNote, CreateNoteInput, UpdateNoteInput } from './types';

// ==========================================================================
// Data Document Names
// ==========================================================================

export const DOCUMENTS = {
  NOTES: 'busibox-template-notes',
} as const;

// ==========================================================================
// Schemas
// ==========================================================================

export const noteSchema: AppDataSchema = {
  fields: {
    id: { type: 'string', required: true, hidden: true },
    title: { type: 'string', required: true, label: 'Title', order: 1 },
    content: { type: 'string', required: true, label: 'Content', multiline: true, order: 2 },
    createdAt: { type: 'string', label: 'Created', readonly: true, hidden: true, order: 3 },
    updatedAt: { type: 'string', label: 'Updated', readonly: true, hidden: true, order: 4 },
  },
  displayName: 'Notes',
  itemLabel: 'Note',
  sourceApp: 'busibox-template',
  visibility: 'personal',
  allowSharing: false,
  graphNode: '',
  graphRelationships: [],
};

// ==========================================================================
// ensureDataDocuments
// ==========================================================================

export async function ensureDataDocuments(token: string): Promise<{
  notes: string;
}> {
  const ids = await ensureDocuments(
    token,
    {
      notes: {
        name: DOCUMENTS.NOTES,
        schema: noteSchema,
        visibility: 'personal',
      },
    },
    'busibox-template'
  );
  return ids as { notes: string };
}

// ==========================================================================
// Note Operations
// ==========================================================================

export async function listNotes(
  token: string,
  documentId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ notes: DemoNote[]; total: number }> {
  const result = await queryRecords<DemoNote>(token, documentId, {
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: options?.limit,
    offset: options?.offset,
  });

  return { notes: result.records, total: result.total };
}

export async function getNote(
  token: string,
  documentId: string,
  noteId: string
): Promise<DemoNote | null> {
  const result = await queryRecords<DemoNote>(token, documentId, {
    where: { field: 'id', op: 'eq', value: noteId },
    limit: 1,
  });

  return result.records[0] || null;
}

export async function createNote(
  token: string,
  documentId: string,
  input: CreateNoteInput
): Promise<DemoNote> {
  const now = getNow();
  const note: DemoNote = {
    id: generateId(),
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };

  await insertRecords(token, documentId, [note]);
  return note;
}

export async function updateNote(
  token: string,
  documentId: string,
  noteId: string,
  input: UpdateNoteInput
): Promise<DemoNote | null> {
  const existing = await getNote(token, documentId, noteId);
  if (!existing) return null;

  const updates = {
    ...input,
    updatedAt: getNow(),
  };

  await updateRecords(
    token,
    documentId,
    updates,
    { field: 'id', op: 'eq', value: noteId }
  );

  return { ...existing, ...updates };
}

export async function deleteNote(
  token: string,
  documentId: string,
  noteId: string
): Promise<boolean> {
  const result = await deleteRecords(
    token,
    documentId,
    { field: 'id', op: 'eq', value: noteId }
  );
  return result.count > 0;
}
