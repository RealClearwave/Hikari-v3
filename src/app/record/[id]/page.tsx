"use client";

import React, { useEffect, useState } from 'react';
import { Avatar, Badge, Box, Code, Divider, Flex, Heading, HStack, Spinner, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { getRecordDetail, RecordDetail } from '@/api/record';

const statusMeta: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'gray' },
  1: { label: 'Judging', color: 'blue' },
  2: { label: 'Accepted', color: 'green' },
  3: { label: 'Wrong Answer', color: 'red' },
  4: { label: 'Time Limit Exceeded', color: 'orange' },
  5: { label: 'Memory Limit Exceeded', color: 'orange' },
  6: { label: 'Runtime Error', color: 'pink' },
  7: { label: 'Compile Error', color: 'purple' },
};

function statusText(status: number) {
  return statusMeta[status] || { label: `Status ${status}`, color: 'gray' };
}

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      const recordId = Number(id);
      if (!Number.isFinite(recordId) || recordId <= 0) {
        setError('无效记录 ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await getRecordDetail(recordId);
        if (res.code === 0) {
          if (active) {
            setRecord(res.data.record);
          }
        } else if (active) {
          setError(res.msg || '加载评测详情失败');
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : '加载评测详情失败');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (error || !record) {
    return (
      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Heading size="lg" mb={4} color="gray.800">评测详情 #{id}</Heading>
        <Text color="red.500">{error || '记录不存在'}</Text>
      </Box>
    );
  }

  const status = statusText(record.status);

  return (
    <Box>
      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="lg" color="gray.800">评测详情 #{record.id}</Heading>
            <Text color="gray.500" mt={1}>该页面展示数据库中的真实评测记录。</Text>
          </Box>
          <Badge colorScheme={status.color} fontSize="xl" px={4} py={1} borderRadius="md">
            {status.label}
          </Badge>
        </Flex>

        <Stack spacing={6} direction={{ base: 'column', md: 'row' }}>
          <Box flex={1}>
            <Text color="gray.500" fontSize="sm">题目</Text>
            <Text fontWeight="bold" color="blue.500" as={NextLink} href={`/problem/${record.problem_id}`}>
              {record.problem_id} - {record.problem_title || 'Unknown'}
            </Text>
          </Box>
          <Box flex={1}>
            <Text color="gray.500" fontSize="sm">用户</Text>
            <HStack spacing={3}>
              <Avatar size="sm" name={record.username} src={record.avatar || undefined} />
              <Text fontWeight="bold" color="purple.600" as={NextLink} href={`/user/profile?uid=${record.user_id}`}>
                {record.username}
              </Text>
            </HStack>
          </Box>
          <Box flex={1}>
            <Text color="gray.500" fontSize="sm">语言</Text>
            <Text fontWeight="bold">{record.language}</Text>
          </Box>
          <Box flex={1}>
            <Text color="gray.500" fontSize="sm">耗时</Text>
            <Text fontWeight="bold">{record.time_used} ms</Text>
          </Box>
          <Box flex={1}>
            <Text color="gray.500" fontSize="sm">内存</Text>
            <Text fontWeight="bold">{record.memory_used} KB</Text>
          </Box>
          <Box flex={1}>
            <Text color="gray.500" fontSize="sm">提交时间</Text>
            <Text fontWeight="bold">{new Date(record.created_at).toLocaleString()}</Text>
          </Box>
        </Stack>
      </Box>

      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Heading size="md" mb={4} borderLeft="4px solid" borderColor="blue.500" pl={3}>评测结果</Heading>
        <Box p={4} bg="gray.50" borderRadius="md" borderWidth={1} borderColor="gray.200">
          <Text fontWeight="700" color="gray.800" mb={2}>状态: {status.label}</Text>
          <Text color="gray.700" whiteSpace="pre-wrap">
            {record.error_info || '该记录通过了所有数据库样例测试。'}
          </Text>
        </Box>
      </Box>

      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Heading size="md" mb={4} borderLeft="4px solid" borderColor="blue.500" pl={3}>源代码</Heading>
        <Divider mb={4} />
        <Box bg="gray.900" p={4} borderRadius="md" overflowX="auto">
          <Code display="block" whiteSpace="pre" bg="transparent" color="gray.100">
            {record.code}
          </Code>
        </Box>
      </Box>
    </Box>
  );
}
