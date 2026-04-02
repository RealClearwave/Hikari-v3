"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Code, Flex, Heading, HStack, Progress, Select, Spinner, Stack, Text, Textarea, VStack, useToast } from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { getProblemDetail, Problem } from '@/api/problem';
import { submitRecord } from '@/api/record';

type SampleCase = {
  input: string;
  output: string;
  weight?: number;
};

type Verdict = 'idle' | 'compiling' | 'judging' | 'saving' | 'accepted' | 'wrong' | 'compile-error' | 'runtime-error';

const phaseMeta: Record<Verdict, { label: string; color: string; progress: number; description: string }> = {
  idle: { label: '等待提交', color: 'gray', progress: 0, description: '从数据库读取样例测试数据后进行本地评测。' },
  compiling: { label: '编译中', color: 'blue', progress: 25, description: '正在通过 llvm-wasm 加载编译器并构建程序。' },
  judging: { label: '评测中', color: 'orange', progress: 60, description: '正在使用数据库中的 sample_cases 逐个测试。' },
  saving: { label: '保存结果', color: 'purple', progress: 85, description: '评测完成，正在写入数据库并跳转记录页。' },
  accepted: { label: 'AC', color: 'green', progress: 100, description: '所有样例测试点通过。' },
  wrong: { label: 'WA', color: 'red', progress: 100, description: '至少一个样例测试点未通过。' },
  'compile-error': { label: 'CE', color: 'yellow', progress: 100, description: '编译或链接阶段失败。' },
  'runtime-error': { label: 'RE', color: 'pink', progress: 100, description: '程序运行时发生异常。' },
};

function parseSampleCases(problem: Problem | null): SampleCase[] {
  if (!problem?.sample_cases) {
    return [];
  }

  try {
    const parsed = JSON.parse(problem.sample_cases);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        input: String(item?.input ?? ''),
        output: String(item?.output ?? ''),
        weight: Number(item?.weight ?? 0) || undefined,
      }))
      .filter((item) => item.input.length > 0 || item.output.length > 0);
  } catch {
    return [];
  }
}

function classifyFailure(message: string): { verdict: Verdict; label: string; status: number } {
  const lower = message.toLowerCase();
  if (lower.includes('compile failed') || lower.includes('link failed') || lower.includes('compile error')) {
    return { verdict: 'compile-error', label: 'Compile Error', status: 7 };
  }
  return { verdict: 'runtime-error', label: 'Runtime Error', status: 6 };
}

