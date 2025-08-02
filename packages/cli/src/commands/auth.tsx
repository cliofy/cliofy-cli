/**
 * Authentication commands component
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import { CoreContext } from '@cliofy/core';
import { useInput } from '../hooks/useInput';
import { Spinner } from '../components/Spinner';

interface AuthCommandProps {
  subcommand: string;
  context: CoreContext;
  args: any;
}

export const AuthCommand: React.FC<AuthCommandProps> = ({ subcommand, context, args }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthCommand();
  }, []);

  const handleAuthCommand = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      switch (subcommand) {
        case 'login':
          await handleLogin();
          break;
        case 'register':
          await handleRegister();
          break;
        case 'logout':
          handleLogout();
          break;
        case 'status':
          handleStatus();
          break;
        case 'verify':
          await handleVerify();
          break;
        case 'whoami':
          await handleWhoami();
          break;
        default:
          setError(`Unknown auth subcommand: ${subcommand}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (): Promise<void> => {
    // For now, we'll use a simple login process
    // In a full implementation, we'd use inquirer for interactive prompts
    const email = args.email || 'demo@example.com';
    const password = args.password || 'password123';

    const loginResult = await context.authManager.login(email, password);
    
    if (loginResult.success) {
      setResult({
        type: 'success',
        message: `Successfully logged in as ${loginResult.user?.email}`,
        user: loginResult.user,
      });
    } else {
      setError(loginResult.error || 'Login failed');
    }
  };

  const handleRegister = async (): Promise<void> => {
    const email = args.email || 'demo@example.com';
    const password = args.password || 'password123';

    const registerResult = await context.authManager.register(email, password);
    
    if (registerResult.success) {
      setResult({
        type: 'success',
        message: `Account created for ${registerResult.user?.email}. Please login separately.`,
        user: registerResult.user,
      });
    } else {
      setError(registerResult.error || 'Registration failed');
    }
  };

  const handleLogout = (): void => {
    context.authManager.logout();
    setResult({
      type: 'success',
      message: 'Successfully logged out. Your session has been cleared.',
    });
  };

  const handleStatus = (): void => {
    const authState = context.authManager.exportAuthState();
    
    if (args.json) {
      setResult({
        type: 'json',
        data: authState,
      });
    } else {
      setResult({
        type: 'status',
        authState,
      });
    }
  };

  const handleVerify = async (): Promise<void> => {
    if (!context.authManager.isAuthenticated()) {
      setError('Not authenticated. Please run \\'cliofy auth login\\' first.');
      return;
    }

    const verifyResult = await context.authManager.verifyToken();
    
    if (args.json) {
      setResult({
        type: 'json',
        data: verifyResult,
      });
    } else {
      setResult({
        type: 'verify',
        verifyResult,
      });
    }
  };

  const handleWhoami = async (): Promise<void> => {
    if (!context.authManager.isAuthenticated()) {
      setError('Not authenticated. Please run \\'cliofy auth login\\' first.');
      return;
    }

    const userResult = await context.authManager.getCurrentUser();
    
    if (userResult.success) {
      if (args.json) {
        setResult({
          type: 'json',
          data: userResult.user,
        });
      } else {
        setResult({
          type: 'user',
          user: userResult.user,
        });
      }
    } else {
      setError(userResult.error || 'Failed to get user information');
    }
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

    if (result.type === 'success') {
      return (
        <Box borderStyle="round" borderColor="green" padding={1}>
          <Text color="green">✅ {result.message}</Text>
          {result.user && (
            <>
              <Newline />
              <Text>User ID: {result.user.id}</Text>
              <Text>Email: {result.user.email}</Text>
            </>
          )}
        </Box>
      );
    }

    if (result.type === 'status') {
      const { authState } = result;
      return (
        <Box borderStyle="round" borderColor={authState.isAuthenticated ? "green" : "red"} padding={1}>
          <Text color={authState.isAuthenticated ? "green" : "red"} bold>
            {authState.isAuthenticated ? "✅ Logged in" : "❌ Not logged in"}
          </Text>
          <Newline />
          {authState.isAuthenticated ? (
            <>
              <Text>User ID: {authState.userId}</Text>
              <Text>Last Login: {authState.lastLogin || 'Unknown'}</Text>
              <Text>Status: {authState.authStatus}</Text>
            </>
          ) : (
            <Text>Run 'cliofy auth login' to authenticate.</Text>
          )}
        </Box>
      );
    }

    if (result.type === 'verify') {
      const { verifyResult } = result;
      return (
        <Box borderStyle="round" borderColor={verifyResult.valid ? "green" : "red"} padding={1}>
          <Text color={verifyResult.valid ? "green" : "red"} bold>
            {verifyResult.valid ? "✅ Token is valid" : "❌ Token is invalid"}
          </Text>
          <Newline />
          {verifyResult.valid ? (
            <Text>User ID: {verifyResult.userId}</Text>
          ) : (
            <Text>Error: {verifyResult.error}</Text>
          )}
        </Box>
      );
    }

    if (result.type === 'user') {
      const { user } = result;
      return (
        <Box borderStyle="round" borderColor="blue" padding={1}>
          <Text color="blue" bold>👤 {user.email}</Text>
          <Newline />
          <Text>User ID: {user.id}</Text>
          <Text>Created: {user.created_at}</Text>
          <Text>Last Login: {user.last_sign_in_at || 'Unknown'}</Text>
        </Box>
      );
    }
  }

  return <Text>Unknown result type</Text>;
};