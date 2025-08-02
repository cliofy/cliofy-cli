/**
 * Health check command component
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import { CoreContext } from '@cliofy/core';
import { Spinner } from '../components/Spinner';

interface HealthCommandProps {
  context: CoreContext;
  args: any;
}

export const HealthCommand: React.FC<HealthCommandProps> = ({ context, args }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleHealthCheck();
  }, []);

  const handleHealthCheck = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const healthResult = await context.apiClient.healthCheck();
      
      if (args.json) {
        setResult({
          type: 'json',
          data: healthResult,
        });
      } else {
        setResult({
          type: 'health',
          health: healthResult,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box>
        <Spinner />
        <Text> Checking system health...</Text>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">❌ Health Check Failed</Text>
        <Newline />
        <Text color="red">Error: {error}</Text>
        <Newline />
        <Text>This usually means:</Text>
        <Text>• The API server is not running</Text>
        <Text>• Network connectivity issues</Text>
        <Text>• Invalid endpoint configuration</Text>
        <Newline />
        <Text>Current endpoint: {context.configManager.config.endpoint}</Text>
      </Box>
    );
  }

  // Render result
  if (result) {
    if (result.type === 'json') {
      return <Text>{JSON.stringify(result.data, null, 2)}</Text>;
    }

    if (result.type === 'health') {
      const { health } = result;
      return (
        <Box borderStyle="round" borderColor="green" padding={1}>
          <Text color="green" bold>✅ System is healthy</Text>
          <Newline />
          <Text><Text bold>Status:</Text> {health.status}</Text>
          <Text><Text bold>Timestamp:</Text> {new Date(health.timestamp).toLocaleString()}</Text>
          <Text><Text bold>Endpoint:</Text> {context.configManager.config.endpoint}</Text>
          <Text><Text bold>Timeout:</Text> {context.configManager.config.timeout}ms</Text>
          <Newline />
          <Text color="green">All systems operational 🚀</Text>
        </Box>
      );
    }
  }

  return <Text>Unknown result type</Text>;
};