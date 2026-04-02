"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Link,
  Progress,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { ContestDetailResponse, getContestDetail } from '@/api/contest';
import UserName from '@/components/UserName';

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

function calcContestStatus(startTime: string, endTime: string) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (now < start) return { text: '未开始', scheme: 'blue' as const };
  if (now <= end) return { text: '进行中', scheme: 'green' as const };
  return { text: '已结束', scheme: 'gray' as const };
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ContestDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const contestId = Number(id);

  const loadData = useCallback(async () => {
    if (!Number.isFinite(contestId) || contestId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getContestDetail(contestId);
      if (res.code === 0) {
        setData(res.data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取比赛详情失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [contestId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const contest = data?.contest;
  const status = contest ? calcContestStatus(contest.start_time, contest.end_time) : null;

  const progress = useMemo(() => {
    if (!contest) return 0;
    const start = new Date(contest.start_time).getTime();
    const end = new Date(contest.end_time).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return ((now - start) / (end - start)) * 100;
  }, [contest]);

  if (loading) {
    return (
      <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
    );
  }

  if (!data || !contest || !status) {
    return (
      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Heading size="md" mb={2}>比赛不存在</Heading>
        <Text color="gray.500">比赛 ID: {id}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Flex justify="space-between" align="start" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl" mb={2} color="gray.800">比赛 {contest.id}: {contest.title}</Heading>
            <Flex color="gray.600" mb={4} gap={2} align="center">
              <Text>Hosted by:</Text>
              <UserName
                username={contest.creator_name || `User #${contest.created_by}`}
                userId={contest.created_by}
                role={contest.creator_role}
                badge={contest.creator_badge}
                acceptedCount={contest.creator_accepted_count}
              />
            </Flex>
          </Box>
          <Box textAlign="right" p={4} bg="gray.50" borderRadius="md" borderWidth={1}>
            <Text fontSize="sm" color="gray.500" mb={1}>Current Status</Text>
            <Badge colorScheme={status.scheme} fontSize="md" px={3} py={1} borderRadius="full">{status.text}</Badge>
          </Box>
        </Flex>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mb={4}>
          <GridItem>
            <Text color="gray.500" fontSize="sm">Start Time</Text>
            <Text fontWeight="bold">{new Date(contest.start_time).toLocaleString()}</Text>
          </GridItem>
          <GridItem>
            <Text color="gray.500" fontSize="sm">End Time</Text>
            <Text fontWeight="bold">{new Date(contest.end_time).toLocaleString()}</Text>
          </GridItem>
          <GridItem>
            <Text color="gray.500" fontSize="sm">Contest Type</Text>
            <Text fontWeight="bold">{contest.type === 1 ? 'OI / Public' : 'ACM / Public'}</Text>
          </GridItem>
        </Grid>

        <Box mt={4}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm" fontWeight="bold" color="blue.600">Progress: {progress.toFixed(1)}%</Text>
            <Text fontSize="sm" color="gray.500">题目 {data.problems.length} | 提交 {data.submissions.length}</Text>
          </Flex>
          <Progress value={progress} colorScheme="blue" borderRadius="md" size="sm" hasStripe isAnimated={status.text === '进行中'} />
        </Box>
      </Box>

      <Box bg="white" borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Tabs colorScheme="blue" size="lg">
          <TabList px={4} bg="gray.50">
            <Tab fontWeight="medium" py={4}>Overview</Tab>
            <Tab fontWeight="medium" py={4}>Problems</Tab>
            <Tab fontWeight="medium" py={4}>Submissions</Tab>
            <Tab fontWeight="medium" py={4}>Standings</Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={6}>
              <Heading size="md" mb={4}>比赛介绍</Heading>
              <Text mb={4} whiteSpace="pre-wrap">{contest.description || '暂无比赛描述。'}</Text>
              <Text color="gray.500">当前比赛包含 {data.problems.length} 道题目，已产生 {data.submissions.length} 条提交记录。</Text>
            </TabPanel>

            <TabPanel p={0}>
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th w="10%"></Th>
                    <Th w="15%">#</Th>
                    <Th>Title</Th>
                    <Th w="20%" isNumeric>AC / Total</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.problems.map((p) => {
                    const acRate = p.submit_count > 0 ? p.ac_count / p.submit_count : 0;
                    const badge = acRate >= 0.5 ? 'green' : acRate >= 0.2 ? 'yellow' : 'red';
                    return (
                      <Tr key={p.problem_id} _hover={{ bg: 'gray.50' }}>
                        <Td>
                          {p.ac_count > 0 ? <Badge colorScheme={badge}>{p.ac_count > 10 ? 'Hot' : 'AC'}</Badge> : null}
                        </Td>
                        <Td fontWeight="bold">{p.display_id}</Td>
                        <Td>
                          <Link as={NextLink} href={`/problem/${p.problem_id}`} color="blue.500" fontWeight="medium">
                            {p.title || `Problem ${p.problem_id}`}
                          </Link>
                        </Td>
                        <Td isNumeric>{p.ac_count} / {p.submit_count}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TabPanel>

            <TabPanel p={0}>
              {data.submissions.length === 0 ? (
                <Text color="gray.500" textAlign="center" p={6}>该比赛暂无提交记录。</Text>
              ) : (
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>ID</Th>
                      <Th>用户</Th>
                      <Th>题目</Th>
                      <Th>状态</Th>
                      <Th>语言</Th>
                      <Th>耗时</Th>
                      <Th>时间</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.submissions.map((s) => {
                      const meta = statusText(s.status);
                      return (
                        <Tr key={s.id} _hover={{ bg: 'gray.50' }}>
                          <Td><Link as={NextLink} href={`/record/${s.id}`} color="blue.500">{s.id}</Link></Td>
                          <Td>
                            <UserName
                              username={s.username || `User #${s.user_id}`}
                              userId={s.user_id}
                              role={s.role}
                              badge={s.badge}
                              acceptedCount={s.accepted_count}
                            />
                          </Td>
                          <Td>{s.display_id || s.problem_id}</Td>
                          <Td><Badge colorScheme={meta.scheme}>{meta.text}</Badge></Td>
                          <Td>{s.language}</Td>
                          <Td>{s.time_used} ms</Td>
                          <Td color="gray.500">{new Date(s.created_at).toLocaleString()}</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </TabPanel>

            <TabPanel p={0}>
              {data.standings.length === 0 ? (
                <Text color="gray.500" textAlign="center" p={6}>暂无排行榜数据。</Text>
              ) : (
                <Table variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Rank</Th>
                      <Th>用户</Th>
                      <Th isNumeric>Solved</Th>
                      <Th isNumeric>Accepted</Th>
                      <Th isNumeric>Submissions</Th>
                      <Th isNumeric>Wrong</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.standings.map((u, idx) => (
                      <Tr key={u.user_id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="bold">#{idx + 1}</Td>
                        <Td>
                          <UserName
                            username={u.username || `User #${u.user_id}`}
                            userId={u.user_id}
                            role={u.role}
                            badge={u.badge}
                            acceptedCount={u.accepted}
                          />
                        </Td>
                        <Td isNumeric>{u.solved}</Td>
                        <Td isNumeric>{u.accepted}</Td>
                        <Td isNumeric>{u.submissions}</Td>
                        <Td isNumeric>{u.wrong_attempts}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
}
