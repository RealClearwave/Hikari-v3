"use client";

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Link as ChakraLink,
  useToast,
  Container,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/api/user';
import { useAuthStore } from '@/store/auth';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const loginAction = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await login({ username, password });
      if (res.code === 0) {
        loginAction(res.data.user, res.data.token);
        toast({
          title: 'Success',
          description: 'Login successful',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        router.push('/');
      } else {
        toast({
          title: 'Error',
          description: res.msg || 'Login failed',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={10}>
      <Box p={8} borderWidth={1} borderRadius={8} boxShadow="lg" bg="white">
        <VStack spacing={4} as="form" onSubmit={handleSubmit}>
          <Heading size="lg">Login</Heading>
          
          <FormControl isRequired>
            <FormLabel>Username</FormLabel>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={loading}
            mt={4}
          >
            Login
          </Button>

          <Text>
            Don&apos;t have an account?{' '}
            <ChakraLink as={NextLink} href="/user/register" color="blue.500">
              Register here
            </ChakraLink>
          </Text>
        </VStack>
      </Box>
    </Container>
  );
};

export default Login;
