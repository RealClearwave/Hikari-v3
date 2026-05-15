"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Flex,
  HStack,
  Heading,
  Icon,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { FiAward, FiTrendingUp } from "react-icons/fi";
import { getLeaderboard, LeaderboardItem } from "@/api/leaderboard";

function rankBadge(rank: number) {
  if (rank === 1)
    return { emoji: "🥇", color: "yellow.400" };
  if (rank === 2)
    return { emoji: "🥈", color: "gray.400" };
  if (rank === 3)
    return { emoji: "🥉", color: "orange.300" };
  return null;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const size = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeaderboard(page, size);
      if (res.code === 0) {
        setUsers(res.data.list);
        setTotal(res.data.total);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      toast({
        title: "加载排行榜失败",
        description: msg,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxPage = Math.ceil(total / size) || 1;

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 6, md: 10 }}>
      <Container maxW="1200px">
        <Card>
          <CardBody p={{ base: 4, md: 8 }}>
            <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
              <HStack>
                <Icon as={FiTrendingUp} color="blue.500" boxSize={6} />
                <Heading size="lg">全站排行榜</Heading>
                <Badge colorScheme="green" fontSize="sm" variant="solid">Live</Badge>
              </HStack>
              <HStack>
                <Icon as={FiAward} color="purple.500" />
                <Text color="gray.500" fontSize="sm">
                  按通过题数降序排列 · 共 {total} 人上榜
                </Text>
              </HStack>
            </Flex>

            {loading ? (
              <Flex justify="center" py={12}><Spinner size="xl" /></Flex>
            ) : (
              <>
                <Table variant="simple">
                  <Thead bg="blackAlpha.50">
                    <Tr>
                      <Th w="80px">排名</Th>
                      <Th>用户</Th>
                      <Th isNumeric>通过</Th>
                      <Th isNumeric>提交</Th>
                      <Th isNumeric>通过率</Th>
                      <Th>最近活跃</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {users.map((u, i) => {
                      const rank = (page - 1) * size + i + 1;
                      const medal = rankBadge(rank);
                      return (
                        <Tr key={u.user_id} _hover={{ bg: "blackAlpha.50" }}>
                          <Td>
                            {medal ? (
                              <Text fontSize="xl">{medal.emoji}</Text>
                            ) : (
                              <Text fontWeight="bold" color="gray.500">#{rank}</Text>
                            )}
                          </Td>
                          <Td>
                            <HStack spacing={3}>
                              <Avatar size="sm" name={u.username} src={u.avatar || undefined} />
                              <Box>
                                <Text fontWeight="bold">{u.username}</Text>
                                {u.role === 1 && (
                                  <Badge
                                    bgGradient="linear(to-r, purple.500, pink.500)"
                                    color="white"
                                    borderRadius="sm"
                                    px={1.5}
                                    py={0.5}
                                    fontSize="10px"
                                  >
                                    {u.badge || "管理员"}
                                  </Badge>
                                )}
                              </Box>
                            </HStack>
                          </Td>
                          <Td isNumeric>
                            <Text fontWeight="bold" color="green.500">{u.accepted}</Text>
                          </Td>
                          <Td isNumeric>{u.submissions}</Td>
                          <Td isNumeric>
                            <Text color={u.accept_rate >= 50 ? "green.500" : u.accept_rate >= 30 ? "orange.500" : "red.500"}>
                              {u.accept_rate}%
                            </Text>
                          </Td>
                          <Td fontSize="sm" color="gray.500">{u.last_active || "-"}</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>

                <Flex justify="center" mt={6}>
                  <HStack>
                    <Button size="sm" isDisabled={page <= 1} onClick={() => setPage(page - 1)}>
                      上一页
                    </Button>
                    <Button size="sm" colorScheme="blue" variant="solid">{page}</Button>
                    <Button size="sm" isDisabled={page >= maxPage} onClick={() => setPage(page + 1)}>
                      下一页
                    </Button>
                  </HStack>
                </Flex>
              </>
            )}
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
