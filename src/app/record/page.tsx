"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Heading,
  Flex,
  Input,
  HStack,
  Button,
  Link,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { getRecordList, RecordItem } from '@/api/record';

const PAGE_SIZE = 20;

function statusText(status: number) {
  const map: Record<number, { text: string; scheme: string }> = {
    0: { text: 'Pending', scheme: 'gray' },
    1: { text: 'Judging', scheme: 'blue' },
    2: { text: 'Accepted', scheme: 'green' },
    3: { text: 'Wrong Answer', scheme: 'red' },
    4: { text: 'Time Limit Exceeded', scheme: 'orange' },
    5: { text: 'Memory Limit Exceeded', scheme: 'orange' },
    6: { text: 'Runtime Error', scheme: 'pink' },
    7: { text: 'Compile Error', scheme: 'purple' },
  };
  return map[status] || { text: `Status ${status}`, scheme: 'gray' };
}

export default function RecordListPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userIdInput, setUserIdInput] = useState('');
  const [problemIdInput, setProblemIdInput] = useState('');
  const [userIdFilter, setUserIdFilter] = useState<number | undefined>(undefined);
  const [problemIdFilter, setProblemIdFilter] = useState<number | undefined>(undefined);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecordList(page, PAGE_SIZE, problemIdFilter, userIdFilter);
      if (res.code === 0) {
        setRecords(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取评测记录失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [page, problemIdFilter, userIdFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilter = () => {
    setPage(1);
    setUserIdFilter(userIdInput.trim() ? Number(userIdInput) : undefined);
    setProblemIdFilter(problemIdInput.trim() ? Number(problemIdInput) : undefined);
  };

  return (
    <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Heading size="lg" mb={6} color="gray.800">评测状态 (Status)</Heading>

      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={4}>
        <HStack spacing={4} flexWrap="wrap">
          <Input placeholder="用户ID" w="150px" value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} />
          <Input placeholder="题目ID" w="150px" value={problemIdInput} onChange={(e) => setProblemIdInput(e.target.value)} />
          <Button colorScheme="blue" onClick={applyFilter}>筛选</Button>
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" size="md">
            <Thead bg="gray.50">
              <Tr>
                <Th>记录 ID</Th>
                <Th>状态</Th>
                <Th>题目</Th>
                <Th>耗时</Th>
                <Th>内存</Th>
                <Th>语言</Th>
                <Th>用户ID</Th>
                <Th>提交时间</Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((r) => {
                const s = statusText(r.status);
                return (
                  <Tr key={r.id} _hover={{ bg: 'gray.50' }}>
                    <Td>
                      <Link as={NextLink} href={`/record/${r.id}`} fontWeight="bold" color="blue.500" _hover={{ textDecoration: 'underline' }}>
                        {r.id}
                      </Link>
                    </Td>
                    <Td><Badge colorScheme={s.scheme}>{s.text}</Badge></Td>
                    <Td>
                      <Link as={NextLink} href={`/problem/${r.problem_id}`} color="blue.500" _hover={{ textDecoration: 'underline' }}>
                        {r.problem_id}
                      </Link>
                    </Td>
                    <Td color="gray.600">{r.time_used} ms</Td>
                    <Td color="gray.600">{r.memory_used} KB</Td>
                    <Td color="gray.600">{r.language}</Td>
                    <Td color="gray.600">{r.user_id}</Td>
                    <Td color="gray.500" fontSize="sm">{new Date(r.created_at).toLocaleString()}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}

      <Flex justify="center" mt={6}>
        <HStack>
          <Button size="sm" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
          <Button size="sm" colorScheme="blue">{page}</Button>
          <Button size="sm" isDisabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>下一页</Button>
        </HStack>
      </Flex>
    </Box>
  );
}
