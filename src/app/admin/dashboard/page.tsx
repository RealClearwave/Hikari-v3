"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Card,
  CardBody,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import {
  FiUsers,
  FiBookOpen,
  FiSend,
  FiAward,
  FiActivity,
  FiTrendingUp,
  FiCalendar,
  FiCheckCircle,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/auth';
import request, { ApiResponse } from '@/utils/request';

interface DashboardStats {
  total_users: number;
  total_problems: number;
  total_submissions: number;
  total_contests: number;
  total_accepted: number;
  accept_rate: number;
  active_users_today: number;
  submissions_today: number;
  recent_contests: Array<{
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    participant_count: number;
  }>;
  top_users: Array<{
    user_id: number;
    username: string;
    role: number;
    badge: string;
    accepted: number;
    rating: number;
  }>;
  daily_submissions: Array<{
    day: string;
    count: number;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res: ApiResponse<DashboardStats> = await request.get('/admin/dashboard');
      if (res.code === 0) {
        setStats(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载失败';
      toast({ title: '加载仪表盘失败', description: msg, status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!user || user.role !== 1) {
    return (
      <Container maxW="1200px" py={12}>
        <Card>
          <CardBody>
            <Heading size="md" color="red.500">无权限访问</Heading>
            <Text mt={2} color="gray.500">此页面仅限管理员访问。</Text>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Flex justify="center" py={12}><Spinner size="xl" /></Flex>
    );
  }

  if (!stats) {
    return (
      <Container maxW="1200px" py={12}>
        <Text color="gray.500" textAlign="center">无法加载数据。</Text>
      </Container>
    );
  }

  const maxDailySubmissions = Math.max(1, ...stats.daily_submissions.map((d) => d.count));

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 6, md: 10 }}>
      <Container maxW="1200px">
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">管理后台 · 全景监控仪表盘</Heading>
          <HStack spacing={3}>
            <Badge colorScheme="green" variant="solid" fontSize="sm">Admin</Badge>
            <Text color="gray.500" fontSize="sm">实时系统概览</Text>
          </HStack>
        </Flex>

        {/* Key Metrics */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Card>
            <CardBody>
              <Stat>
                <Flex align="center" gap={2}>
                  <Icon as={FiUsers} color="blue.500" boxSize={5} />
                  <StatLabel>总用户数</StatLabel>
                </Flex>
                <StatNumber>{stats.total_users}</StatNumber>
                <StatHelpText>今日活跃 {stats.active_users_today} 人</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <Flex align="center" gap={2}>
                  <Icon as={FiBookOpen} color="green.500" boxSize={5} />
                  <StatLabel>总题目数</StatLabel>
                </Flex>
                <StatNumber>{stats.total_problems}</StatNumber>
                <StatHelpText>题库规模</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <Flex align="center" gap={2}>
                  <Icon as={FiSend} color="purple.500" boxSize={5} />
                  <StatLabel>总提交数</StatLabel>
                </Flex>
                <StatNumber>{stats.total_submissions}</StatNumber>
                <StatHelpText>
                  今日 {stats.submissions_today} 次 · 通过率 {stats.accept_rate}%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <Flex align="center" gap={2}>
                  <Icon as={FiAward} color="orange.500" boxSize={5} />
                  <StatLabel>总竞赛数</StatLabel>
                </Flex>
                <StatNumber>{stats.total_contests}</StatNumber>
                <StatHelpText>
                  <Icon as={FiCheckCircle} color="green.400" mr={1} />
                  AC 总数 {stats.total_accepted}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6} mb={6}>
          {/* Submission Trend */}
          <GridItem>
            <Card>
              <CardBody>
                <Flex align="center" gap={2} mb={4}>
                  <Icon as={FiActivity} color="blue.500" boxSize={5} />
                  <Heading size="md">近 30 天提交趋势</Heading>
                </Flex>
                {stats.daily_submissions.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={6}>暂无数据</Text>
                ) : (
                  <Box>
                    <Flex align="flex-end" gap="2px" h="120px" mb={2}>
                      {stats.daily_submissions.map((d) => {
                        const height = (d.count / maxDailySubmissions) * 100;
                        return (
                          <Box
                            key={d.day}
                            flex={1}
                            bg={d.count > 0 ? 'blue.400' : 'gray.100'}
                            borderRadius="sm  sm 0 0"
                            title={`${d.day}: ${d.count} 次提交`}
                            minH={`${Math.max(height, d.count > 0 ? 4 : 1)}%`}
                            transition="all 0.2s"
                            _hover={{ bg: d.count > 0 ? 'blue.600' : 'gray.200' }}
                          />
                        );
                      })}
                    </Flex>
                    <Flex justify="space-between" fontSize="xs" color="gray.400">
                      <Text>{stats.daily_submissions[0]?.day || '-'}</Text>
                      <Text>
                        总计 {stats.daily_submissions.reduce((s, d) => s + d.count, 0)} 次
                      </Text>
                      <Text>{stats.daily_submissions[stats.daily_submissions.length - 1]?.day || '-'}</Text>
                    </Flex>
                  </Box>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* Recent Contests */}
          <GridItem>
            <Card>
              <CardBody>
                <Flex align="center" gap={2} mb={4}>
                  <Icon as={FiCalendar} color="orange.500" boxSize={5} />
                  <Heading size="md">最近竞赛</Heading>
                </Flex>
                {stats.recent_contests.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={6}>暂无竞赛</Text>
                ) : (
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>标题</Th>
                        <Th isNumeric>人数</Th>
                        <Th>状态</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {stats.recent_contests.map((c) => {
                        const now = Date.now();
                        const end = new Date(c.end_time).getTime();
                        const isEnded = now > end;
                        return (
                          <Tr key={c.id}>
                            <Td>
                              <Link as={NextLink} href={`/contest/${c.id}`} color="blue.500" fontSize="sm">
                                {c.title}
                              </Link>
                            </Td>
                            <Td isNumeric fontSize="sm">{c.participant_count}</Td>
                            <Td>
                              <Badge colorScheme={isEnded ? 'gray' : 'green'} fontSize="xs">
                                {isEnded ? '已结束' : '进行中'}
                              </Badge>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Top Users */}
        <Card>
          <CardBody>
            <Flex align="center" gap={2} mb={4}>
              <Icon as={FiTrendingUp} color="purple.500" boxSize={5} />
              <Heading size="md">TOP 10 用户排行榜</Heading>
            </Flex>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>排名</Th>
                  <Th>用户</Th>
                  <Th>角色</Th>
                  <Th isNumeric>Rating</Th>
                  <Th isNumeric>AC 数</Th>
                </Tr>
              </Thead>
              <Tbody>
                {stats.top_users.map((u, idx) => (
                  <Tr key={u.user_id} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="bold">
                      {idx + 1 <= 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                    </Td>
                    <Td>
                      <Link as={NextLink} href={`/user/profile?uid=${u.user_id}`} color="blue.500">
                        {u.username}
                      </Link>
                      {u.badge && <Badge ml={2} colorScheme="purple" fontSize="xs">{u.badge}</Badge>}
                    </Td>
                    <Td>
                      <Badge colorScheme={u.role === 1 ? 'red' : 'gray'} fontSize="xs">
                        {u.role === 1 ? 'Admin' : 'User'}
                      </Badge>
                    </Td>
                    <Td isNumeric fontWeight="bold" color="purple.600">{u.rating}</Td>
                    <Td isNumeric fontWeight="bold" color="green.600">{u.accepted}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
