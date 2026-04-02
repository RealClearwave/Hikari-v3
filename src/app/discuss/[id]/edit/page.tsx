"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Switch,
  Text,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { getBlogDetail, updateBlog } from '@/api/blog';
import { useAuthStore } from '@/store/auth';

export default function DiscussEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.user);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isSolution, setIsSolution] = useState(false);
  const [linkProblem, setLinkProblem] = useState(false);
  const [problemId, setProblemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const blogId = Number(id);
    if (!Number.isFinite(blogId) || blogId <= 0) {
      setLoading(false);
      return;
    }

    try {
      const res = await getBlogDetail(blogId);
      if (res.code === 0) {
        const blog = res.data;
        if (!(currentUser && (currentUser.role === 1 || currentUser.id === blog.user_id))) {
          toast({ title: '无权限编辑该帖子', status: 'error', duration: 2500, isClosable: true });
          router.push(`/discuss/${blogId}`);
          return;
        }

        setTitle(blog.title || '');
        setContent(blog.content || '');
        setTagsText((blog.tags || []).filter((t) => t !== '题解').join(','));
        setIsSolution((blog.tags || []).includes('题解'));
        setLinkProblem(Number(blog.problem_id || 0) > 0);
        setProblemId(blog.problem_id ? String(blog.problem_id) : '');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '加载帖子失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [currentUser, id, router, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const blogId = Number(id);
    if (!Number.isFinite(blogId) || blogId <= 0) {
      return;
    }

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

    if (!t || !c) {
      toast({ title: '标题和内容不能为空', status: 'warning', duration: 2000, isClosable: true });
      return;
    }

    setSaving(true);
    try {
      const res = await updateBlog(blogId, {
        title: t,
        content: c,
        tags,
        problem_id: linkedProblemId > 0 ? linkedProblemId : 0,
      });
      if (res.code === 0) {
        toast({ title: '修改成功', status: 'success', duration: 2000, isClosable: true });
        router.push(`/discuss/${blogId}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '修改失败';
      toast({ title: '修改帖子失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Text color="gray.500">加载中...</Text>;
  }

  return (
    <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Heading size="lg" mb={2}>编辑帖子</Heading>
      <Text color="gray.500" mb={6}>支持管理标签与题解关联题目。</Text>

      <VStack as="form" onSubmit={handleSubmit} spacing={5} align="stretch">
        <FormControl isRequired>
          <FormLabel>标题</FormLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>内容</FormLabel>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} maxLength={20000} />
        </FormControl>

        <FormControl>
          <FormLabel>标签管理</FormLabel>
          <Input
            placeholder="多个标签请用英文逗号分隔"
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

        <Button type="submit" colorScheme="blue" alignSelf="flex-end" isLoading={saving} loadingText="保存中">
          保存修改
        </Button>
      </VStack>
    </Box>
  );
}
