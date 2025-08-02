/**
 * Simple TaskHelpers unit tests
 */

describe('TaskHelpers Simple Tests', () => {
  let TaskHelpers: any;

  beforeAll(async () => {
    // Dynamic import to avoid module resolution issues
    const taskModule = await import('../../packages/core/src/models/task');
    TaskHelpers = taskModule.TaskHelpers;
  });

  describe('Task Property Helpers', () => {
    it('should detect focused tasks', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          focused: true
        }
      };

      const result = TaskHelpers.isFocused(task);
      expect(result).toBe(true);
    });

    it('should detect non-focused tasks', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          focused: false
        }
      };

      const result = TaskHelpers.isFocused(task);
      expect(result).toBe(false);
    });

    it('should handle tasks without user_states', () => {
      const task = {
        id: 'task-1',
        title: 'Test task'
      };

      const result = TaskHelpers.isFocused(task);
      expect(result).toBe(false);
    });

    it('should detect archived tasks', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          archived: true
        }
      };

      const result = TaskHelpers.isArchived(task);
      expect(result).toBe(true);
    });

    it('should detect high priority tasks', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          priority: 5
        }
      };

      const result = TaskHelpers.isHighPriority(task);
      expect(result).toBe(true);
    });

    it('should detect low priority tasks', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          priority: 2
        }
      };

      const result = TaskHelpers.isHighPriority(task);
      expect(result).toBe(false);
    });

    it('should get task priority', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          priority: 3
        }
      };

      const result = TaskHelpers.getPriority(task);
      expect(result).toBe(3);
    });

    it('should return 0 for tasks without priority', () => {
      const task = {
        id: 'task-1',
        title: 'Test task'
      };

      const result = TaskHelpers.getPriority(task);
      expect(result).toBe(0);
    });

    it('should get task tags', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          tags: ['work', 'urgent']
        }
      };

      const result = TaskHelpers.getTags(task);
      expect(result).toEqual(['work', 'urgent']);
    });

    it('should return empty array for tasks without tags', () => {
      const task = {
        id: 'task-1',
        title: 'Test task'
      };

      const result = TaskHelpers.getTags(task);
      expect(result).toEqual([]);
    });
  });

  describe('Task Tree Operations', () => {
    it('should build task tree from flat list', () => {
      const tasks = [
        { id: 'task-1', title: 'Root task', position: 0 },
        { id: 'task-2', title: 'Another root', position: 1 },
        { id: 'task-3', title: 'Child task', parent_id: 'task-1', position: 0 }
      ];

      const result = TaskHelpers.buildTree(tasks);

      // Should return only root tasks, sorted by position
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');
    });

    it('should handle empty task list', () => {
      const tasks: any[] = [];

      const result = TaskHelpers.buildTree(tasks);

      expect(result).toEqual([]);
    });

    it('should get task descendants', () => {
      const tasks = [
        { id: 'parent', title: 'Parent' },
        { id: 'child1', title: 'Child 1', parent_id: 'parent' },
        { id: 'child2', title: 'Child 2', parent_id: 'parent' },
        { id: 'grandchild', title: 'Grandchild', parent_id: 'child1' }
      ];

      const result = TaskHelpers.getDescendants('parent', tasks);

      expect(result).toHaveLength(3);
      expect(result.find((t: any) => t.id === 'child1')).toBeDefined();
      expect(result.find((t: any) => t.id === 'child2')).toBeDefined();
      expect(result.find((t: any) => t.id === 'grandchild')).toBeDefined();
    });

    it('should get task ancestors', () => {
      const tasks = [
        { id: 'grandparent', title: 'Grandparent' },
        { id: 'parent', title: 'Parent', parent_id: 'grandparent' },
        { id: 'child', title: 'Child', parent_id: 'parent' }
      ];

      const result = TaskHelpers.getAncestors('child', tasks);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('parent');
      expect(result[1].id).toBe('grandparent');
    });

    it('should return empty array for root task ancestors', () => {
      const tasks = [
        { id: 'root', title: 'Root task' }
      ];

      const result = TaskHelpers.getAncestors('root', tasks);

      expect(result).toEqual([]);
    });
  });

  describe('Task Properties Enhancement', () => {
    it('should add computed properties to task', () => {
      const task = {
        id: 'task-1',
        title: 'Test task',
        user_states: {
          focused: true,
          archived: false,
          priority: 4,
          tags: ['work']
        }
      };

      const result = TaskHelpers.withProperties(task);

      expect(result).toEqual({
        ...task,
        is_focused: true,
        is_archived: false,
        is_high_priority: true,
        task_priority: 4,
        task_tags: ['work']
      });
    });

    it('should handle task without user_states', () => {
      const task = {
        id: 'task-1',
        title: 'Simple task'
      };

      const result = TaskHelpers.withProperties(task);

      expect(result).toEqual({
        ...task,
        is_focused: false,
        is_archived: false,
        is_high_priority: false,
        task_priority: 0,
        task_tags: []
      });
    });
  });
});