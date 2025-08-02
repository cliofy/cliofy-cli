/**
 * Task commands component
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import { CoreContext, Task, CreateTaskRequest, UpdateTaskRequest, TaskFilter } from '@cliofy/core';
import { Spinner } from '../components/Spinner';
import { TaskTable } from '../components/TaskTable';

interface TaskCommandProps {
  subcommand: string;
  context: CoreContext;
  args: any;
}

export const TaskCommand: React.FC<TaskCommandProps> = ({ subcommand, context, args }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleTaskCommand();
  }, []);

  const handleTaskCommand = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      switch (subcommand) {
        case 'list':
          await handleList();
          break;
        case 'create':
          await handleCreate();
          break;
        case 'show':
          await handleShow();
          break;
        case 'update':
          await handleUpdate();
          break;
        case 'delete':
          await handleDelete();
          break;
        case 'complete':
          await handleComplete();
          break;
        case 'tree':
          await handleTree();
          break;
        default:
          setError(`Unknown task subcommand: ${subcommand}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleList = async (): Promise<void> => {
    // Build filter from args
    const filter: TaskFilter = {};
    
    if (args.parent) filter.parent_id = args.parent;
    if (args.completed !== undefined) {
      const completedStr = args.completed.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(completedStr)) {
        filter.is_completed = true;
      } else if (['false', '0', 'no', 'off'].includes(completedStr)) {
        filter.is_completed = false;
      }
    }
    if (args.title) filter.title_contains = args.title;
    if (args.limit) filter.limit = args.limit;
    if (args.offset) filter.offset = args.offset;

    const tasks = await context.apiClient.listTasks(filter);

    // Apply additional client-side filtering
    let filteredTasks = tasks;

    if (args.focused) {
      filteredTasks = filteredTasks.filter(task => task.user_states?.focused);
    }

    if (args.archived) {
      filteredTasks = filteredTasks.filter(task => task.user_states?.archived);
    }

    if (args.priority !== undefined) {
      filteredTasks = filteredTasks.filter(task => task.user_states?.priority === args.priority);
    }

    if (args['high-priority']) {
      filteredTasks = filteredTasks.filter(task => (task.user_states?.priority || 0) >= 4);
    }

    if (args.tags) {
      const tagList = args.tags.split(',').map((tag: string) => tag.trim());
      filteredTasks = filteredTasks.filter(task => 
        tagList.every(tag => task.user_states?.tags?.includes(tag))
      );
    }

    // Handle predefined views
    if (args.view) {
      switch (args.view) {
        case 'focused':
          filteredTasks = filteredTasks.filter(task => task.user_states?.focused);
          break;
        case 'archived':
          filteredTasks = filteredTasks.filter(task => task.user_states?.archived);
          break;
        case 'high_priority':
          filteredTasks = filteredTasks.filter(task => (task.user_states?.priority || 0) >= 4);
          break;
        case 'completed':
          filteredTasks = filteredTasks.filter(task => task.is_completed);
          break;
        case 'today':
          // Filter for tasks due today
          const today = new Date().toISOString().split('T')[0];
          filteredTasks = filteredTasks.filter(task => 
            task.start_time && task.start_time.split('T')[0] === today
          );
          break;
        case 'overdue':
          // Filter for overdue tasks
          const now = new Date();
          filteredTasks = filteredTasks.filter(task => 
            task.due_time && 
            new Date(task.due_time) < now && 
            !task.is_completed
          );
          break;
      }
    }

    if (args.output === 'json') {
      setResult({
        type: 'json',
        data: filteredTasks,
      });
    } else {
      setResult({
        type: 'tasks',
        tasks: filteredTasks,
        showDetails: args.details,
        outputFormat: args.output,
      });
    }
  };

  const handleCreate = async (): Promise<void> => {
    const createData: CreateTaskRequest = {
      title: args.title,
      content: args.content,
      parent_id: args.parent,
      position: args.position || 0,
      start_time: args['start-time'],
      due_time: args['due-time'],
    };

    const task = await context.apiClient.createTask(createData);

    if (args.output === 'json') {
      setResult({
        type: 'json',
        data: task,
      });
    } else {
      setResult({
        type: 'task-created',
        task,
      });
    }
  };

  const handleShow = async (): Promise<void> => {
    const task = await context.apiClient.getTask(args.taskId);

    if (args.output === 'json') {
      setResult({
        type: 'json',
        data: task,
      });
    } else {
      setResult({
        type: 'task-detail',
        task,
      });
    }
  };

  const handleUpdate = async (): Promise<void> => {
    const updateData: UpdateTaskRequest = {};
    
    if (args.title) updateData.title = args.title;
    if (args.content) updateData.content = args.content;
    if (args.completed !== undefined) {
      const completedStr = args.completed.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(completedStr)) {
        updateData.is_completed = true;
      } else if (['false', '0', 'no', 'off'].includes(completedStr)) {
        updateData.is_completed = false;
      }
    }
    if (args.parent) updateData.parent_id = args.parent;
    if (args.position !== undefined) updateData.position = args.position;
    if (args['start-time']) updateData.start_time = args['start-time'];
    if (args['due-time']) updateData.due_time = args['due-time'];

    const task = await context.apiClient.updateTask(args.taskId, updateData);

    if (args.output === 'json') {
      setResult({
        type: 'json',
        data: task,
      });
    } else {
      setResult({
        type: 'task-updated',
        task,
      });
    }
  };

  const handleDelete = async (): Promise<void> => {
    // For now, we'll skip the confirmation dialog
    // In a full implementation, we'd use inquirer for confirmation
    if (!args.force) {
      setError('Deletion requires --force flag for now (confirmation dialog not implemented)');
      return;
    }

    await context.apiClient.deleteTask(args.taskId);

    setResult({
      type: 'task-deleted',
      taskId: args.taskId,
    });
  };

  const handleComplete = async (): Promise<void> => {
    const updateData: UpdateTaskRequest = {
      is_completed: true,
    };

    const task = await context.apiClient.updateTask(args.taskId, updateData);

    setResult({
      type: 'task-completed',
      task,
    });
  };

  const handleTree = async (): Promise<void> => {
    let tasks: Task[];

    if (args.root) {
      // Get root task and its descendants
      const rootTask = await context.apiClient.getTask(args.root);
      const allTasks = await context.apiClient.listTasks();
      const descendants = allTasks.filter(task => {
        // Simple implementation - in a full version we'd do proper tree traversal
        return task.parent_id === args.root;
      });
      tasks = [rootTask, ...descendants];
    } else {
      tasks = await context.apiClient.listTasks();
    }

    setResult({
      type: 'task-tree',
      tasks,
      maxDepth: args.depth,
    });
  };

  // Render loading state
  if (loading) {
    return (
      <Box>
        <Spinner />
        <Text> Processing {subcommand} command...</Text>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">❌ Error: {error}</Text>
      </Box>
    );
  }

  // Render result
  if (result) {
    if (result.type === 'json') {
      return <Text>{JSON.stringify(result.data, null, 2)}</Text>;
    }

    if (result.type === 'tasks') {
      return (
        <Box flexDirection="column">
          <TaskTable tasks={result.tasks} showDetails={result.showDetails} />
          <Newline />
          <Text>
            📊 Total: {result.tasks.length} tasks, {result.tasks.filter((t: Task) => t.is_completed).length} completed
          </Text>
        </Box>
      );
    }

    if (result.type === 'task-created') {
      const { task } = result;
      return (
        <Box borderStyle="round" borderColor="green" padding={1}>
          <Text color="green" bold>✅ Task created successfully!</Text>
          <Newline />
          <Text>ID: {task.id}</Text>
          <Text>Title: {task.title}</Text>
          <Text>Status: {task.is_completed ? '✅ Done' : '⏳ Todo'}</Text>
          <Text>Created: {new Date(task.created_at).toLocaleString()}</Text>
        </Box>
      );
    }

    if (result.type === 'task-detail') {
      const { task } = result;
      return (
        <Box borderStyle="round" borderColor="blue" padding={1}>
          <Text color="blue" bold>Task Details</Text>
          <Newline />
          <Text><Text bold>Title:</Text> {task.title}</Text>
          <Text><Text bold>ID:</Text> {task.id}</Text>
          <Text><Text bold>Status:</Text> {task.is_completed ? '✅ Done' : '⏳ Todo'}</Text>
          <Text><Text bold>Created:</Text> {new Date(task.created_at).toLocaleString()}</Text>
          {task.start_time && <Text><Text bold>Start:</Text> {new Date(task.start_time).toLocaleString()}</Text>}
          {task.due_time && <Text><Text bold>Due:</Text> {new Date(task.due_time).toLocaleString()}</Text>}
          {task.parent_id && <Text><Text bold>Parent:</Text> {task.parent_id}</Text>}
          <Text><Text bold>Position:</Text> {task.position}</Text>
          <Text><Text bold>Attachments:</Text> {task.attachments.length}</Text>
          {task.content && (
            <>
              <Newline />
              <Text bold>Content:</Text>
              <Text>{task.content}</Text>
            </>
          )}
        </Box>
      );
    }

    if (result.type === 'task-updated') {
      const { task } = result;
      return (
        <Box borderStyle="round" borderColor="green" padding={1}>
          <Text color="green" bold>✅ Task updated successfully!</Text>
          <Newline />
          <Text>ID: {task.id}</Text>
          <Text>Title: {task.title}</Text>
          <Text>Status: {task.is_completed ? '✅ Done' : '⏳ Todo'}</Text>
        </Box>
      );
    }

    if (result.type === 'task-deleted') {
      return (
        <Box borderStyle="round" borderColor="green" padding={1}>
          <Text color="green" bold>✅ Task deleted successfully!</Text>
          <Newline />
          <Text>Task ID: {result.taskId}</Text>
        </Box>
      );
    }

    if (result.type === 'task-completed') {
      const { task } = result;
      return (
        <Box borderStyle="round" borderColor="green" padding={1}>
          <Text color="green" bold>✅ Task completed successfully!</Text>
          <Newline />
          <Text>Title: {task.title}</Text>
          <Text>ID: {task.id}</Text>
        </Box>
      );
    }

    if (result.type === 'task-tree') {
      return (
        <Box flexDirection="column">
          <Text color="cyan" bold>📋 Task Tree</Text>
          <Newline />
          {result.tasks.map((task: Task, index: number) => (
            <Text key={task.id}>
              {task.is_completed ? '✅' : '⏳'} {task.title}
            </Text>
          ))}
        </Box>
      );
    }
  }

  return <Text>Unknown result type</Text>;
};