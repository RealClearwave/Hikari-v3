"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Icon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Spinner,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiCrosshair,
  FiShield,
  FiTarget,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/auth';
import request, { ApiResponse } from '@/utils/request';

interface ClusterPoint {
  id: number;
  features: number[];
}

interface RawCluster {
  centroid: number[];
  points: ClusterPoint[];
}

interface ClusterSummaryItem {
  clusterIndex: number;
  size: number;
  percentage: string;
  centroid: { time_used: number; memory_used: number };
  stdDev: number;
  description: string;
}

interface TrainResult {
  problem_id: number;
  k: number;
  training_samples: number;
  total_ac_samples: number;
  time_range: { min: number; max: number };
  memory_range: { min: number; max: number };
  clusters: ClusterSummaryItem[];
  silhouette_score: number;
  iterations: number;
  converged: boolean;
  elbow_curve: Array<{ k: number; wcss: number }>;
  raw_clusters: RawCluster[];
  _normalization: { timeRange: [number, number]; memRange: [number, number] };
}

interface DetectResult {
  problem_id: number;
  submission: { time_used: number; memory_used: number };
  normal_baseline: {
    avg_time: number;
    avg_memory: number;
    samples: number;
    time_range: { min: number; max: number };
    memory_range: { min: number; max: number };
  };
  anomaly_report: {
    isAnomaly: boolean;
    anomalyScore: number;
    nearestCluster: number;
    distanceToNearestCluster: number;
    threshold: number;
    details: string;
  };
  cluster_summary: ClusterSummaryItem[];
  silhouette_score: number;
  _clusters: RawCluster[];
  _normalization: { timeRange: [number, number]; memRange: [number, number] };
  _testPoint: number[];
  _sensitivity: number;
}

interface ProblemInfo {
  problem_id: number;
  can_train: boolean;
  reason?: string;
  ac_count: number;
  total_submissions: number;
  training_samples?: number;
  time_range?: { min: number; max: number };
  memory_range?: { min: number; max: number };
  clusters?: ClusterSummaryItem[];
  silhouette_score?: number;
  converged?: boolean;
  iterations?: number;
}

interface ProblemListItem {
  id: number;
  title: string;
  ac_count: number;
  total_submissions: number;
}

// Simple SVG scatter plot colors
const CLUSTER_COLORS = ['#3182CE', '#38A169', '#DD6B20', '#805AD5', '#E53E3E', '#319795', '#D69E2E', '#B83280'];
const ANOMALY_COLOR = '#E53E3E';

