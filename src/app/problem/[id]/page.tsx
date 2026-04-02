"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Link,
  Spinner,
  Table,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { BlogItem, getBlogList } from '@/api/blog';
import { getProblemDetail, Problem } from '@/api/problem';
import { getRecordList, RecordItem, RecordStats } from '@/api/record';

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

function difficultyText(level: number) {
  if (level === 1) return { text: '简单', scheme: 'green' as const };
  if (level === 2) return { text: '中等', scheme: 'yellow' as const };
  if (level === 3) return { text: '困难', scheme: 'red' as const };
  return { text: `难度 ${level}`, scheme: 'gray' as const };
}

interface SampleCase {
  input: string;
  output: string;
}

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [solutions, setSolutions] = useState<BlogItem[]>([]);
  const [recordStats, setRecordStats] = useState<RecordStats | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const problemId = Number(id);

  const loadData = useCallback(async () => {
    if (!Number.isFinite(problemId) || problemId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [problemRes, recordRes, solutionRes] = await Promise.all([
        getProblemDetail(problemId),
        getRecordList(1, 50, problemId),
        getBlogList(1, 50, 1, problemId),
      ]);

      if (problemRes.code === 0) {
        setProblem(problemRes.data);
      }

      if (recordRes.code === 0) {
        setRecords(recordRes.data.list);
        setRecordStats(recordRes.data.stats || null);
      }

      if (solutionRes.code === 0) {
        setSolutions(solutionRes.data.list);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取题目数据失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [problemId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sampleCases = useMemo<SampleCase[]>(() => {
    if (!problem?.sample_cases) return [];
    try {
      const parsed = JSON.parse(problem.sample_cases) as Array<{ input?: string; output?: string }>;
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        input: String(item?.input || ''),
        output: String(item?.output || ''),
      }));
    } catch {
      return [];
    }
  }, [problem?.sample_cases]);

  const acceptedCount = Number(problem?.accepted_count || 0);
  const submissionCount = Number(problem?.submission_count || 0);
  const acceptanceRate = submissionCount > 0
    ? ((acceptedCount / submissionCount) * 100).toFixed(1)
    : '0.0';

  const statusDistribution = useMemo(() => {
    const counts = recordStats?.status_counts || {};
    const statuses = [0, 1, 2, 3, 4, 5, 6, 7];
    return statuses
      .map((s) => ({
        status: s,
        count: Number(counts[String(s)] || 0),
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [recordStats]);

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (!problem) {
    return (
      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Heading size="lg" mb={2}>题目不存在</Heading>
        <Text color="gray.500">题目 ID: {id}</Text>
      </Box>
    );
  }

  const difficulty = difficultyText(problem.difficulty);

  return (
    <Box>
      <Heading size="xl" mb={2} color="gray.800">{problem.id}: {problem.title}</Heading>
      <HStack spacing={4} mb={6} fontSize="sm" color="gray.600" flexWrap="wrap">
        <Text>时间限制: <Badge colorScheme="blue">{problem.time_limit} ms</Badge></Text>
        <Text>内存限制: <Badge colorScheme="blue">{Math.round(problem.memory_limit / 1024)} MB</Badge></Text>
        <Text>难度: <Badge colorScheme={difficulty.scheme}>{difficulty.text}</Badge></Text>
        <Text>提供者: <Text as="span" fontWeight="bold">{problem.created_by_name || `User #${problem.created_by}`}</Text></Text>
      </HStack>

      <Flex gap={6} flexDir={{ base: 'column', lg: 'row' }}>
        <Box flex="3" bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
          <Tabs colorScheme="blue">
            <TabList>
              <Tab fontWeight="bold">题目描述</Tab>
              <Tab fontWeight="bold">提交记录</Tab>
              <Tab fontWeight="bold">统计</Tab>
              <Tab fontWeight="bold">题解</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} py={6}>
                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>题目描述</Heading>
                  <Text color="gray.700" whiteSpace="pre-wrap">{problem.description || '暂无描述'}</Text>
                </Box>

                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>输入格式</Heading>
                  <Text color="gray.700" whiteSpace="pre-wrap">{problem.input_format || '暂无输入格式说明'}</Text>
                </Box>

                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>输出格式</Heading>
                  <Text color="gray.700" whiteSpace="pre-wrap">{problem.output_format || '暂无输出格式说明'}</Text>
                </Box>

                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>样例</Heading>
                  {sampleCases.length === 0 ? (
                    <Text color="gray.500">暂无样例</Text>
                  ) : (
                    <Flex direction="column" gap={4}>
                      {sampleCases.slice(0, 3).map((sample, idx) => (
                        <Flex gap={4} key={idx} flexDir={{ base: 'column', md: 'row' }}>
                          <Box flex={1}>
                            <Badge colorScheme="gray" mb={2}>样例输入 {idx + 1}</Badge>
                            <Box bg="gray.50" p={3} borderRadius="md" fontFamily="monospace" whiteSpace="pre-wrap">
                              {sample.input || '(empty)'}
                            </Box>
                          </Box>
                          <Box flex={1}>
                            <Badge colorScheme="gray" mb={2}>样例输出 {idx + 1}</Badge>
                            <Box bg="gray.50" p={3} borderRadius="md" fontFamily="monospace" whiteSpace="pre-wrap">
                              {sample.output || '(empty)'}
                            </Box>
                          </Box>
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </Box>
              </TabPanel>

              <TabPanel px={0} py={6}>
                {records.length === 0 ? (
                  <Text color="gray.500">该题目暂无提交记录。</Text>
                ) : (
                  <Box overflowX="auto">
                    <Table size="sm" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>记录 ID</Th>
                          <Th>用户</Th>
                          <Th>状态</Th>
                          <Th>语言</Th>
                          <Th>耗时</Th>
                          <Th>内存</Th>
                          <Th>提交时间</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {records.map((r) => {
                          const meta = statusText(r.status);
                          return (
                            <Tr key={r.id} _hover={{ bg: 'gray.50' }}>
                              <Td>
                                <Link as={NextLink} href={`/record/${r.id}`} color="blue.500" fontWeight="bold" _hover={{ textDecoration: 'underline' }}>
                                  {r.id}
                                </Link>
                              </Td>
                              <Td>
                                <HStack spacing={2}>
                                  <Avatar size="xs" name={r.username || `User ${r.user_id}`} src={r.avatar || undefined} />
                                  <Link as={NextLink} href={`/user/profile?uid=${r.user_id}`} color="purple.600" _hover={{ textDecoration: 'underline' }}>
                                    {r.username || `User #${r.user_id}`}
                                  </Link>
                                </HStack>
                              </Td>
                              <Td><Badge colorScheme={meta.scheme}>{meta.text}</Badge></Td>
                              <Td>{r.language}</Td>
                              <Td>{r.time_used} ms</Td>
                              <Td>{r.memory_used} KB</Td>
                              <Td fontSize="sm" color="gray.500">{new Date(r.created_at).toLocaleString()}</Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                )}
              </TabPanel>

              <TabPanel px={0} py={6}>
                <Flex gap={4} mb={6} flexWrap="wrap">
                  <Box minW="160px" p={4} borderWidth={1} borderColor="gray.200" borderRadius="md" bg="gray.50">
                    <Text color="gray.500" fontSize="sm">总提交</Text>
                    <Text fontSize="2xl" fontWeight="bold">{submissionCount}</Text>
                  </Box>
                  <Box minW="160px" p={4} borderWidth={1} borderColor="green.200" borderRadius="md" bg="green.50">
                    <Text color="green.700" fontSize="sm">通过数</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="green.700">{acceptedCount}</Text>
                  </Box>
                  <Box minW="160px" p={4} borderWidth={1} borderColor="blue.200" borderRadius="md" bg="blue.50">
                    <Text color="blue.700" fontSize="sm">通过率</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.700">{acceptanceRate}%</Text>
                  </Box>
                </Flex>

                {statusDistribution.length === 0 ? (
                  <Text color="gray.500">暂无状态分布数据。</Text>
                ) : (
                  <Box overflowX="auto">
                    <Table size="sm" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>状态</Th>
                          <Th isNumeric>数量</Th>
                          <Th isNumeric>占比</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {statusDistribution.map((item) => {
                          const meta = statusText(item.status);
                          const percent = submissionCount > 0 ? ((item.count / submissionCount) * 100).toFixed(1) : '0.0';
                          return (
                            <Tr key={item.status}>
                              <Td><Badge colorScheme={meta.scheme}>{meta.text}</Badge></Td>
                              <Td isNumeric fontWeight="bold">{item.count}</Td>
                              <Td isNumeric>{percent}%</Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                )}
              </TabPanel>

              <TabPanel px={0} py={6}>
                {solutions.length === 0 ? (
                  <Text color="gray.500">该题目暂无题解。</Text>
                ) : (
                  <VStack align="stretch" spacing={3}>
                    {solutions.map((item) => (
                      <Box key={item.id} p={4} borderWidth={1} borderColor="gray.200" borderRadius="md" _hover={{ bg: 'gray.50' }}>
                        <HStack justify="space-between" mb={2}>
                          <Badge colorScheme="green">题解</Badge>
                          <Text fontSize="xs" color="gray.500">{new Date(item.updated_at).toLocaleString()}</Text>
                        </HStack>
                        <Link as={NextLink} href={`/discuss/${item.id}`} fontWeight="bold" color="blue.600" _hover={{ textDecoration: 'underline' }}>
                          {item.title}
                        </Link>
                        <Text color="gray.600" mt={2} noOfLines={2}>{item.content}</Text>
                      </Box>
                    ))}
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Box flex="1">
          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
            <Heading size="sm" mb={4}>提交代码</Heading>
            <Divider mb={4} />
            <Button as={NextLink} href={`/problem/${id}/submit`} colorScheme="blue" w="full" size="lg" mb={2}>前往提交</Button>
          </Box>

          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
            <Heading size="sm" mb={4}>题目信息</Heading>
            <Divider mb={4} />
            <Table size="sm" variant="unstyled">
              <Tbody>
                <Tr>
                  <Td px={0} py={2} color="gray.500">通过数</Td>
                  <Td px={0} py={2} isNumeric fontWeight="bold">{acceptedCount}</Td>
                </Tr>
                <Tr>
                  <Td px={0} py={2} color="gray.500">提交数</Td>
                  <Td px={0} py={2} isNumeric fontWeight="bold">{submissionCount}</Td>
                </Tr>
                <Tr>
                  <Td px={0} py={2} color="gray.500">通过率</Td>
                  <Td px={0} py={2} isNumeric fontWeight="bold">{acceptanceRate}%</Td>
                </Tr>
                <Tr>
                  <Td px={0} py={2} color="gray.500">最近更新</Td>
                  <Td px={0} py={2} isNumeric fontWeight="bold" fontSize="sm">{new Date(problem.updated_at).toLocaleDateString()}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
