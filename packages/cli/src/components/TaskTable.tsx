/**
 * Task table component for displaying tasks in a table format
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Task } from '@cliofy/core';

interface TaskTableProps {
  tasks: Task[];
  showDetails?: boolean;
}

export const TaskTable: React.FC<TaskTableProps> = ({ tasks, showDetails = false }) => {
  const formatStatus = (isCompleted: boolean): string => {
    return isCompleted ? '✅ Done' : '⏳ Todo';
  };

  const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return 'None';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatPriority = (task: Task): string => {
    const priority = task.user_states?.priority;
    if (!priority) return '';
    
    const icons = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢', 5: '🔵' };
    const icon = icons[priority as keyof typeof icons] || '';
    return `${icon} ${priority}`;
  };

  const formatTags = (task: Task): string => {
    const tags = task.user_states?.tags || [];
    if (tags.length === 0) return '';
    
    const displayTags = tags.slice(0, 3).map(tag => `#${tag}`);
    if (tags.length > 3) {
      displayTags.push(`+${tags.length - 3}`);
    }
    
    return displayTags.join(', ');
  };

  const formatFocus = (task: Task): string => {
    return task.user_states?.focused ? '⭐' : '';
  };

  if (tasks.length === 0) {
    return <Text>No tasks found.</Text>;
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Box width={10}>
          <Text color="cyan" bold>ID</Text>
        </Box>
        <Box width={25} paddingLeft={1}>
          <Text color="white" bold>Title</Text>
        </Box>
        <Box width={10} paddingLeft={1}>
          <Text color="magenta" bold>Status</Text>
        </Box>
        <Box width={5} paddingLeft={1}>
          <Text color="yellow" bold>Focus</Text>
        </Box>
        <Box width={10} paddingLeft={1}>
          <Text color="yellow" bold>Priority</Text>
        </Box>
        <Box width={15} paddingLeft={1}>
          <Text color="blue" bold>Tags</Text>
        </Box>
        <Box width={16} paddingLeft={1}>
          <Text color="blue" bold>Created</Text>
        </Box>
        {showDetails && (
          <>
            <Box width={10} paddingLeft={1}>
              <Text color="gray" bold>Parent</Text>
            </Box>
            <Box width={8} paddingLeft={1}>
              <Text color="gray" bold>Position</Text>
            </Box>
            <Box width={16} paddingLeft={1}>
              <Text color="blue" bold>Start Time</Text>
            </Box>
            <Box width={16} paddingLeft={1}>
              <Text color="green" bold>Due Time</Text>
            </Box>
            <Box width={12} paddingLeft={1}>
              <Text color="gray" bold>Attachments</Text>
            </Box>
          </>
        )}
      </Box>

      {/* Separator */}
      <Text>{'─'.repeat(100)}</Text>

      {/* Rows */}
      {tasks.map((task) => (
        <Box key={task.id}>
          <Box width={10}>
            <Text color="cyan">{task.id.slice(0, 8)}</Text>
          </Box>
          <Box width={25} paddingLeft={1}>
            <Text>{task.title.length > 22 ? task.title.slice(0, 22) + '...' : task.title}</Text>
          </Box>
          <Box width={10} paddingLeft={1}>
            <Text color={task.is_completed ? "green" : "yellow"}>
              {task.is_completed ? '✅ Done' : '⏳ Todo'}
            </Text>
          </Box>
          <Box width={5} paddingLeft={1}>
            <Text>{formatFocus(task)}</Text>
          </Box>
          <Box width={10} paddingLeft={1}>
            <Text>{formatPriority(task)}</Text>
          </Box>
          <Box width={15} paddingLeft={1}>
            <Text color="blue">{formatTags(task)}</Text>
          </Box>
          <Box width={16} paddingLeft={1}>
            <Text color="blue">{formatDateTime(task.created_at).slice(0, 14)}</Text>
          </Box>
          {showDetails && (
            <>
              <Box width={10} paddingLeft={1}>
                <Text color="gray">{task.parent_id ? task.parent_id.slice(0, 8) : 'None'}</Text>
              </Box>
              <Box width={8} paddingLeft={1}>
                <Text color="gray">{task.position}</Text>
              </Box>
              <Box width={16} paddingLeft={1}>
                <Text color="blue">{formatDateTime(task.start_time).slice(0, 14)}</Text>
              </Box>
              <Box width={16} paddingLeft={1}>
                <Text color="green">{formatDateTime(task.due_time).slice(0, 14)}</Text>
              </Box>
              <Box width={12} paddingLeft={1}>
                <Text color="gray">{task.attachments.length}</Text>
              </Box>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};