export default function KmeansDemoPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  // State
  const [problemList, setProblemList] = useState<ProblemListItem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [selectedProblemId, setSelectedProblemId] = useState<number>(0);
  const [k, setK] = useState(3);
  const [sensitivity, setSensitivity] = useState(2.5);

  // Train state
  const [trainResult, setTrainResult] = useState<TrainResult | null>(null);
  const [training, setTraining] = useState(false);
  const [problemInfo, setProblemInfo] = useState<ProblemInfo | null>(null);
  const [, setLoadingInfo] = useState(false);

  // Detect state
  const [testTime, setTestTime] = useState(100);
  const [testMemory, setTestMemory] = useState(1024);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [detecting, setDetecting] = useState(false);

  const isAdmin = user?.role === 1;

  // Fetch problem list
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res: ApiResponse<{ list: Array<{ id: number; title: string }> }> =
          await request.get('/problem/list', { params: { page: 1, size: 100 } });
        if (res.code === 0 && res.data) {
          // For each problem, get quick AC count
          const enriched: ProblemListItem[] = [];
          for (const p of res.data.list.slice(0, 20)) {
            try {
              const infoRes: ApiResponse<ProblemInfo> = await request.get('/admin/kmeans', {
                params: { problem_id: p.id },
              });
              if (infoRes.code === 0 && infoRes.data) {
                enriched.push({
                  id: p.id,
                  title: p.title,
                  ac_count: infoRes.data.ac_count,
                  total_submissions: infoRes.data.total_submissions,
                });
              }
            } catch {
              // skip
            }
          }
          setProblemList(enriched.sort((a, b) => b.ac_count - a.ac_count));
        }
      } catch {
        // ignore
      } finally {
        setLoadingProblems(false);
      }
    })();
  }, [isAdmin]);

  // Load problem info
  const loadProblemInfo = useCallback(async () => {
    if (!selectedProblemId || selectedProblemId <= 0) return;
    setLoadingInfo(true);
    setProblemInfo(null);
    setTrainResult(null);
    setDetectResult(null);
    try {
      const res: ApiResponse<ProblemInfo> = await request.get('/admin/kmeans', {
        params: { problem_id: selectedProblemId },
      });
      if (res.code === 0 && res.data) {
        setProblemInfo(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载失败';
      toast({ title: '加载题目信息失败', description: msg, status: 'error' });
    } finally {
      setLoadingInfo(false);
    }
  }, [selectedProblemId, toast]);

  useEffect(() => {
    if (selectedProblemId > 0) loadProblemInfo();
  }, [selectedProblemId, loadProblemInfo]);

  // Train
  const handleTrain = async () => {
    setTraining(true);
    setTrainResult(null);
    try {
      const res: ApiResponse<TrainResult> = await request.post('/admin/kmeans', {
        action: 'train',
        problem_id: selectedProblemId,
        k,
      });
      if (res.code === 0 && res.data) {
        setTrainResult(res.data);
        toast({ title: '训练完成', description: `聚类数=${k}, Silhouette=${res.data.silhouette_score}`, status: 'success' });
      } else {
        toast({ title: '训练失败', description: String((res as { msg?: string }).msg || '未知错误'), status: 'error' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '训练失败';
      toast({ title: '训练失败', description: msg, status: 'error' });
    } finally {
      setTraining(false);
    }
  };

  // Detect
  const handleDetect = async () => {
    setDetecting(true);
    setDetectResult(null);
    try {
      const res: ApiResponse<DetectResult> = await request.post('/admin/kmeans', {
        action: 'detect',
        problem_id: selectedProblemId,
        time_used: testTime,
        memory_used: testMemory,
        sensitivity,
      });
      if (res.code === 0 && res.data) {
        setDetectResult(res.data);
        const isAnomaly = res.data.anomaly_report.isAnomaly;
        toast({
          title: isAnomaly ? '⚠️ 检测到异常提交' : '✅ 提交正常',
          description: `异常分数: ${res.data.anomaly_report.anomalyScore}`,
          status: isAnomaly ? 'warning' : 'success',
          duration: 5000,
        });
      } else {
        toast({ title: '检测失败', description: String((res as { msg?: string }).msg || '未知错误'), status: 'error' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '检测失败';
      toast({ title: '检测失败', description: msg, status: 'error' });
    } finally {
      setDetecting(false);
    }
  };

  // SVg scatter plot
  const scatterSvg = useMemo(() => {
    const result = detectResult || trainResult;
    if (!result) return null;

    const clusters: RawCluster[] = 'raw_clusters' in result
      ? (result as TrainResult).raw_clusters
      : '_clusters' in result
        ? (result as DetectResult)._clusters
        : [];
    if (!clusters || clusters.length === 0) return null;

    const testPoint: number[] | undefined = '_testPoint' in result
      ? (result as DetectResult)._testPoint
      : undefined;

    const W = 480, H = 360, PAD = 40;
    const plotW = W - PAD * 2, plotH = H - PAD * 2;

    const xLabel = '执行耗时 (归一化)';
    const yLabel = '内存占用 (归一化)';

    // Scale: features are already 0-1 normalized
    const scaleX = (v: number) => PAD + v * plotW;
    const scaleY = (v: number) => H - PAD - v * plotH;

    // Grid lines
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
      const x = PAD + (i / 4) * plotW;
      const y = H - PAD - (i / 4) * plotH;
      gridLines.push(
        <line key={`gx${i}`} x1={x} y1={PAD} x2={x} y2={H - PAD} stroke="#E2E8F0" strokeWidth={1} />,
        <line key={`gy${i}`} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#E2E8F0" strokeWidth={1} />,
      );
    }

    return (
      <svg width={W} height={H} style={{ background: 'white', borderRadius: 8 }}>
        {/* Grid */}
        {gridLines}

        {/* Axis labels */}
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#718096">{xLabel}</text>
        <text x={14} y={H / 2} textAnchor="middle" fontSize={11} fill="#718096" transform={`rotate(-90, 14, ${H / 2})`}>{yLabel}</text>

        {/* Axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <text key={`xt${v}`} x={scaleX(v)} y={H - PAD + 14} textAnchor="middle" fontSize={9} fill="#A0AEC0">
            {v.toFixed(2)}
          </text>
        ))}

        {/* Cluster points */}
        {clusters.map((cluster, ci) =>
          cluster.points.map((p, pi) => (
            <circle
              key={`c${ci}p${pi}`}
              cx={scaleX(p.features[0])}
              cy={scaleY(p.features[1])}
              r={3.5}
              fill={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
              opacity={0.6}
            >
              <title>ID#{p.id} — [{p.features[0].toFixed(3)}, {p.features[1].toFixed(3)}]</title>
            </circle>
          ))
        )}

        {/* Centroids */}
        {clusters.map((cluster, ci) => (
          <g key={`centroid${ci}`}>
            <circle
              cx={scaleX(cluster.centroid[0])}
              cy={scaleY(cluster.centroid[1])}
              r={7}
              fill="none"
              stroke={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
              strokeWidth={2.5}
            />
            <circle
              cx={scaleX(cluster.centroid[0])}
              cy={scaleY(cluster.centroid[1])}
              r={3}
              fill={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
            />
            <text
              x={scaleX(cluster.centroid[0]) + 10}
              y={scaleY(cluster.centroid[1]) - 5}
              fontSize={10}
              fill={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
              fontWeight="bold"
            >
              C{ci + 1}
            </text>
          </g>
        ))}

        {/* Test point (for detect mode) */}
        {testPoint && (
          <g>
            <circle
              cx={scaleX(testPoint[0])}
              cy={scaleY(testPoint[1])}
              r={8}
              fill="none"
              stroke={detectResult?.anomaly_report?.isAnomaly ? ANOMALY_COLOR : '#38A169'}
              strokeWidth={3}
              strokeDasharray="4,2"
            />
            <circle
              cx={scaleX(testPoint[0])}
              cy={scaleY(testPoint[1])}
              r={5}
              fill={detectResult?.anomaly_report?.isAnomaly ? ANOMALY_COLOR : '#38A169'}
            />
            <text
              x={scaleX(testPoint[0]) + 12}
              y={scaleY(testPoint[1]) - 8}
              fontSize={11}
              fill={detectResult?.anomaly_report?.isAnomaly ? ANOMALY_COLOR : '#38A169'}
              fontWeight="bold"
            >
              {detectResult?.anomaly_report?.isAnomaly ? '⚠️ 异常' : '✅ 测试点'}
            </text>
          </g>
        )}

        {/* Legend */}
        <g transform={`translate(${PAD}, ${PAD - 8})`}>
          {clusters.map((cluster, ci) => (
            <g key={`legend${ci}`} transform={`translate(${ci * 90}, 0)`}>
              <rect width={10} height={10} fill={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]} opacity={0.7} rx={2} />
              <text x={14} y={9} fontSize={9} fill="#4A5568">聚类{ci + 1} ({cluster.points.length})</text>
            </g>
          ))}
        </g>
      </svg>
    );
  }, [trainResult, detectResult]);

  if (!isAdmin) {
    return (
      <Container maxW="1200px" py={12}>
        <Card><CardBody><Heading size="md" color="red.500">无权限</Heading><Text mt={2} color="gray.500">此页面仅限管理员访问。</Text></CardBody></Card>
      </Container>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 6, md: 10 }}>
      <Container maxW="1200px">
        <Flex justify="space-between" align="center" mb={6}>
          <HStack>
            <Icon as={FiCrosshair} color="purple.500" boxSize={6} />
            <Heading size="lg">K-means 异常检测 · Demo</Heading>
            <Badge colorScheme="purple" variant="solid">论文模型</Badge>
          </HStack>
          <Text color="gray.500" fontSize="sm">
            基于《在线评测系统中的边缘计算应用研究》K-means 聚类防作弊理论
          </Text>
        </Flex>

        {/* Step 1: Select Problem */}
        <Card mb={4}>
          <CardBody>
            <Heading size="sm" mb={4}>
              <Icon as={FiTarget} mr={2} color="blue.500" />
              Step 1: 选择题目标
            </Heading>
            {loadingProblems ? (
              <Spinner size="sm" />
            ) : (
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
                <FormControl>
                  <FormLabel>题目（按 AC 数排序）</FormLabel>
                  <Select
                    value={selectedProblemId || ''}
                    onChange={(e) => setSelectedProblemId(Number(e.target.value) || 0)}
                    placeholder="选择题目标..."
                  >
                    {problemList.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} {p.title} (AC: {p.ac_count}, 总提交: {p.total_submissions})
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>聚类数 K</FormLabel>
                  <NumberInput value={k} onChange={(_, v) => setK(v)} min={2} max={8}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper /><NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>异常检测灵敏度</FormLabel>
                  <NumberInput
                    value={sensitivity}
                    onChange={(_, v) => setSensitivity(v)}
                    min={1}
                    max={5}
                    step={0.5}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper /><NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text fontSize="xs" color="gray.500">阈值 = 聚类标准差 × 灵敏度（越大越宽松）</Text>
                </FormControl>
              </Grid>
            )}
          </CardBody>
        </Card>

        {/* Problem Info */}
        {problemInfo && (
          <Card mb={4}>
            <CardBody>
              <Flex justify="space-between" align="center" mb={3}>
                <Heading size="sm">
                  <Icon as={FiActivity} mr={2} color="green.500" />
                  题目 #{problemInfo.problem_id} 数据概况
                </Heading>
                <HStack>
                  {problemInfo.can_train ? (
                    <Badge colorScheme="green">可训练 ({problemInfo.ac_count} 条 AC)</Badge>
                  ) : (
                    <Badge colorScheme="red">{problemInfo.reason}</Badge>
                  )}
                </HStack>
              </Flex>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                <Stat>
                  <StatLabel>AC 提交数</StatLabel>
                  <StatNumber fontSize="lg">{problemInfo.ac_count}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>总提交数</StatLabel>
                  <StatNumber fontSize="lg">{problemInfo.total_submissions}</StatNumber>
                </Stat>
                {problemInfo.time_range && (
                  <Stat>
                    <StatLabel>耗时范围 (ms)</StatLabel>
                    <StatNumber fontSize="lg">{problemInfo.time_range.min}–{problemInfo.time_range.max}</StatNumber>
                  </Stat>
                )}
                {problemInfo.silhouette_score !== undefined && (
                  <Stat>
                    <StatLabel>Silhouette 分数</StatLabel>
                    <StatNumber fontSize="lg" color={problemInfo.silhouette_score > 0.5 ? 'green.500' : 'orange.500'}>
                      {problemInfo.silhouette_score}
                    </StatNumber>
                    <StatHelpText>{problemInfo.silhouette_score > 0.5 ? '聚类质量良好' : '聚类质量一般'}</StatHelpText>
                  </Stat>
                )}
              </SimpleGrid>
              {problemInfo.can_train && (
                <Button
                  mt={4}
                  colorScheme="purple"
                  onClick={handleTrain}
                  isLoading={training}
                  loadingText="训练中..."
                  leftIcon={<FiCpu />}
                >
                  开始 K-means 训练
                </Button>
              )}
            </CardBody>
          </Card>
        )}

        {/* Train Results */}
        {trainResult && (
          <>
            {/* Cluster Summary */}
            <Card mb={4}>
              <CardBody>
                <Heading size="sm" mb={3}>
                  <Icon as={FiCrosshair} mr={2} color="purple.500" />
                  聚类结果 (K={trainResult.k}, Silhouette={trainResult.silhouette_score}, {trainResult.iterations} 轮{' '}
                  {trainResult.converged ? '收敛' : '未收敛'})
                </Heading>
                <Table variant="simple" size="sm" mb={4}>
                  <Thead>
                    <Tr>
                      <Th>聚类</Th>
                      <Th isNumeric>样本数</Th>
                      <Th isNumeric>占比</Th>
                      <Th isNumeric>耗时(归一化)</Th>
                      <Th isNumeric>内存(归一化)</Th>
                      <Th isNumeric>标准差</Th>
                      <Th>特征描述</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {trainResult.clusters.map((c, i) => (
                      <Tr key={i}>
                        <Td>
                          <Badge colorScheme={CLUSTER_COLORS[i % CLUSTER_COLORS.length].replace('#', '') as unknown as string || 'blue'}>
                            C{i + 1}
                          </Badge>
                        </Td>
                        <Td isNumeric fontWeight="bold">{c.size}</Td>
                        <Td isNumeric>{c.percentage}</Td>
                        <Td isNumeric fontFamily="mono">{c.centroid.time_used.toFixed(3)}</Td>
                        <Td isNumeric fontFamily="mono">{c.centroid.memory_used.toFixed(3)}</Td>
                        <Td isNumeric fontFamily="mono">{c.stdDev}</Td>
                        <Td>{c.description}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>

                {/* Scatter plot */}
                <Flex justify="center">{scatterSvg}</Flex>
              </CardBody>
            </Card>

            {/* Elbow curve visualization */}
            {trainResult.elbow_curve && trainResult.elbow_curve.length > 0 && (
              <Card mb={4}>
                <CardBody>
                  <Heading size="sm" mb={3}>Elbow 曲线（最优 K 值分析）</Heading>
                  <Box overflowX="auto">
                    <Flex align="flex-end" gap={4} h="120px" px={4}>
                      {trainResult.elbow_curve.map((pt) => {
                        const maxWcss = Math.max(...trainResult.elbow_curve.map((e) => e.wcss));
                        const height = (pt.wcss / maxWcss) * 100;
                        const isOptimal = pt.k === (trainResult.k);
                        return (
                          <VStack key={pt.k} spacing={1} flex={1}>
                            <Text fontSize="xs" color="gray.500" fontWeight={isOptimal ? 'bold' : 'normal'}>
                              {Math.round(pt.wcss)}
                            </Text>
                            <Box
                              w="100%"
                              h={`${height}%`}
                              bg={isOptimal ? 'purple.400' : 'gray.300'}
                              borderRadius="sm"
                              minH="4px"
                              transition="all 0.3s"
                              title={`K=${pt.k}: WCSS=${Math.round(pt.wcss)}${isOptimal ? ' (已选择)' : ''}`}
                            />
                            <Text fontSize="xs" color={isOptimal ? 'purple.600' : 'gray.500'} fontWeight={isOptimal ? 'bold' : 'normal'}>
                              K={pt.k}
                            </Text>
                          </VStack>
                        );
                      })}
                    </Flex>
                  </Box>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* Detect Section */}
        {trainResult && (
          <Card mb={4}>
            <CardBody>
              <Heading size="sm" mb={4}>
                <Icon as={FiShield} mr={2} color="orange.500" />
                Step 2: 模拟异常检测
              </Heading>
              <Text fontSize="sm" color="gray.500" mb={4}>
                输入一个模拟的提交数据（执行耗时 + 内存占用），检测它是否偏离正常聚类簇。
                正常 AC 提交的耗时范围: {trainResult.time_range.min}–{trainResult.time_range.max} ms，
                内存范围: {trainResult.memory_range.min}–{trainResult.memory_range.max} KB。
              </Text>

              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4} mb={4}>
                <FormControl>
                  <FormLabel>执行耗时 (ms)</FormLabel>
                  <NumberInput value={testTime} onChange={(_, v) => setTestTime(v)} min={0}>
                    <NumberInputField />
                  </NumberInput>
                  <Text fontSize="xs" color="gray.500">
                    正常范围: {trainResult.time_range.min}–{trainResult.time_range.max} ms
                  </Text>
                </FormControl>
                <FormControl>
                  <FormLabel>内存占用 (KB)</FormLabel>
                  <NumberInput value={testMemory} onChange={(_, v) => setTestMemory(v)} min={0}>
                    <NumberInputField />
                  </NumberInput>
                  <Text fontSize="xs" color="gray.500">
                    正常范围: {trainResult.memory_range.min}–{trainResult.memory_range.max} KB
                  </Text>
                </FormControl>
                <FormControl>
                  <FormLabel>&nbsp;</FormLabel>
                  <Button
                    colorScheme="orange"
                    onClick={handleDetect}
                    isLoading={detecting}
                    loadingText="检测中..."
                    leftIcon={<FiAlertTriangle />}
                    w="full"
                  >
                    检测异常
                  </Button>
                </FormControl>
              </Grid>

              {/* Quick test buttons */}
              <HStack spacing={2} mb={4} flexWrap="wrap">
                <Text fontSize="xs" color="gray.500">快速测试:</Text>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="green"
                  onClick={() => {
                    setTestTime(Math.round(trainResult.time_range.min + (trainResult.time_range.max - trainResult.time_range.min) * 0.2));
                    setTestMemory(Math.round(trainResult.memory_range.min + (trainResult.memory_range.max - trainResult.memory_range.min) * 0.2));
                  }}
                >
                  正常提交
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="red"
                  onClick={() => {
                    setTestTime(trainResult.time_range.max * 5);
                    setTestMemory(trainResult.memory_range.max * 4);
                  }}
                >
                  极端异常（超高耗时+高内存）
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="orange"
                  onClick={() => {
                    setTestTime(trainResult.time_range.max * 2);
                    setTestMemory(Math.round(trainResult.memory_range.min * 0.5));
                  }}
                >
                  边缘异常（偏高耗时）
                </Button>
              </HStack>

              {/* Detect Result */}
              {detectResult && (
                <Box
                  p={4}
                  borderRadius="md"
                  borderWidth={2}
                  borderColor={detectResult.anomaly_report.isAnomaly ? 'red.300' : 'green.300'}
                  bg={detectResult.anomaly_report.isAnomaly ? 'red.50' : 'green.50'}
                >
                  <Flex justify="space-between" align="center" mb={3}>
                    <HStack>
                      <Icon
                        as={detectResult.anomaly_report.isAnomaly ? FiAlertTriangle : FiCheckCircle}
                        color={detectResult.anomaly_report.isAnomaly ? 'red.500' : 'green.500'}
                        boxSize={6}
                      />
                      <Heading size="md">
                        {detectResult.anomaly_report.isAnomaly ? '⚠️ 检测到异常提交' : '✅ 提交正常'}
                      </Heading>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={detectResult.anomaly_report.isAnomaly ? 'red' : 'green'} fontSize="md" px={3} py={1}>
                        异常分数: {detectResult.anomaly_report.anomalyScore}
                      </Badge>
                      <Badge colorScheme="purple" variant="outline">
                        距离阈值: {detectResult.anomaly_report.threshold}
                      </Badge>
                    </HStack>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={4}>
                    <Stat>
                      <StatLabel>提交耗时</StatLabel>
                      <StatNumber fontSize="lg" color={detectResult.anomaly_report.isAnomaly ? 'red.500' : 'green.500'}>
                        {detectResult.submission.time_used} ms
                      </StatNumber>
                      <StatHelpText>正常均值: {detectResult.normal_baseline.avg_time} ms</StatHelpText>
                    </Stat>
                    <Stat>
                      <StatLabel>提交内存</StatLabel>
                      <StatNumber fontSize="lg">{detectResult.submission.memory_used} KB</StatNumber>
                      <StatHelpText>正常均值: {detectResult.normal_baseline.avg_memory} KB</StatHelpText>
                    </Stat>
                    <Stat>
                      <StatLabel>距最近聚类中心</StatLabel>
                      <StatNumber
                        fontSize="lg"
                        color={detectResult.anomaly_report.isAnomaly ? 'red.500' : 'green.500'}
                      >
                        {detectResult.anomaly_report.distanceToNearestCluster}
                      </StatNumber>
                      <StatHelpText>
                        阈值: {detectResult.anomaly_report.threshold} (灵敏度×{detectResult._sensitivity})
                      </StatHelpText>
                    </Stat>
                  </SimpleGrid>

                  <Text
                    fontSize="sm"
                    color={detectResult.anomaly_report.isAnomaly ? 'red.700' : 'green.700'}
                    whiteSpace="pre-wrap"
                    p={3}
                    bg="white"
                    borderRadius="md"
                  >
                    {detectResult.anomaly_report.details}
                  </Text>

                  <Flex justify="center" mt={4}>
                    {detectResult._clusters && scatterSvg}
                  </Flex>
                </Box>
              )}
            </CardBody>
          </Card>
        )}

        {/* No problem selected */}
        {!selectedProblemId && (
          <Card>
            <CardBody>
              <Flex direction="column" align="center" py={8} color="gray.400">
                <Icon as={FiTarget} boxSize={12} mb={4} />
                <Text>请先选择一道有足够 AC 提交记录的题目开始 Demo</Text>
              </Flex>
            </CardBody>
          </Card>
        )}
      </Container>
    </Box>
  );
}
