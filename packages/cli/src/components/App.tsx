/**
 * Main CLI application component
 */

import React from 'react';
import { Box, Text } from 'ink';
import { CoreContext } from '@cliofy/core';

interface AppProps {
  context: CoreContext;
}

export const App: React.FC<AppProps> = ({ context }) => {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        🚀 Cliofy CLI
      </Text>
      <Text>Yet another todo list with infinite hierarchical nesting</Text>
    </Box>
  );
};