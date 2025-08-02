/**
 * Task-related data models and schemas
 * These models match the TypeScript API types from the web application
 */

import { z } from 'zod';

// First define all schemas

/**
 * Attachment schema and type
 */
export const AttachmentSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  created_at: z.string(),
  file_name: z.string().min(1).max(255),
  file_url: z.string().url().max(2048),
  file_type: z.string().min(1).max(100),
  file_size: z.number().int().min(0).max(52428800), // 50MB max
});

export type Attachment = z.infer<typeof AttachmentSchema>;

/**
 * Task note schema and type
 */
export const TaskNoteSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(100000),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TaskNote = z.infer<typeof TaskNoteSchema>;

/**
 * Task user states schema and type
 */
export const TaskUserStatesSchema = z.object({
  focused: z.boolean().optional(),
  archived: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.unknown()).default({}),
}).transform((data) => ({
  ...data,
  // Sort tags for consistent ordering and remove duplicates
  tags: Array.from(new Set(data.tags.map(tag => tag.trim()).filter(Boolean))).sort(),
}));

export type TaskUserStates = z.infer<typeof TaskUserStatesSchema>;

/**
 * Main task schema and type
 */
export const TaskSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  user_id: z.string(),
  title: z.string().min(1).max(500),
  content: z.string().max(50000).default(''),
  is_completed: z.boolean().default(false),
  completed_at: z.string().optional(),
  parent_id: z.string().optional(),
  position: z.number().int().min(0).default(0),
  start_time: z.string().optional(),
  due_time: z.string().optional(),
  user_states: TaskUserStatesSchema.optional(),
  attachments: z.array(AttachmentSchema).default([]),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Task with computed properties
 */
export interface TaskWithProperties extends Task {
  is_focused: boolean;
  is_archived: boolean;
  is_high_priority: boolean;
  task_priority: number;
  task_tags: string[];
}

/**
 * Task filter schema and type
 */
export const TaskFilterSchema = z.object({
  parent_id: z.string().optional(),
  is_completed: z.boolean().optional(),
  title_contains: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
});

export type TaskFilter = z.infer<typeof TaskFilterSchema>;

/**
 * Create task request schema and type
 */
export const CreateTaskRequestSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(50000).optional(),
  parent_id: z.string().optional(),
  position: z.number().int().min(0).default(0),
  start_time: z.string().optional(),
  due_time: z.string().optional(),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

/**
 * Update task request schema and type
 */
export const UpdateTaskRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).optional(),
  is_completed: z.boolean().optional(),
  parent_id: z.string().optional(),
  position: z.number().int().min(0).optional(),
  start_time: z.string().optional(),
  due_time: z.string().optional(),
  user_states: TaskUserStatesSchema.optional(),
});

export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;

/**
 * Task states update request schema and type
 */
export const TaskStatesUpdateRequestSchema = z.object({
  states: TaskUserStatesSchema,
});

export type TaskStatesUpdateRequest = z.infer<typeof TaskStatesUpdateRequestSchema>;

/**
 * Task states update response schema and type
 */
export const TaskStatesUpdateResponseSchema = z.object({
  updated_states: TaskUserStatesSchema,
});

export type TaskStatesUpdateResponse = z.infer<typeof TaskStatesUpdateResponseSchema>;

/**
 * Task state update for batch operations
 */
export const TaskStateUpdateSchema = z.object({
  task_id: z.string(),
  states: TaskUserStatesSchema,
});

export type TaskStateUpdate = z.infer<typeof TaskStateUpdateSchema>;

/**
 * Batch task states update request schema and type
 */
export const TaskStatesBatchUpdateRequestSchema = z.object({
  updates: z.array(TaskStateUpdateSchema).max(50), // Limit to 50 updates per batch
});

export type TaskStatesBatchUpdateRequest = z.infer<typeof TaskStatesBatchUpdateRequestSchema>;

/**
 * Batch task states update response schema and type
 */
export const TaskStatesBatchUpdateResponseSchema = z.object({
  updated_count: z.number().int().min(0),
  failed_count: z.number().int().min(0),
  updated_tasks: z.array(TaskSchema),
  errors: z.array(z.object({
    task_id: z.string(),
    error: z.string(),
  })),
});

export type TaskStatesBatchUpdateResponse = z.infer<typeof TaskStatesBatchUpdateResponseSchema>;

/**
 * Task creation note request schema and type
 */
export const CreateTaskNoteRequestSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(100000),
});

export type CreateTaskNoteRequest = z.infer<typeof CreateTaskNoteRequestSchema>;

/**
 * Task note update request schema and type
 */
export const UpdateTaskNoteRequestSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(100000).optional(),
});

export type UpdateTaskNoteRequest = z.infer<typeof UpdateTaskNoteRequestSchema>;

/**
 * Create attachment request schema and type
 */
export const CreateAttachmentRequestSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_url: z.string().url().max(2048),
  file_type: z.string().min(1).max(100),
  file_size: z.number().int().min(0).max(52428800),
});

export type CreateAttachmentRequest = z.infer<typeof CreateAttachmentRequestSchema>;

/**
 * Helper functions for task properties
 */
export const TaskHelpers = {
  /**
   * Check if task is focused
   */
  isFocused(task: Task): boolean {
    return Boolean(task.user_states?.focused);
  },

  /**
   * Check if task is archived
   */
  isArchived(task: Task): boolean {
    return Boolean(task.user_states?.archived);
  },

  /**
   * Check if task has high priority (4 or 5)
   */
  isHighPriority(task: Task): boolean {
    return (task.user_states?.priority || 0) >= 4;
  },

  /**
   * Get task priority (1-5, defaults to 0)
   */
  getPriority(task: Task): number {
    return task.user_states?.priority || 0;
  },

  /**
   * Get task tags
   */
  getTags(task: Task): string[] {
    return task.user_states?.tags || [];
  },

  /**
   * Convert task to task with properties
   */
  withProperties(task: Task): TaskWithProperties {
    return {
      ...task,
      is_focused: this.isFocused(task),
      is_archived: this.isArchived(task),
      is_high_priority: this.isHighPriority(task),
      task_priority: this.getPriority(task),
      task_tags: this.getTags(task),
    };
  },

  /**
   * Build task tree from flat list
   */
  buildTree(tasks: Task[]): Task[] {
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    const roots: Task[] = [];

    for (const task of tasks) {
      if (!task.parent_id) {
        roots.push(task);
      }
    }

    return roots.sort((a, b) => a.position - b.position);
  },

  /**
   * Get task descendants
   */
  getDescendants(taskId: string, tasks: Task[]): Task[] {
    const descendants: Task[] = [];
    const taskMap = new Map(tasks.map(task => [task.id, task]));

    const findChildren = (parentId: string): void => {
      for (const task of tasks) {
        if (task.parent_id === parentId) {
          descendants.push(task);
          findChildren(task.id);
        }
      }
    };

    findChildren(taskId);
    return descendants;
  },

  /**
   * Get task ancestors
   */
  getAncestors(taskId: string, tasks: Task[]): Task[] {
    const ancestors: Task[] = [];
    const taskMap = new Map(tasks.map(task => [task.id, task]));

    let currentTask = taskMap.get(taskId);
    while (currentTask?.parent_id) {
      const parent = taskMap.get(currentTask.parent_id);
      if (parent) {
        ancestors.push(parent);
        currentTask = parent;
      } else {
        break;
      }
    }

    return ancestors;
  },
};