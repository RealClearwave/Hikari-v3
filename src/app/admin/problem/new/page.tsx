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
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Spinner,
  Switch,
  Text,
  Textarea,
  VStack,
  Wrap,
  WrapItem,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { createProblem } from "@/api/problem";
import { getTags, Tag } from "@/api/tags";

interface SampleCase {
  input: string;
  output: string;
}

export default function CreateProblemPage() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(262144);
  const [difficulty, setDifficulty] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [sampleCases, setSampleCases] = useState<SampleCase[]>([
    { input: "", output: "" },
  ]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.role !== 1) {
      router.push("/");
      return;
    }
    getTags()
      .then((res) => { if (res.code === 0) setTags(res.data.list); })
      .catch(() => {});
  }, [mounted, isAuthenticated, user, router]);

  const addSampleCase = () => {
    setSampleCases((prev) => [...prev, { input: "", output: "" }]);
  };

  const removeSampleCase = (index: number) => {
    setSampleCases((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSampleCase = (index: number, field: keyof SampleCase, value: string) => {
    setSampleCases((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const toggleTag = useCallback((tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "请输入题目标题", status: "warning", duration: 3000 });
      return;
    }
    if (!description.trim()) {
      toast({ title: "请输入题目描述", status: "warning", duration: 3000 });
      return;
    }

    setSubmitting(true);
    try {
      const validCases = sampleCases.filter((s) => s.input.trim() || s.output.trim());
      const res = await createProblem({
        title: title.trim(),
        description: description.trim(),
        input_format: inputFormat.trim(),
        output_format: outputFormat.trim(),
        sample_cases: validCases,
        time_limit: timeLimit,
        memory_limit: memoryLimit,
        difficulty,
        is_public: isPublic,
        tag_ids: selectedTagIds,
      });
      if (res.code === 0) {
        toast({ title: `题目 #${res.data.id} 创建成功`, status: "success", duration: 3000 });
        router.push(`/problem/${res.data.id}`);
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

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 6, md: 10 }}>
      <Container maxW="900px">
        <Heading size="lg" mb={2}>创建题目</Heading>
        <Text color="gray.500" mb={8}>
          创建一道新的编程题目，填写题目描述、测试样例和评测参数。
        </Text>

        <VStack spacing={6} align="stretch">
          {/* Basic Info */}
          <Card>
            <CardHeader pb={0}><Heading size="md">基本信息</Heading></CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>题目标题</FormLabel>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：A + B Problem"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>题目描述（支持 Markdown）</FormLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="题目背景、问题描述..."
                    minH="200px"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>输入格式</FormLabel>
                  <Textarea
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                    placeholder="输入格式说明..."
                    minH="80px"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>输出格式</FormLabel>
                  <Textarea
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    placeholder="输出格式说明..."
                    minH="80px"
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Judge Config */}
          <Card>
            <CardHeader pb={0}><Heading size="md">评测参数</Heading></CardHeader>
            <CardBody>
              <HStack spacing={6} wrap="wrap">
                <FormControl w="200px">
                  <FormLabel>时间限制 (ms)</FormLabel>
                  <NumberInput
                    min={100} max={10000} step={100}
                    value={timeLimit}
                    onChange={(_, v) => setTimeLimit(v)}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl w="200px">
                  <FormLabel>内存限制 (KB)</FormLabel>
                  <NumberInput
                    min={1024} max={1048576} step={65536}
                    value={memoryLimit}
                    onChange={(_, v) => setMemoryLimit(v)}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    当前: {Math.round(memoryLimit / 1024)} MB
                  </Text>
                </FormControl>

                <FormControl w="200px">
                  <FormLabel>难度</FormLabel>
                  <Select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
                    <option value={1}>简单</option>
                    <option value={2}>中等</option>
                    <option value={3}>困难</option>
                  </Select>
                </FormControl>

                <FormControl w="200px">
                  <FormLabel>公开状态</FormLabel>
                  <HStack h="40px">
                    <Switch
                      isChecked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      colorScheme="blue"
                    />
                    <Text fontSize="sm">{isPublic ? "公开" : "隐藏"}</Text>
                  </HStack>
                </FormControl>
              </HStack>
            </CardBody>
          </Card>

          {/* Sample Cases */}
          <Card>
            <CardHeader pb={0}>
              <Flex justify="space-between" align="center">
                <Heading size="md">测试样例</Heading>
                <Button size="sm" variant="outline" onClick={addSampleCase}>
                  + 添加样例
                </Button>
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {sampleCases.map((sc, i) => (
                  <Flex key={i} gap={4} p={4} borderWidth={1} borderRadius="md" borderColor="blackAlpha.200" direction={{ base: "column", md: "row" }}>
                    <VStack flex={1} align="stretch">
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold" fontSize="sm">样例 #{i + 1} 输入</Text>
                        {sampleCases.length > 1 && (
                          <Button size="xs" colorScheme="red" variant="ghost" onClick={() => removeSampleCase(i)}>
                            删除
                          </Button>
                        )}
                      </Flex>
                      <Textarea
                        value={sc.input}
                        onChange={(e) => updateSampleCase(i, "input", e.target.value)}
                        fontFamily="monospace"
                        minH="80px"
                        placeholder="输入数据..."
                      />
                    </VStack>
                    <VStack flex={1} align="stretch">
                      <Text fontWeight="bold" fontSize="sm" mt={{ base: 0, md: 1 }}>样例 #{i + 1} 输出</Text>
                      <Textarea
                        value={sc.output}
                        onChange={(e) => updateSampleCase(i, "output", e.target.value)}
                        fontFamily="monospace"
                        minH="80px"
                        placeholder="期望输出..."
                      />
                    </VStack>
                  </Flex>
                ))}
              </VStack>
            </CardBody>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader pb={0}><Heading size="md">算法标签</Heading></CardHeader>
            <CardBody>
              <Wrap spacing={2}>
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <WrapItem key={tag.id}>
                      <Badge
                        as="button"
                        onClick={() => toggleTag(tag.id)}
                        colorScheme={selected ? tag.color : "gray"}
                        variant={selected ? "solid" : "subtle"}
                        px={3} py={1.5} borderRadius="full" cursor="pointer" fontSize="sm"
                      >
                        {tag.name}
                      </Badge>
                    </WrapItem>
                  );
                })}
              </Wrap>
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
              创建题目
            </Button>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
}
