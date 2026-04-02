"use client";

import { FormEvent, useState } from 'react';
import {
  Checkbox,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Switch,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { createBlog } from '@/api/blog';
import { useAuthStore } from '@/store/auth';

export default function DiscussNewPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isSolution, setIsSolution] = useState(false);
  const [linkProblem, setLinkProblem] = useState(false);
  const [problemId, setProblemId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    const tags = tagsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (isSolution && !tags.includes('题解')) {
      tags.push('题解');
    }
    const linkedProblemId = linkProblem ? Number(problemId || 0) : 0;

    if (!isAuthenticated) {
      toast({ title: '请先登录', description: '登录后可发布帖子', status: 'warning', duration: 2500, isClosable: true });
      router.push('/user/login');
      return;
    }

    if (!t || !c) {
      toast({ title: '标题和内容不能为空', status: 'warning', duration: 2000, isClosable: true });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createBlog({
        title: t,
        content: c,
        tags,
        problem_id: linkedProblemId > 0 ? linkedProblemId : 0,
      });
      if (res.code === 0) {
        toast({ title: '发帖成功', status: 'success', duration: 2000, isClosable: true });
        router.push(`/discuss/${res.data.id}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '发帖失败';
      toast({ title: '发帖失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Heading size="lg" mb={2}>发布新帖</Heading>
      <Text color="gray.500" mb={6}>在这里发布你的讨论主题和内容。</Text>

      <VStack as="form" onSubmit={handleSubmit} spacing={5} align="stretch">
        <FormControl isRequired>
          <FormLabel>标题</FormLabel>
          <Input
            placeholder="请输入帖子标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>内容</FormLabel>
          <Textarea
            placeholder="请输入帖子内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            maxLength={20000}
          />
        </FormControl>

        <FormControl>
          <FormLabel>标签管理</FormLabel>
          <Input
            placeholder="多个标签请用英文逗号分隔，例如：经验分享,动态规划"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <HStack justify="space-between" align="center">
            <FormLabel mb={0}>题解标签</FormLabel>
            <Checkbox isChecked={isSolution} onChange={(e) => setIsSolution(e.target.checked)}>
              标记为题解
            </Checkbox>
          </HStack>
        </FormControl>

        {isSolution && (
          <FormControl>
            <HStack justify="space-between" align="center" mb={2}>
              <FormLabel mb={0}>关联题目</FormLabel>
              <Switch isChecked={linkProblem} onChange={(e) => setLinkProblem(e.target.checked)} />
            </HStack>
            <Input
              placeholder="题号，例如 1000（关闭关联则留空）"
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              isDisabled={!linkProblem}
            />
          </FormControl>
        )}

        <Button type="submit" colorScheme="blue" alignSelf="flex-end" isLoading={submitting} loadingText="发布中">
          发布
        </Button>
      </VStack>
    </Box>
  );
}
