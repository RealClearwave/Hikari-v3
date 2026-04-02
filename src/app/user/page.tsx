"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Avatar, Flex, Badge, Text, Link, Spinner, useToast } from '@chakra-ui/react';
import NextLink from 'next/link';
import { getRecordList, RecordItem } from '@/api/record';

interface UserRankRow {
  userId: number;
  accepted: number;
  submissions: number;
  rating: number;
}

export default function UserRankPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecordList(1, 500);
      if (res.code === 0) setRecords(res.data.list);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '加载失败';
      toast({ title: '获取用户榜单失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rows = useMemo<UserRankRow[]>(() => {
    const map = new Map<number, UserRankRow>();
    for (const r of records) {
      const cur = map.get(r.user_id) || { userId: r.user_id, accepted: 0, submissions: 0, rating: 0 };
      cur.submissions += 1;
      if (r.status === 2) cur.accepted += 1;
      cur.rating = 1000 + cur.accepted * 20;
      map.set(r.user_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.rating - a.rating || b.accepted - a.accepted);
  }, [records]);

  return (
    <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Heading size="lg" mb={6} color="gray.800">用户排名 (Rank)</Heading>

      {loading ? (
        <Flex justify="center" py={10}><Spinner size="lg" /></Flex>
      ) : (
        <Table variant="simple" size="lg">
          <Thead bg="gray.50">
            <Tr>
              <Th w="10%">Rank</Th>
              <Th colSpan={2}>User</Th>
              <Th isNumeric>Accepted</Th>
              <Th isNumeric>Submissions</Th>
              <Th isNumeric>Rating</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((u, idx) => (
              <Tr key={u.userId} _hover={{ bg: 'gray.50' }}>
                <Td fontWeight="bold" fontSize="lg" color="gray.600">{idx + 1}</Td>
                <Td w="60px">
                  <Avatar size="sm" name={`User ${u.userId}`} cursor="pointer" />
                </Td>
                <Td>
                  <Flex align="center">
                    <Link as={NextLink} href={`/user/profile?uid=${u.userId}`} _hover={{ textDecoration: 'underline' }}>
                      <Text fontWeight="bold" color="purple.600" mr={3} fontSize="md">User #{u.userId}</Text>
                    </Link>
                    <Badge bg="#8e44ad" color="white" borderRadius="sm" px={2} py={0.5}>Active</Badge>
                  </Flex>
                </Td>
                <Td isNumeric fontWeight="medium" color="gray.700">{u.accepted}</Td>
                <Td isNumeric fontWeight="medium" color="gray.700">{u.submissions}</Td>
                <Td isNumeric fontWeight="bold" color="gray.800">{u.rating}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}