export default function ProblemSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [language, setLanguage] = useState('c');
  const [code, setCode] = useState('');
  const [verdict, setVerdict] = useState<Verdict>('idle');
  const [resultText, setResultText] = useState('等待提交后进行评测。');
  const [recordId, setRecordId] = useState<number | null>(null);

  const problemId = Number(id);
  const sampleCases = useMemo(() => parseSampleCases(problem), [problem]);

  useEffect(() => {
    let active = true;

    const loadProblem = async () => {
      if (!Number.isFinite(problemId) || problemId <= 0) {
        setLoadingProblem(false);
        toast({ title: '无效题号', status: 'error', duration: 3000 });
        return;
      }

      setLoadingProblem(true);
      try {
        const res = await getProblemDetail(problemId);
        if (res.code === 0) {
          if (active) {
            setProblem(res.data);
          }
        } else {
          toast({ title: '加载题目失败', description: res.msg || '无法读取题目样例', status: 'error', duration: 3000 });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '无法读取题目样例';
        toast({ title: '加载题目失败', description: message, status: 'error', duration: 3000 });
      } finally {
        if (active) {
          setLoadingProblem(false);
        }
      }
    };

    loadProblem();

    return () => {
      active = false;
    };
  }, [problemId, toast]);

  const saveRecordAndGo = async (payload: {
    status: number;
    timeUsed: number;
    errorInfo: string;
    summary: string;
    detail: string;
  }) => {
    setVerdict('saving');
    const res = await submitRecord({
      problem_id: problemId,
      language,
      code,
      status: payload.status,
      time_used: payload.timeUsed,
      memory_used: 0,
      error_info: payload.errorInfo,
    });

    if (res.code !== 0) {
      throw new Error(res.msg || '保存评测结果失败');
    }

    setRecordId(res.data.id);
    setResultText(`${payload.summary}\n\n${payload.detail}`);
    toast({ title: '评测结果已保存', status: 'success', duration: 2200 });

    window.setTimeout(() => {
      router.push(`/record/${res.data.id}`);
    }, 450);
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast({ title: '代码不能为空', status: 'warning', duration: 3000 });
      return;
    }

    if (language !== 'c' && language !== 'cpp') {
      toast({ title: '目前端侧编译仅支持 C/C++', status: 'info', duration: 3000 });
      return;
    }

    // Avoid linker-stage "undefined symbol: main" by checking entrypoint up front.
    if (!/\bmain\s*\(/.test(code)) {
      toast({ title: '缺少 main 函数', description: '请确认提交代码包含 main 入口函数', status: 'warning', duration: 3200 });
      return;
    }

    if (!sampleCases.length) {
      toast({ title: '题目没有可用样例', status: 'error', duration: 3000 });
      return;
    }

    setVerdict('compiling');
    setResultText('正在下载编译器并准备执行...');
    setRecordId(null);

    try {
      const compilerUrl = '/llvm-wasm/index.js';
      const importFn = new Function('url', 'return import(url)');
      const compilerModule = await importFn(compilerUrl);
      const compileAndRun = compilerModule.compileAndRun;

      let allPassed = true;
      let totalScore = 0;
      let totalTimeUsed = 0;
      const detailLines: string[] = [];
      let judgedCount = 0;

      for (let index = 0; index < sampleCases.length; index++) {
        const sample = sampleCases[index];
        setVerdict('judging');
        setResultText(`正在执行测试点 #${index + 1} / ${sampleCases.length}...`);

        const startedAt = performance.now();
        const stdout = await compileAndRun(code, sample.input, language);
        totalTimeUsed += performance.now() - startedAt;
        judgedCount += 1;

        const actualOutput = stdout.trim();
        const expectedOutput = sample.output.trim();
        const weight = sample.weight && sample.weight > 0
          ? sample.weight
          : Math.max(1, Math.floor(100 / sampleCases.length)) + (index === sampleCases.length - 1 ? 100 % sampleCases.length : 0);

        if (actualOutput === expectedOutput) {
          totalScore += weight;
          detailLines.push(`测试点 #${index + 1}: AC`);
        } else {
          allPassed = false;
          detailLines.push(`测试点 #${index + 1}: WA (期望: ${expectedOutput}, 实际: ${actualOutput})`);
        }
      }

      const finalStatus = allPassed ? 2 : 3;
      await saveRecordAndGo({
        status: finalStatus,
        timeUsed: Math.max(1, Math.round(totalTimeUsed)),
        errorInfo: allPassed ? '' : detailLines.join('\n'),
        summary: allPassed
          ? `AC | 通过 ${judgedCount}/${sampleCases.length} 个测试点 | 得分 ${totalScore}/100`
          : `WA | 通过 ${judgedCount - detailLines.filter((line) => line.includes('WA')).length}/${sampleCases.length} 个测试点 | 得分 ${totalScore}/100`,
        detail: detailLines.join('\n'),
      });
      setVerdict('accepted');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const failure = classifyFailure(message);
      setVerdict(failure.verdict);
      setResultText(`${failure.label}\n\n${message}`);

      try {
        await saveRecordAndGo({
          status: failure.status,
          timeUsed: 0,
          errorInfo: message,
          summary: `${failure.label} | 评测失败`,
          detail: message,
        });
      } catch (saveError: unknown) {
        const saveMessage = saveError instanceof Error ? saveError.message : '保存失败';
        toast({ title: '保存评测结果失败', description: saveMessage, status: 'error', duration: 3500 });
      }
    }
  };

  if (loadingProblem && !problem) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    );
  }

  const stage = phaseMeta[verdict];

  return (
    <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Flex justify="space-between" align="center" mb={6} gap={4} flexWrap="wrap">
        <Box>
          <Heading size="lg" color="gray.800">提交代码 - {id}</Heading>
          <Text color="gray.500" mt={1}>测试数据从题目表的 sample_cases 读取，评测结果会写入 records 表。</Text>
        </Box>
        <Button variant="outline" onClick={() => router.push(`/problem/${id}`)}>返回题目</Button>
      </Flex>

      <Stack spacing={4} mb={6} direction={{ base: 'column', lg: 'row' }}>
        <Box flex={1} p={4} borderWidth={1} borderRadius="lg" borderColor={`${stage.color}.100`} bg={`${stage.color}.50`}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="700" color="gray.700">当前阶段</Text>
            <Badge colorScheme={stage.color}>{stage.label}</Badge>
          </HStack>
          <Text color="gray.700">{stage.description}</Text>
          {(verdict === 'compiling' || verdict === 'judging' || verdict === 'saving') && (
            <Progress mt={4} size="sm" colorScheme={stage.color} isIndeterminate />
          )}
        </Box>

        <Box flex={1} p={4} borderWidth={1} borderRadius="lg" borderColor="gray.200" bg="gray.50">
          <Text fontWeight="700" color="gray.700" mb={2}>样例测试点</Text>
          <Text color="gray.600">{sampleCases.length} 个样例测试点来自数据库中的问题配置。</Text>
          <Text color="gray.500" fontSize="sm" mt={2}>记录保存后会自动跳转到对应的评测详情页。</Text>
        </Box>
      </Stack>

      <VStack spacing={4} align="stretch">
        <HStack>
          <Text fontWeight="bold" w="100px">语言:</Text>
          <Select value={language} onChange={(e) => setLanguage(e.target.value)} w="200px" isDisabled={verdict === 'compiling' || verdict === 'judging' || verdict === 'saving'}>
            <option value="c">C (Clang WASM端侧)</option>
            <option value="cpp">C++ (Clang WASM端侧)</option>
            <option value="java" disabled>Java (暂不支持)</option>
            <option value="python3" disabled>Python 3 (暂不支持)</option>
          </Select>
        </HStack>

        <Box>
          <Text fontWeight="bold" mb={2}>源代码:</Text>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// 在这里输入你的 C/C++ 代码..."
            minH="300px"
            fontFamily="monospace"
            isDisabled={verdict === 'compiling' || verdict === 'judging' || verdict === 'saving'}
          />
        </Box>

        <Box p={4} borderWidth={1} borderColor={`${stage.color}.100`} borderRadius="lg" bg={`${stage.color}.50`}>
          <Flex align="center" justify="space-between" mb={2} gap={4} flexWrap="wrap">
            <HStack spacing={3}>
              <Badge colorScheme={stage.color} fontSize="sm" px={2} py={1}>{stage.label}</Badge>
              {recordId ? <Badge colorScheme="green" fontSize="sm" px={2} py={1}>Record #{recordId}</Badge> : null}
            </HStack>
            <Text fontSize="sm" color="gray.500">{problem ? problem.title : '正在加载题目样例...'}</Text>
          </Flex>
          <Box p={4} bg="white" borderRadius="md" borderWidth={1} borderColor="gray.200" minH="120px">
            <Code display="block" whiteSpace="pre-wrap" bg="transparent" color="gray.800">{resultText}</Code>
          </Box>
        </Box>

        {sampleCases.length > 0 && (
          <Box>
            <Text fontWeight="bold" mb={2}>数据库样例预览</Text>
            <Stack spacing={3}>
              {sampleCases.map((sample, index) => (
                <Box key={`${index}-${sample.input}`} p={4} borderWidth={1} borderColor="gray.200" borderRadius="md" bg="gray.50">
                  <Text fontSize="sm" fontWeight="700" color="gray.600" mb={2}>测试点 #{index + 1}</Text>
                  <HStack align="start" spacing={4} flexDir={{ base: 'column', md: 'row' }}>
                    <Box flex={1} minW={0}>
                      <Text fontSize="xs" color="gray.500" mb={1}>输入</Text>
                      <Code display="block" whiteSpace="pre-wrap" w="full">{sample.input}</Code>
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text fontSize="xs" color="gray.500" mb={1}>输出</Text>
                      <Code display="block" whiteSpace="pre-wrap" w="full">{sample.output}</Code>
                    </Box>
                  </HStack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <Flex justify="flex-end">
          <Button colorScheme="blue" size="lg" onClick={handleSubmit} isLoading={verdict === 'compiling' || verdict === 'judging' || verdict === 'saving'} loadingText="正在评测">
            提交并测试
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
}
