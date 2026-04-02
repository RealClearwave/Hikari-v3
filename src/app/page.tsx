"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Flex,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  Input,
  Link,
  List,
  ListItem,
  Progress,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Table,
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
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiBookOpen, FiCpu, FiFlag, FiSearch } from 'react-icons/fi';
import { getBlogList, BlogItem } from '@/api/blog';
import { getContestList } from '@/api/contest';
import { getProblemList } from '@/api/problem';
import { getRecordList, RecordItem } from '@/api/record';
import UserName from '@/components/UserName';

interface RankItem {
  userId: number;
  username: string;
  role?: number;
  badge?: string;
  submissions: number;
  accepted: number;
}

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const [jumpId, setJumpId] = useState('');
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [problemTotal, setProblemTotal] = useState(0);
  const [contestTotal, setContestTotal] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [blogRes, recordRes, problemRes, contestRes] = await Promise.all([
        getBlogList(1, 6, 0),
        getRecordList(1, 200),
        getProblemList(1, 1),
        getContestList(1, 1),
      ]);

      if (blogRes.code === 0) setBlogs(blogRes.data.list);
      if (recordRes.code === 0) setRecords(recordRes.data.list);
      if (problemRes.code === 0) setProblemTotal(problemRes.data.total);
      if (contestRes.code === 0) setContestTotal(contestRes.data.total);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '加载失败';
      toast({ title: '首页数据加载失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ranking = useMemo(() => {
    const map = new Map<number, RankItem>();
    for (const r of records) {
      const cur = map.get(r.user_id) || {
        userId: r.user_id,
        username: r.username || `用户 #${r.user_id}`,
        role: r.role,
        badge: r.badge,
        submissions: 0,
        accepted: 0,
      };

      if (!cur.username && r.username) {
        cur.username = r.username;
      }
      if (typeof r.role === 'number') {
        cur.role = r.role;
      }
      if (typeof r.badge === 'string') {
        cur.badge = r.badge;
      }

      cur.submissions += 1;
      if (r.status === 2) cur.accepted += 1;
      map.set(r.user_id, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.accepted - a.accepted || b.submissions - a.submissions)
      .slice(0, 8);
  }, [records]);

  const acceptedRate = useMemo(() => {
    if (records.length === 0) return 0;
    const ac = records.filter((r) => r.status === 2).length;
    return (ac / records.length) * 100;
  }, [records]);

  const jumpToProblem = () => {
    const id = jumpId.trim();
    if (!id) return;
    router.push(`/problem/${id}`);
  };

  return (
    <Box minH="100vh" bg="linear-gradient(180deg, #f9fbff 0%, #f6f8fb 100%)" py={{ base: 6, md: 10 }}>
      <Container maxW="1200px">
        <VStack align="stretch" spacing={6}>
          <Card bg="white" border="1px solid" borderColor="blackAlpha.100">
            <CardBody p={{ base: 6, md: 8 }}>
              <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={6}>
                <VStack align="start" spacing={3}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">Hikari OJ v3</Badge>
                  <Heading size="xl" letterSpacing="tight" color="gray.800">欢迎来到 Hikari Online Judge</Heading>
                  <Text color="gray.600" maxW="760px">在这里你可以刷题、参加比赛、查看评测结果和学习题解，快速追踪自己的训练进度。</Text>
                  <HStack spacing={3} pt={1}>
                    <Button as={NextLink} href="/problem" colorScheme="blue" rightIcon={<Icon as={FiArrowRight} />}>开始刷题</Button>
                    <Button as={NextLink} href="/contest" variant="outline" borderColor="gray.300">参加比赛</Button>
                  </HStack>
                </VStack>
                <Grid templateColumns="repeat(2, minmax(140px, 1fr))" gap={3} w={{ base: '100%', md: 'auto' }}>
                  <Card bg="gray.50"><CardBody py={4}><Stat><StatLabel>总题目</StatLabel><StatNumber>{problemTotal}</StatNumber></Stat></CardBody></Card>
                  <Card bg="gray.50"><CardBody py={4}><Stat><StatLabel>总竞赛</StatLabel><StatNumber>{contestTotal}</StatNumber></Stat></CardBody></Card>
                  <Card bg="gray.50"><CardBody py={4}><Stat><StatLabel>最近提交</StatLabel><StatNumber>{records.length}</StatNumber></Stat></CardBody></Card>
                  <Card bg="gray.50"><CardBody py={4}><Stat><StatLabel>通过率</StatLabel><StatNumber>{acceptedRate.toFixed(1)}%</StatNumber></Stat></CardBody></Card>
                </Grid>
              </Flex>
            </CardBody>
          </Card>

          <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
            <GridItem>
              <Card>
                <CardBody p={0}>
                  <Flex align="center" justify="space-between" px={6} py={4} borderBottom="1px solid" borderColor="blackAlpha.100">
                    <HStack><Icon as={FiFlag} color="blue.500" /><Heading size="md">最新动态</Heading></HStack>
                    <Link as={NextLink} href="/discuss" color="blue.500" fontSize="sm">查看全部</Link>
                  </Flex>
                  {loading ? (
                    <Flex justify="center" py={8}><Spinner /></Flex>
                  ) : (
                    <List spacing={0}>
                      {blogs.map((item) => (
                        <ListItem key={item.id} px={6} py={4} borderBottom="1px solid" borderColor="blackAlpha.50">
                          <Link as={NextLink} href={`/discuss/${item.id}`} color="gray.700" _hover={{ color: 'blue.600' }}>{item.title}</Link>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardBody>
              </Card>

              <Card mt={6}>
                <CardBody p={0}>
                  <Flex align="center" justify="space-between" px={6} py={4} borderBottom="1px solid" borderColor="blackAlpha.100">
                    <HStack><Icon as={FiBookOpen} color="blue.500" /><Heading size="md">训练榜单（按通过题数）</Heading></HStack>
                    <Badge colorScheme="green">Live</Badge>
                  </Flex>
                  <Table>
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>排名</Th>
                        <Th>用户</Th>
                        <Th isNumeric>通过</Th>
                        <Th isNumeric>提交</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {ranking.map((u, i) => (
                        <Tr key={u.userId} _hover={{ bg: 'gray.50' }}>
                          <Td fontWeight="bold">#{i + 1}</Td>
                          <Td>
                            <UserName
                              username={u.username}
                              userId={u.userId}
                              role={u.role}
                              badge={u.badge}
                              acceptedCount={u.accepted}
                            />
                          </Td>
                          <Td isNumeric>{u.accepted}</Td>
                          <Td isNumeric>{u.submissions}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardBody>
                    <HStack mb={3}><Icon as={FiSearch} color="blue.500" /><Heading size="sm">题目直达</Heading></HStack>
                    <Flex>
                      <Input placeholder="输入题号（例如 1000）" value={jumpId} onChange={(e) => setJumpId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && jumpToProblem()} borderRightRadius={0} />
                      <Button colorScheme="blue" borderLeftRadius={0} onClick={jumpToProblem}>进入</Button>
                    </Flex>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <HStack mb={3}><Icon as={FiCpu} color="blue.500" /><Heading size="sm">训练统计</Heading></HStack>
                    <Text color="gray.600" fontSize="sm" mb={2}>最近提交通过率</Text>
                    <Progress value={acceptedRate} colorScheme="blue" borderRadius="full" mb={3} />
                    <Text color="gray.500" fontSize="sm">基于最近 {records.length} 条提交记录统计</Text>
                  </CardBody>
                </Card>
              </VStack>
            </GridItem>
          </Grid>
        </VStack>
      </Container>
    </Box>
  );
}
