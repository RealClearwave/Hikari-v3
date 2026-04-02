"use client";

import { useCallback, useEffect, useState } from 'react';
import { Box, Heading, Text, Avatar, Flex, VStack, HStack, Divider, Badge, Button, Textarea, Spinner, useToast } from '@chakra-ui/react';
import { useParams } from 'next/navigation';
import { BlogDetail, getBlogDetail } from '@/api/blog';

export default function DiscussDetail() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadData = useCallback(async () => {
    const blogId = Number(id);
    if (!Number.isFinite(blogId) || blogId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getBlogDetail(blogId);
      if (res.code === 0) {
        setBlog(res.data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取讨论详情失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <Box>
      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
      ) : !blog ? (
        <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
          <Heading size="md" color="gray.700" mb={2}>讨论不存在或已删除</Heading>
          <Text color="gray.500">帖子 ID: {id}</Text>
        </Box>
      ) : (
        <>
      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <HStack mb={4}>
          <Badge colorScheme="blue">博客</Badge>
          <Badge colorScheme="purple">ID: {blog.id}</Badge>
        </HStack>
        <Heading size="xl" mb={6} color="gray.800">
          {blog.title}
        </Heading>
        
        <Flex align="center" mb={6} justify="space-between">
          <HStack spacing={4}>
            <Avatar size="md" name={blog.username} src={blog.avatar || undefined} />
            <Box>
              <Text fontWeight="bold" color="purple.600">{blog.username}</Text>
              <Text fontSize="sm" color="gray.500">发表于 {new Date(blog.created_at).toLocaleString()}</Text>
            </Box>
          </HStack>
          <Text fontSize="sm" color="gray.500">浏览量: {blog.views}</Text>
        </Flex>

        <Divider mb={6} />

        <Box color="gray.700" fontSize="lg" lineHeight="tall" minH="200px" whiteSpace="pre-wrap">
          {blog.content}
        </Box>
      </Box>

      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Heading size="md" mb={6}>全部回复 (0)</Heading>
        <VStack spacing={6} align="stretch" divider={<Divider />}>
          <Box>
            <Text color="gray.500">当前还没有回复。</Text>
          </Box>
        </VStack>
      </Box>

      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Heading size="sm" mb={4}>发表回复</Heading>
        <Textarea placeholder="写下你的想法......" rows={5} mb={4} />
        <Flex justify="flex-end">
          <Button colorScheme="blue">发布</Button>
        </Flex>
      </Box>
        </>
      )}
    </Box>
  );
}