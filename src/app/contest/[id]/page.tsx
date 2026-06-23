"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
  Tfoot,
  Th,
  Thead,
  Tr,
  Tooltip,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { ContestDetailResponse, getContestDetail, joinContest } from '@/api/contest';
import { streamAiResponse } from '@/api/ai-stream';
import UserName from '@/components/UserName';
import { FiAlertTriangle, FiCpu, FiFlag, FiLock, FiRadio, FiShield, FiUsers, FiZap } from 'react-icons/fi';
import { useAuthStore } from '@/store/auth';

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

  if (now < start) return { text: '未开始', scheme: 'blue' as const, phase: 'before' as const };
  if (now <= end) return { text: '进行中', scheme: 'green' as const, phase: 'active' as const };
  return { text: '已结束', scheme: 'gray' as const, phase: 'after' as const };
}

function formatPenalty(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:00`;
  return `${m}:00`;
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ContestDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinPassword, setJoinPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const toast = useToast();
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const { isOpen: isPasswordModalOpen, onOpen: openPasswordModal, onClose: closePasswordModal } = useDisclosure();

  // AI states
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // SSE real-time standings
  const [sseEnabled, setSseEnabled] = useState(false);
  const [sseStandings, setSseStandings] = useState<ContestDetailResponse['standings'] | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

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
        // Show password modal if contest has password and user not joined
        if (res.data.contest.has_password && !res.data.user_joined && isLoggedIn) {
          openPasswordModal();
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取比赛详情失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [contestId, toast, isLoggedIn, openPasswordModal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoinContest = useCallback(async () => {
    if (!isLoggedIn) {
      toast({ title: '请先登录', status: 'warning', duration: 3000 });
      return;
    }

    setJoining(true);
    try {
      const res = await joinContest(contestId, joinPassword);
      if (res.code === 0) {
        toast({ title: '成功加入比赛！', status: 'success', duration: 2500 });
        closePasswordModal();
        setJoinPassword('');
        // Reload data
        await loadData();
      } else {
        toast({ title: res.msg || '加入失败', status: 'error', duration: 3000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加入失败';
      toast({ title: msg, status: 'error', duration: 3000 });
    } finally {
      setJoining(false);
    }
  }, [contestId, joinPassword, toast, loadData, isLoggedIn, closePasswordModal]);

  const handleAnalyzeContest = useCallback(async () => {
    setAiAnalyzing(true);
    setAiAnalysis("");
    try {
      await streamAiResponse("/ai/contest-analysis", { contestId }, (token) => {
        setAiAnalysis((prev) => (prev || "") + token);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 分析失败';
      toast({ title: msg, status: 'error', duration: 3000 });
    } finally {
      setAiAnalyzing(false);
    }
  }, [contestId, toast]);

  const contest = data?.contest;
  const status = contest ? calcContestStatus(contest.start_time, contest.end_time) : null;
  const isAccessible = data?.user_joined !== false; // true if joined or no password

  // Connect/disconnect SSE for real-time standings
  useEffect(() => {
    if (!sseEnabled || !contestId || status?.phase !== 'active') {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
        setSseConnected(false);
      }
      setSseStandings(null);
      return;
    }

    const es = new EventSource(`/api/v1/contest/${contestId}/standings-stream`);
    sseRef.current = es;

    es.addEventListener('standings', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setSseStandings(parsed.standings);
        setSseConnected(true);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('error', () => {
      setSseConnected(false);
    });

    es.onopen = () => {
      setSseConnected(true);
    };

    return () => {
      es.close();
      sseRef.current = null;
      setSseConnected(false);
    };
  }, [sseEnabled, contestId, status?.phase]);

  const progress = useMemo(() => {
    if (!contest) return 0;
    const start = new Date(contest.start_time).getTime();
    const end = new Date(contest.end_time).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return ((now - start) / (end - start)) * 100;
  }, [contest]);

  // Real-time countdown timer (updates every second)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!contest) return null;
    const start = new Date(contest.start_time).getTime();
    const end = new Date(contest.end_time).getTime();

    let target: number;
    let label: string;
    let urgent: boolean;
    if (now < start) {
      target = start;
      label = '距开始';
      urgent = false;
    } else if (now < end) {
      target = end;
      label = '距结束';
      urgent = (target - now) < 3600000; // last 1 hour = urgent
    } else {
      return { text: '已结束', label: '', urgent: false, expired: true };
    }

    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const parts = days > 0
      ? `${days}天 ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return { text: parts, label, urgent, expired: false };
  }, [contest, now]);

  // 封榜 (Rankings Freeze): last 60 minutes of contest
  const FREEZE_MINUTES = 60;
  const isFrozen = useMemo(() => {
    if (!contest || status?.phase !== 'active') return false;
    const end = new Date(contest.end_time).getTime();
    return (end - now) <= FREEZE_MINUTES * 60000 && (end - now) > 0;
  }, [contest, now, status]);

  // Pledge modal for contest entry
  const pledgeModal = useDisclosure();
  const [hasPledged, setHasPledged] = useState(false);

  // Compute standings with per-problem breakdown
  const problemDisplayIds = useMemo(() => {
    if (!data?.problems) return [];
    return data.problems.map(p => ({ problem_id: p.problem_id, display_id: p.display_id }));
  }, [data]);

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
      {/* Password Join Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={closePasswordModal} closeOnOverlayClick={false} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FiLock} color="orange.500" />
              <Text>需要密码</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} color="gray.600">
              比赛 &quot;{contest.title}&quot; 需要密码才能访问。请输入比赛密码加入。
            </Text>
            <Input
              type="password"
              placeholder="请输入比赛密码"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinContest(); }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closePasswordModal}>
              取消
            </Button>
            <Button colorScheme="blue" onClick={handleJoinContest} isLoading={joining} loadingText="验证中...">
              加入比赛
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Pledge Modal */}
      <Modal isOpen={pledgeModal.isOpen} onClose={pledgeModal.onClose} closeOnOverlayClick={false} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FiFlag} color="blue.500" />
              <Text>参赛选手宣誓</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box p={4} bg="blue.50" borderRadius="md" mb={4}>
              <VStack align="start" spacing={3}>
                <HStack><Icon as={FiShield} color="blue.500" /><Text fontWeight="medium">独立完成</Text></HStack>
                <Text fontSize="sm" color="gray.600" pl={6}>我承诺独立完成所有题目，不与他人交流答案。</Text>
                <HStack><Icon as={FiShield} color="blue.500" /><Text fontWeight="medium">不使用作弊手段</Text></HStack>
                <Text fontSize="sm" color="gray.600" pl={6}>不使用任何外部代码生成工具、不尝试攻击评测系统。</Text>
                <HStack><Icon as={FiShield} color="blue.500" /><Text fontWeight="medium">遵守比赛时间</Text></HStack>
                <Text fontSize="sm" color="gray.600" pl={6}>在比赛规定时间内提交，结束后立即停止一切提交行为。</Text>
              </VStack>
            </Box>
            <Text fontSize="sm" color="gray.500">
              违反以上规则可能导致成绩作废、账号封禁等处罚。点击“我宣誓”即表示您已阅读并同意遵守比赛规则。
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={pledgeModal.onClose}>取消</Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                setHasPledged(true);
                pledgeModal.onClose();
                toast({ title: '宣誓成功', description: '祝你好运！请开始答题。', status: 'success', duration: 2500 });
              }}
            >
              我宣誓，诚信参赛
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Contest Header */}
      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Flex justify="space-between" align="start" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl" mb={2} color="gray.800">
              {contest.has_password && <Icon as={FiLock} color="orange.400" mr={2} boxSize={5} />}
              {contest.title}
            </Heading>
            <Flex color="gray.600" mb={4} gap={2} align="center" flexWrap="wrap">
              <Text>Hosted by:</Text>
              <UserName
                username={contest.creator_name || `User #${contest.created_by}`}
                userId={contest.created_by}
                role={contest.creator_role}
                badge={contest.creator_badge}
                acceptedCount={contest.creator_accepted_count}
              />
              <Badge colorScheme="purple" variant="subtle">
                <Icon as={FiUsers} mr={1} />
                {contest.participant_count} 人参加
              </Badge>
            </Flex>
          </Box>
          <Box textAlign="right" p={4} bg={countdown?.urgent ? 'red.50' : 'gray.50'} borderRadius="md" borderWidth={1} borderColor={countdown?.urgent ? 'red.200' : undefined}>
            <Text fontSize="sm" color="gray.500" mb={1}>Current Status</Text>
            <Badge colorScheme={status.scheme} fontSize="md" px={3} py={1} borderRadius="full">{status.text}</Badge>
            {countdown && !countdown.expired && (
              <Text
                mt={2}
                fontWeight="bold"
                fontSize={countdown.urgent ? 'lg' : 'md'}
                fontFamily="mono"
                color={countdown.urgent ? 'red.600' : 'gray.700'}
              >
                {countdown.label} {countdown.text}
              </Text>
            )}
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
          <Progress value={progress} colorScheme="blue" borderRadius="md" size="sm" hasStripe isAnimated={status.phase === 'active'} />
        </Box>

        {/* Time Window Notice */}
        {status.phase === 'before' && (
          <Box mt={4} p={3} bg="blue.50" borderWidth={1} borderColor="blue.200" borderRadius="md">
            <Text color="blue.700" fontWeight="medium">
              比赛尚未开始。题目将在 {new Date(contest.start_time).toLocaleString()} 开放。
            </Text>
          </Box>
        )}
        {status.phase === 'after' && (
          <Box mt={4} p={3} bg="gray.50" borderWidth={1} borderColor="gray.200" borderRadius="md">
            <Text color="gray.600" fontWeight="medium">
              比赛已于 {new Date(contest.end_time).toLocaleString()} 结束。排行榜已锁定。
            </Text>
          </Box>
        )}

        {/* Unjoined notice */}
        {!isAccessible && isLoggedIn && (
          <Box mt={4} p={3} bg="orange.50" borderWidth={1} borderColor="orange.200" borderRadius="md">
            <HStack justify="space-between">
              <Text color="orange.700" fontWeight="medium">
                <Icon as={FiLock} mr={2} />此比赛需要密码才能查看题目。请点击右侧按钮加入。
              </Text>
              <Button size="sm" colorScheme="orange" onClick={openPasswordModal}>
                输入密码加入
              </Button>
            </HStack>
          </Box>
        )}
        {!isAccessible && !isLoggedIn && (
          <Box mt={4} p={3} bg="orange.50" borderWidth={1} borderColor="orange.200" borderRadius="md">
            <Text color="orange.700" fontWeight="medium">
              <Icon as={FiLock} mr={2} />此比赛需要密码才能查看。请先
              <Link as={NextLink} href="/user/login" color="blue.500" fontWeight="bold">登录</Link>
              ，然后输入密码加入。
            </Text>
          </Box>
        )}
      </Box>

      {/* Content Tabs */}
      <Box bg="white" borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Tabs colorScheme="blue" size="lg">
          <TabList px={4} bg="gray.50">
            <Tab fontWeight="medium" py={4}>Overview</Tab>
            <Tab fontWeight="medium" py={4}>Problems</Tab>
            <Tab fontWeight="medium" py={4}>Submissions</Tab>
            <Tab fontWeight="medium" py={4}>Standings</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel p={6}>
              <Heading size="md" mb={4}>比赛介绍</Heading>
              <Text mb={4} whiteSpace="pre-wrap">{contest.description || '暂无比赛描述。'}</Text>
              <Text color="gray.500" mb={6}>当前比赛包含 {data.problems.length} 道题目，已产生 {data.submissions.length} 条提交记录，{contest.participant_count} 人已加入。</Text>

              {/* AI Contest Analysis */}
              {status.phase === 'after' && (
                <Box p={4} bg="purple.50" borderRadius="md" borderWidth={1} borderColor="purple.200">
                  <HStack mb={3} spacing={2}>
                    <FiCpu color="#805AD5" />
                    <Text fontWeight="700" color="purple.700">AI 赛后分析</Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" mb={3}>
                    比赛已结束，让 AI 为你分析本场比赛的题目难度、常见错误和排行榜亮点。
                  </Text>
                  <Button
                    size="sm"
                    colorScheme="purple"
                    leftIcon={<FiCpu />}
                    onClick={handleAnalyzeContest}
                    isLoading={aiAnalyzing}
                    loadingText="AI 分析中..."
                  >
                    生成赛后分析
                  </Button>

                  {aiAnalysis && (
                    <Box mt={4} p={4} bg="white" borderRadius="md" borderWidth={1} borderColor="purple.200">
                      <HStack mb={3} spacing={2}>
                        <FiCpu color="#805AD5" />
                        <Text fontWeight="700" color="purple.700">AI 赛后分析报告</Text>
                        <Badge colorScheme="purple" variant="outline">AI</Badge>
                      </HStack>
                      <Text color="gray.800" whiteSpace="pre-wrap" fontSize="sm" lineHeight="tall">
                        {aiAnalysis}
                      </Text>
                    </Box>
                  )}
                </Box>
              )}
            </TabPanel>

            {/* Problems Tab */}
            <TabPanel p={0}>
              {!isAccessible ? (
                <Flex justify="center" py={12} direction="column" align="center">
                  <Icon as={FiLock} boxSize={12} color="orange.300" mb={4} />
                  <Text color="gray.500">请输入密码查看题目</Text>
                  <Button mt={4} colorScheme="orange" onClick={openPasswordModal}>输入密码加入</Button>
                </Flex>
              ) : status.phase === 'active' && !hasPledged ? (
                <Flex justify="center" py={12} direction="column" align="center">
                  <Icon as={FiFlag} boxSize={12} color="blue.300" mb={4} />
                  <Heading size="md" mb={2} color="gray.700">参赛宣誓</Heading>
                  <Text color="gray.500" mb={2} textAlign="center" maxW="400px">
                    在查看题目之前，请确认您将遵守比赛规则，独立完成题目，不使用任何作弊手段。
                  </Text>
                  <Button colorScheme="blue" onClick={pledgeModal.onOpen}>
                    我承诺，开始比赛
                  </Button>
                </Flex>
              ) : (
                <Table variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th w="10%"></Th>
                      <Th w="15%">#</Th>
                      <Th>Title</Th>
                      <Th w="20%" isNumeric>AC / Total</Th>
                      <Th w="15%"></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.problems.map((p) => {
                      const acRate = p.submit_count > 0 ? p.ac_count / p.submit_count : 0;
                      const badge = acRate >= 0.5 ? 'green' : acRate >= 0.2 ? 'yellow' : 'red';
                      const canSubmit = status.phase === 'active';
                      return (
                        <Tr key={p.problem_id} _hover={{ bg: 'gray.50' }}>
                          <Td>
                            {p.ac_count > 0 ? <Badge colorScheme={badge}>{p.ac_count > 10 ? 'Hot' : 'AC'}</Badge> : null}
                          </Td>
                          <Td fontWeight="bold">{p.display_id}</Td>
                          <Td>
                            <Link as={NextLink} href={`/problem/${p.problem_id}${canSubmit ? '/submit' : ''}`} color="blue.500" fontWeight="medium">
                              {p.title || `Problem ${p.problem_id}`}
                            </Link>
                          </Td>
                          <Td isNumeric>{p.ac_count} / {p.submit_count}</Td>
                          <Td>
                            {canSubmit ? (
                              <Link as={NextLink} href={`/problem/${p.problem_id}/submit`}>
                                <Button size="xs" colorScheme="green" variant="outline">提交</Button>
                              </Link>
                            ) : status.phase === 'before' ? (
                              <Badge colorScheme="blue">未开放</Badge>
                            ) : (
                              <Badge colorScheme="gray">已结束</Badge>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </TabPanel>

            {/* Submissions Tab */}
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

            {/* Standings Tab — ACM Enhanced + SSE Real-time */}
            <TabPanel p={0}>
              {/* SSE toggle bar (only when contest is active) */}
              {status.phase === 'active' && (
                <Flex
                  justify="space-between"
                  align="center"
                  px={4}
                  py={2}
                  bg={sseEnabled ? 'green.50' : 'gray.50'}
                  borderBottomWidth={1}
                  borderColor="gray.200"
                >
                  <HStack>
                    <Icon
                      as={FiZap}
                      color={sseEnabled ? 'green.500' : 'gray.400'}
                      boxSize={4}
                    />
                    <Text fontSize="sm" fontWeight="medium" color={sseEnabled ? 'green.700' : 'gray.500'}>
                      {sseEnabled ? '实时更新中' : '手动刷新'}
                    </Text>
                    {sseEnabled && (
                      <Badge colorScheme={sseConnected ? 'green' : 'red'} variant="solid" fontSize="xs">
                        {sseConnected ? '已连接' : '断线'}
                      </Badge>
                    )}
                  </HStack>
                  <Button
                    size="xs"
                    colorScheme={sseEnabled ? 'red' : 'green'}
                    variant={sseEnabled ? 'outline' : 'solid'}
                    leftIcon={<Icon as={FiRadio} />}
                    onClick={() => setSseEnabled(!sseEnabled)}
                  >
                    {sseEnabled ? '停止实时更新' : '开启实时更新'}
                  </Button>
                </Flex>
              )}

              {/* 封榜通知 */}
              {isFrozen && (
                <Flex
                  justify="space-between"
                  align="center"
                  px={4}
                  py={3}
                  bg="orange.50"
                  borderBottomWidth={2}
                  borderColor="orange.300"
                >
                  <HStack>
                    <Icon as={FiAlertTriangle} color="orange.500" boxSize={5} />
                    <Box>
                      <Text fontWeight="bold" color="orange.700">排行榜已封榜</Text>
                      <Text fontSize="sm" color="orange.600">
                        距比赛结束不足 {FREEZE_MINUTES} 分钟，详细解题情况已隐藏，最终结果将在比赛结束后公布。
                      </Text>
                    </Box>
                  </HStack>
                  <Badge colorScheme="orange" variant="solid" fontSize="md" px={3} py={1}>封榜中</Badge>
                </Flex>
              )}

              {(sseEnabled ? sseStandings : data.standings)?.length === 0 || (!sseEnabled && data.standings.length === 0) ? (
                <Text color="gray.500" textAlign="center" p={6}>暂无排行榜数据。</Text>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th w="60px">Rank</Th>
                        <Th minW="120px">用户</Th>
                        <Th isNumeric w="70px">Solved</Th>
                        <Th isNumeric w="80px">Penalty</Th>
                        {!isFrozen && problemDisplayIds.map((p) => (
                          <Th key={p.problem_id} isNumeric w="80px" textAlign="center">
                            <Tooltip label={p.display_id}>
                              {p.display_id}
                            </Tooltip>
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(sseEnabled && sseStandings ? sseStandings : data.standings).map((u) => {
                        const medal = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : null;
                        return (
                          <Tr key={u.user_id} _hover={{ bg: 'gray.50' }} bg={u.rank <= 3 ? 'yellow.50' : undefined}>
                            <Td fontWeight="bold">
                              {medal ? <Text fontSize="lg">{medal} #{u.rank}</Text> : `#${u.rank}`}
                            </Td>
                            <Td>
                              <UserName
                                username={u.username || `User #${u.user_id}`}
                                userId={u.user_id}
                                role={u.role}
                                badge={u.badge}
                                acceptedCount={0}
                              />
                            </Td>
                            <Td isNumeric fontWeight="bold" color="green.600">{u.solved}</Td>
                            <Td isNumeric fontFamily="monospace" fontSize="sm">
                              {u.penalty > 0 ? formatPenalty(u.penalty) : '-'}
                            </Td>
                            {!isFrozen && problemDisplayIds.map((p) => {
                              const pr = u.problems[p.problem_id];
                              if (!pr) {
                                return <Td key={p.problem_id} textAlign="center" color="gray.300">-</Td>;
                              }
                              if (pr.solved) {
                                return (
                                  <Td key={p.problem_id} textAlign="center">
                                    <Tooltip label={`Solved at ${formatPenalty(pr.solve_time_minutes)} (${pr.attempts} attempt${pr.attempts > 1 ? 's' : ''})`}>
                                      <Badge colorScheme="green" variant="solid" fontSize="xs">
                                        {formatPenalty(pr.solve_time_minutes)}
                                        {pr.attempts > 1 && <Text as="span" fontSize="10px"> (+{pr.attempts - 1})</Text>}
                                      </Badge>
                                    </Tooltip>
                                  </Td>
                                );
                              }
                              return (
                                <Td key={p.problem_id} textAlign="center">
                                  <Tooltip label={`${pr.attempts} attempt${pr.attempts > 1 ? 's' : ''}, not solved`}>
                                    <Badge colorScheme="red" variant="subtle" fontSize="xs">
                                      -{pr.attempts}
                                    </Badge>
                                  </Tooltip>
                                </Td>
                              );
                            })}
                          </Tr>
                        );
                      })}
                    </Tbody>
                    <Tfoot>
                      <Tr bg={isFrozen ? 'orange.50' : 'gray.50'}>
                        <Td colSpan={4 + (isFrozen ? 0 : problemDisplayIds.length)} fontSize="xs" color={isFrozen ? 'orange.600' : 'gray.500'} textAlign="center">
                          {isFrozen
                            ? `⚠️ 封榜中 — 排名已锁定，详细解题情况暂不公开。ACM 赛制：罚时 = 解题耗时 + 错误提交 × 20 分钟。`
                            : 'ACM 赛制：按解题数降序排列，解题数相同时按罚时升序。罚时 = 解题耗时 + 错误提交 × 20 分钟。'}
                        </Td>
                      </Tr>
                    </Tfoot>
                  </Table>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
}
