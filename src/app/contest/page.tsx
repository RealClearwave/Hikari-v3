"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  Icon,
  Link,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { Contest, getContestList } from '@/api/contest';
import { useAuthStore } from '@/store/auth';

const PAGE_SIZE = 20;

function getStatusBadge(contest: Contest) {
  const now = Date.now();
  const start = new Date(contest.start_time).getTime();
  const end = new Date(contest.end_time).getTime();

  if (now < start) return <Badge colorScheme="blue">未开始</Badge>;
  if (now <= end) return <Badge colorScheme="green">进行中</Badge>;
  return <Badge colorScheme="gray">已结束</Badge>;
}

export default function ContestListPage() {
  const [list, setList] = useState<Contest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const isAdmin = useAuthStore((s) => s.user?.role === 1);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContestList(page, PAGE_SIZE);
      if (res.code === 0) {
        setList(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取比赛列表失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Box bg={{ base: "white", _dark: "gray.800" }} p={6} borderWidth={1} borderColor="blackAlpha.200" borderRadius="md" boxShadow="sm">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">比赛 (Contests)</Heading>
        <HStack spacing={3}>
          <Text color="gray.500" fontSize="sm">总计 {total} 场</Text>
          {isAdmin && (
            <Button as={NextLink} href="/admin/contest/new" colorScheme="blue" size="sm" leftIcon={<Icon as={FiPlus} />}>
              创建比赛
            </Button>
          )}
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
      ) : (
        <>
          <Table variant="simple">
            <Thead bg="blackAlpha.50">
              <Tr>
                <Th w="10%">状态</Th>
                <Th>比赛名称</Th>
                <Th w="22%">开始时间</Th>
                <Th w="22%">结束时间</Th>
              </Tr>
            </Thead>
            <Tbody>
              {list.map((c) => (
                <Tr key={c.id} _hover={{ bg: "blackAlpha.50" }}>
                  <Td>{getStatusBadge(c)}</Td>
                  <Td>
                    <Link as={NextLink} href={`/contest/${c.id}`} color="blue.500" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>
                      {c.title}
                    </Link>
                  </Td>
                  <Td color="gray.600">{new Date(c.start_time).toLocaleString()}</Td>
                  <Td color="gray.600">{new Date(c.end_time).toLocaleString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex justify="center" mt={6}>
            <HStack>
              <Button size="sm" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
              <Button size="sm" colorScheme="blue">{page}</Button>
              <Button size="sm" isDisabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>下一页</Button>
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
}
