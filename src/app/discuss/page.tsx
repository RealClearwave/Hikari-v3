"use client";

import { useCallback, useEffect, useState } from 'react';
import { Box, Heading, Flex, Text, VStack, HStack, Divider, Button, Badge, Link, Spinner, useToast } from '@chakra-ui/react';
import { FaComments } from 'react-icons/fa';
import NextLink from 'next/link';
import { BlogItem, getBlogList } from '@/api/blog';
import { useAuthStore } from '@/store/auth';

export default function DiscussListPage() {
  const [topics, setTopics] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((state) => state.user);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBlogList(1, 20);
      if (res.code === 0) {
        setTopics(res.data.list);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取讨论列表失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.800">讨论区 (Discuss)</Heading>
        <Button as={NextLink} href="/discuss/new" colorScheme="blue" leftIcon={<FaComments />}>发布新帖</Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
      ) : (
        <VStack spacing={0} align="stretch" divider={<Divider />}>
          {topics.map((topic) => (
            <Box key={topic.id} py={4} _hover={{ bg: 'gray.50' }} px={2} borderRadius="md" transition="background 0.2s">
              <Flex justify="space-between" align="center">
                <HStack spacing={4}>
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Badge colorScheme={topic.type === 1 ? 'green' : 'blue'}>{topic.type === 1 ? '题解' : '博客'}</Badge>
                      {(topic.tags || []).map((tag) => (
                        <Badge key={`${topic.id}-${tag}`} colorScheme={tag === '题解' ? 'green' : 'gray'}>{tag}</Badge>
                      ))}
                    </HStack>
                    <Link as={NextLink} href={`/discuss/${topic.id}`}>
                      <Text fontSize="lg" fontWeight="bold" color="blue.600" cursor="pointer" _hover={{ textDecoration: 'underline' }}>
                        {topic.title}
                      </Text>
                    </Link>
                    <HStack fontSize="sm" color="gray.500" spacing={4}>
                      <Text>用户ID: {topic.user_id}</Text>
                      {topic.type === 1 && topic.problem_id > 0 && (
                        <Link as={NextLink} href={`/problem/${topic.problem_id}`} color="green.600" _hover={{ textDecoration: 'underline' }}>
                          题号: {topic.problem_id}
                        </Link>
                      )}
                      <Text>更新于 {new Date(topic.updated_at).toLocaleString()}</Text>
                    </HStack>
                  </VStack>
                </HStack>

                <HStack spacing={6} color="gray.500" fontSize="sm" display={{ base: 'none', md: 'flex' }}>
                  {(currentUser?.role === 1 || currentUser?.id === topic.user_id) && (
                    <Button
                      as={NextLink}
                      href={`/discuss/${topic.id}/edit`}
                      size="xs"
                      colorScheme="blue"
                      variant="ghost"
                    >
                      编辑
                    </Button>
                  )}
                  <VStack spacing={0}>
                    <Text fontWeight="bold" color="gray.700">{topic.views}</Text>
                    <Text>浏览</Text>
                  </VStack>
                </HStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
