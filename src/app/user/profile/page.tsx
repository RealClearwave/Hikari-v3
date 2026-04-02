"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Heading, Text, Avatar, Flex, VStack, Divider, Grid, GridItem, Badge, Link, Spinner, useToast } from '@chakra-ui/react';
import NextLink from 'next/link';
import { getRecordList, RecordItem } from '@/api/record';

export default function UserProfilePage() {
  const [uid, setUid] = useState(0);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const nextUid = Number(params.get('uid') || 0);
    setUid(Number.isFinite(nextUid) ? nextUid : 0);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecordList(1, 500, undefined, uid > 0 ? uid : undefined);
      if (res.code === 0) setRecords(res.data.list);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '加载失败';
      toast({ title: '获取用户数据失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [toast, uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const accepted = records.filter((r) => r.status === 2).length;
    const solvedSet = new Set(records.filter((r) => r.status === 2).map((r) => r.problem_id));
    const rating = 1000 + accepted * 20;
    return {
      accepted,
      submissions: records.length,
      solvedProblems: Array.from(solvedSet).sort((a, b) => a - b),
      rating,
    };
  }, [records]);

  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 3fr' }} gap={6}>
      <GridItem>
        <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" textAlign="center">
          {loading ? (
            <Flex justify="center" py={6}><Spinner size="lg" /></Flex>
          ) : (
            <>
              <Avatar size="2xl" name={`User ${uid || 0}`} mb={4} />
              <Heading size="lg" mb={2}>User #{uid || 0}</Heading>
              <Badge colorScheme="purple" bg="#8e44ad" color="white" mb={4}>Data Driven</Badge>
              <Text color="gray.600" fontSize="sm" mb={6}>Profile generated from real submission records.</Text>

              <Divider mb={4} />

              <VStack align="stretch" spacing={3} textAlign="left">
                <Flex justify="space-between">
                  <Text color="gray.500">积分 (Rating)</Text>
                  <Text fontWeight="bold" color="purple.600">{stats.rating}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color="gray.500">解决题数</Text>
                  <Text fontWeight="bold">{stats.solvedProblems.length}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color="gray.500">通过数</Text>
                  <Text fontWeight="bold">{stats.accepted}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color="gray.500">提交总数</Text>
                  <Text fontWeight="bold">{stats.submissions}</Text>
                </Flex>
              </VStack>
            </>
          )}
        </Box>
      </GridItem>

      <GridItem>
        <VStack spacing={6} align="stretch">
          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
            <Heading size="md" mb={4} borderLeft="4px solid" borderColor="blue.500" pl={3}>解决的题目</Heading>
            {loading ? (
              <Flex justify="center" py={4}><Spinner /></Flex>
            ) : (
              <Flex flexWrap="wrap" gap={2}>
                {stats.solvedProblems.map((pid) => (
                  <Link as={NextLink} key={pid} href={`/problem/${pid}`}>
                    <Badge colorScheme="green" variant="subtle" px={2} py={1} cursor="pointer" _hover={{ bg: 'green.200' }}>
                      {pid}
                    </Badge>
                  </Link>
                ))}
              </Flex>
            )}
          </Box>

          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
            <Heading size="md" mb={4} borderLeft="4px solid" borderColor="blue.500" pl={3}>最近提交的记录</Heading>
            {loading ? (
              <Flex justify="center" py={4}><Spinner /></Flex>
            ) : (
              <VStack align="stretch" spacing={2}>
                {records.slice(0, 8).map((r) => (
                  <Link key={r.id} as={NextLink} href={`/record/${r.id}`} color="blue.500" _hover={{ textDecoration: 'underline' }}>
                    #{r.id} - Problem {r.problem_id} - {new Date(r.created_at).toLocaleString()}
                  </Link>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </GridItem>
    </Grid>
  );
}
