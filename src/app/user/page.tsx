"use client";

import { useCallback, useEffect, useState } from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Avatar, Flex, Badge, Text, Link, Spinner, useToast } from '@chakra-ui/react';
import NextLink from 'next/link';
import { getUserList, UserRankRow } from '@/api/user';

export default function UserRankPage() {
  const [rows, setRows] = useState<UserRankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserList(1, 100);
      if (res.code === 0) {
        setRows(res.data.list);
      }
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
                    <Avatar size="sm" name={u.username} src={u.avatar || undefined} cursor="pointer" />
                </Td>
                <Td>
                  <Flex align="center">
                    <Link as={NextLink} href={`/user/profile?uid=${u.userId}`} _hover={{ textDecoration: 'underline' }}>
                        <Text fontWeight="bold" color="purple.600" mr={3} fontSize="md">{u.username}</Text>
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
