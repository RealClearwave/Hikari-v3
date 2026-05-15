"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Spinner,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { FiArrowUp, FiArrowDown, FiX } from "react-icons/fi";
import { useAuthStore } from "@/store/auth";
import { createContest } from "@/api/contest";
import { getProblemList, Problem } from "@/api/problem";

export default function CreateContestPage() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState(0);
  const [password, setPassword] = useState("");

  // Available problems
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);

  // Selected problems (ordered by display_id)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.role !== 1) {
      router.push("/");
      return;
    }

    // Load all available problems
    getProblemList(1, 100)
      .then((res) => {
        if (res.code === 0) setProblems(res.data.list);
      })
      .catch(() => {})
      .finally(() => setLoadingProblems(false));
  }, [mounted, isAuthenticated, user, router]);

  const toggleProblem = useCallback((problemId: number) => {
    setSelectedIds((prev) =>
      prev.includes(problemId)
        ? prev.filter((id) => id !== problemId)
        : [...prev, problemId]
    );
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setSelectedIds((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "请输入比赛标题", status: "warning", duration: 3000 });
      return;
    }
    if (!startTime || !endTime) {
      toast({ title: "请选择开始和结束时间", status: "warning", duration: 3000 });
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      toast({ title: "结束时间必须晚于开始时间", status: "warning", duration: 3000 });
      return;
    }
    if (selectedIds.length === 0) {
      toast({ title: "请至少选择一道题目", status: "warning", duration: 3000 });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createContest({
        title: title.trim(),
        description: description.trim(),
        start_time: startTime,
        end_time: endTime,
        type,
        password: type === 1 ? password : undefined,
        problem_ids: selectedIds,
      });
      if (res.code === 0) {
        toast({ title: `比赛 #${res.data.id} 创建成功`, status: "success", duration: 3000 });
        router.push(`/contest/${res.data.id}`);
      } else {
        toast({ title: res.msg || "创建失败", status: "error", duration: 3000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "创建失败";
      toast({ title: msg, status: "error", duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !isAuthenticated || user?.role !== 1) {
    return (
      <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
    );
  }

  const getDisplayId = (index: number) => String.fromCharCode(65 + index);

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 6, md: 10 }}>
      <Container maxW="900px">
        <Heading size="lg" mb={2}>创建比赛</Heading>
        <Text color="gray.500" mb={8}>
          创建一场编程比赛，设置时间范围和题目列表。题目将按选择顺序分配 A, B, C... 编号。
        </Text>

        <VStack spacing={6} align="stretch">
          {/* Basic Info */}
          <Card>
            <CardHeader pb={0}><Heading size="md">基本信息</Heading></CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>比赛标题</FormLabel>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：Spring Beginner Contest"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>比赛描述（支持 Markdown）</FormLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="比赛规则、奖励说明..."
                    minH="120px"
                  />
                </FormControl>

                <HStack spacing={4} wrap="wrap">
                  <FormControl isRequired w="250px">
                    <FormLabel>开始时间</FormLabel>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </FormControl>

                  <FormControl isRequired w="250px">
                    <FormLabel>结束时间</FormLabel>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </FormControl>
                </HStack>

                <HStack spacing={4} wrap="wrap">
                  <FormControl w="200px">
                    <FormLabel>比赛类型</FormLabel>
                    <Select value={type} onChange={(e) => setType(Number(e.target.value))}>
                      <option value={0}>公开赛</option>
                      <option value={1}>私有赛（需密码）</option>
                    </Select>
                  </FormControl>

                  {type === 1 && (
                    <FormControl w="250px">
                      <FormLabel>比赛密码</FormLabel>
                      <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="输入比赛密码"
                      />
                    </FormControl>
                  )}
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Problem Selection */}
          <Card>
            <CardHeader pb={0}>
              <Heading size="md">
                选择题目
                <Badge ml={3} colorScheme="blue">{selectedIds.length} 道已选</Badge>
              </Heading>
            </CardHeader>
            <CardBody>
              {selectedIds.length > 0 && (
                <Box mb={4} p={4} bg="blue.50" borderRadius="md" _dark={{ bg: "blue.900" }}>
                  <Text fontWeight="bold" mb={2} fontSize="sm">已选题目顺序</Text>
                  <VStack spacing={1} align="stretch">
                    {selectedIds.map((pid, i) => {
                      const p = problems.find((x) => x.id === pid);
                      return (
                        <Flex key={pid} justify="space-between" align="center" py={1} px={2} borderRadius="md" bg="white" _dark={{ bg: "gray.700" }}>
                          <HStack spacing={3}>
                            <Badge colorScheme="blue">{getDisplayId(i)}</Badge>
                            <Text fontSize="sm">#{pid} {p?.title || "加载中..."}</Text>
                          </HStack>
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="上移"
                              size="xs"
                              variant="ghost"
                              onClick={() => moveUp(i)}
                              disabled={i === 0}
                            >
                              <FiArrowUp />
                            </IconButton>
                            <IconButton
                              aria-label="下移"
                              size="xs"
                              variant="ghost"
                              onClick={() => moveDown(i)}
                              disabled={i === selectedIds.length - 1}
                            >
                              <FiArrowDown />
                            </IconButton>
                            <IconButton
                              aria-label="移除"
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => toggleProblem(pid)}
                            >
                              <FiX />
                            </IconButton>
                          </HStack>
                        </Flex>
                      );
                    })}
                  </VStack>
                </Box>
              )}

              {loadingProblems ? (
                <Flex justify="center" py={4}><Spinner size="sm" /></Flex>
              ) : (
                <Box maxH="300px" overflowY="auto">
                  <VStack spacing={1} align="stretch">
                    {problems.map((p) => {
                      const selected = selectedIds.includes(p.id);
                      const diffLabel = p.difficulty === 1 ? "简单" : p.difficulty === 2 ? "中等" : "困难";
                      const diffColor = p.difficulty === 1 ? "green" : p.difficulty === 2 ? "orange" : "red";
                      return (
                        <Flex
                          key={p.id}
                          justify="space-between"
                          align="center"
                          py={2} px={3}
                          borderRadius="md"
                          borderWidth={1}
                          borderColor={selected ? "blue.300" : "transparent"}
                          bg={selected ? "blue.50" : "transparent"}
                          _dark={{ bg: selected ? "blue.900" : "transparent" }}
                          cursor="pointer"
                          _hover={{ bg: "blackAlpha.50" }}
                          onClick={() => toggleProblem(p.id)}
                        >
                          <HStack spacing={3}>
                            <Text fontWeight="bold" color="gray.500" fontSize="sm">#{p.id}</Text>
                            <Text fontSize="sm">{p.title}</Text>
                            <Badge colorScheme={diffColor} fontSize="xs">{diffLabel}</Badge>
                          </HStack>
                          <Badge colorScheme={selected ? "blue" : "gray"} variant={selected ? "solid" : "subtle"}>
                            {selected ? "已选" : "点击选择"}
                          </Badge>
                        </Flex>
                      );
                    })}
                  </VStack>
                </Box>
              )}
            </CardBody>
          </Card>

          <Flex justify="flex-end">
            <Button
              colorScheme="blue"
              size="lg"
              onClick={handleSubmit}
              isLoading={submitting}
              loadingText="创建中..."
            >
              创建比赛
            </Button>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
}
