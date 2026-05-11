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
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { AiConfig, getAiConfig, updateAiConfig } from "@/api/ai";

const PROVIDER_PRESETS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  custom: { baseUrl: "", model: "" },
};

const FEATURE_LABELS: Array<{ key: keyof AiConfig["features"]; label: string; desc: string }> = [
  { key: "analyzeError", label: "AI 错误分析", desc: "在评测详情页分析 WA/RE/TLE/CE 原因，给出修复提示" },
  { key: "generateSolution", label: "AI 题解生成", desc: "根据 AC 代码自动生成结构化题解" },
  { key: "generateProblem", label: "AI 题目生成", desc: "管理员生成题目描述、样例和测试数据" },
  { key: "contestAnalysis", label: "AI 赛后分析", desc: "比赛结束后自动生成比赛分析报告" },
  { key: "explainCode", label: "AI 代码解释", desc: "解释任意提交代码的算法思路和执行流程" },
  { key: "recommend", label: "AI 智能推荐", desc: "基于用户历史推荐个性化练习题" },
  { key: "summarizeArticle", label: "AI 讨论总结", desc: "一键总结讨论帖/题解的正文和所有回复" },
];

export default function AdminAiConfigPage() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [features, setFeatures] = useState<AiConfig["features"]>({
    analyzeError: true,
    generateSolution: true,
    generateProblem: true,
    contestAnalysis: true,
    explainCode: true,
    recommend: true,
    summarizeArticle: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || (user && user.role !== 1)) {
      router.push("/");
      return;
    }

    const load = async () => {
      try {
        const res = await getAiConfig();
        if (res.code === 0) {
          const config = res.data;
          setProvider(config.provider);
          setBaseUrl(config.baseUrl);
          setModel(config.model);
          setFeatures(config.features);
          if (config.hasApiKey) {
            setApiKey(config.apiKey);
          }
        }
      } catch {
        toast({ title: "加载配置失败", status: "error", duration: 3000 });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mounted, isAuthenticated, user, router, toast]);

  const handleProviderChange = useCallback((value: string) => {
    setProvider(value);
    const preset = PROVIDER_PRESETS[value];
    if (preset && value !== "custom") {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await updateAiConfig({
        provider,
        apiKey: apiKey.includes("****") ? undefined : apiKey,
        baseUrl,
        model,
        featureAnalyzeError: features.analyzeError,
        featureGenerateSolution: features.generateSolution,
        featureGenerateProblem: features.generateProblem,
        featureContestAnalysis: features.contestAnalysis,
        featureExplainCode: features.explainCode,
        featureRecommend: features.recommend,
        featureSummarizeArticle: features.summarizeArticle,
      });
      if (res.code === 0) {
        toast({ title: "配置已保存", status: "success", duration: 3000 });
      } else {
        toast({ title: res.msg || "保存失败", status: "error", duration: 3000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "保存失败";
      toast({ title: msg, status: "error", duration: 3000 });
    } finally {
      setSaving(false);
    }
  }, [provider, apiKey, baseUrl, model, features, toast]);

  if (!mounted) return null;
  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <Container maxW="900px" py={8}>
      <Heading size="lg" mb={2} color="gray.800">AI 功能配置</Heading>
      <Text color="gray.500" mb={8}>
        配置 LLM 提供商和 API 密钥，控制各项 AI 功能的开关。支持所有兼容 OpenAI API 的服务（OpenAI、DeepSeek 等）。
      </Text>

      <VStack spacing={6} align="stretch">
        {/* Provider Settings */}
        <Card>
          <CardHeader pb={0}>
            <Heading size="md">LLM 提供商</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>提供商</FormLabel>
                <Select value={provider} onChange={(e) => handleProviderChange(e.target.value)}>
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="custom">自定义</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>API Key</FormLabel>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKey.includes("****") ? "留空则不修改" : "sk-..."}
                />
              </FormControl>

              <FormControl>
                <FormLabel>API Base URL</FormLabel>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </FormControl>

              <FormControl>
                <FormLabel>模型名称</FormLabel>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </FormControl>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader pb={0}>
            <Heading size="md">功能开关</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch" divider={<Divider />}>
              {FEATURE_LABELS.map(({ key, label, desc }) => (
                <Flex key={key} justify="space-between" align="center" py={2}>
                  <Box>
                    <HStack spacing={2} mb={1}>
                      <Text fontWeight="600">{label}</Text>
                      <Badge colorScheme={features[key] ? "green" : "gray"}>
                        {features[key] ? "已启用" : "已关闭"}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">{desc}</Text>
                  </Box>
                  <Switch
                    isChecked={features[key]}
                    onChange={(e) =>
                      setFeatures((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    colorScheme="blue"
                    size="lg"
                  />
                </Flex>
              ))}
            </VStack>
          </CardBody>
        </Card>

        <Flex justify="flex-end">
          <Button colorScheme="blue" size="lg" onClick={handleSave} isLoading={saving} loadingText="保存中...">
            保存配置
          </Button>
        </Flex>
      </VStack>
    </Container>
  );
}
