"use client";

import { useCallback, useEffect, useState } from 'react';
import { Box, Heading, Text, Avatar, Flex, VStack, HStack, Divider, Badge, Button, Textarea, Spinner, useToast } from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { BlogDetail, BlogReplyItem, createBlogReply, deleteBlog, deleteBlogReply, getBlogDetail, getBlogReplyList } from '@/api/blog';
import { useAuthStore } from '@/store/auth';
import { getCaptcha } from '@/api/captcha';
import UserName from '@/components/UserName';

export default function DiscussDetail() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [replies, setReplies] = useState<BlogReplyItem[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);

  const refreshCaptcha = useCallback(async () => {
    try {
      const res = await getCaptcha();
      if (res.code === 0) {
        setCaptchaId(res.data.captcha_id);
        setCaptchaChallenge(res.data.challenge);
        setCaptchaAnswer('');
      }
    } catch {
      // ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    const blogId = Number(id);
    if (!Number.isFinite(blogId) || blogId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [detailRes, replyRes] = await Promise.all([
        getBlogDetail(blogId),
        getBlogReplyList(blogId),
      ]);
      if (detailRes.code === 0) {
        setBlog(detailRes.data);
      }
      if (replyRes.code === 0) {
        setReplies(replyRes.data.list);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取讨论详情失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  const handleSubmitReply = useCallback(async () => {
    const blogId = Number(id);
    if (!Number.isFinite(blogId) || blogId <= 0) {
      return;
    }

    const content = replyContent.trim();
    if (!content || !captchaAnswer) {
      toast({ title: '回复内容不能为空', status: 'warning', duration: 2000, isClosable: true });
      return;
    }
    if (!isAuthenticated) {
      toast({ title: '请先登录后再回复', status: 'warning', duration: 2500, isClosable: true });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createBlogReply(blogId, {
        content,
        captcha_id: captchaId,
        captcha_answer: captchaAnswer,
      });
      if (res.code === 0) {
        setReplyContent('');
        setCaptchaAnswer('');
        const replyRes = await getBlogReplyList(blogId);
        if (replyRes.code === 0) {
          setReplies(replyRes.data.list);
        }
        toast({ title: '回复发布成功', status: 'success', duration: 2000, isClosable: true });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '发布失败';
      refreshCaptcha();
      toast({ title: '发布回复失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  }, [id, isAuthenticated, replyContent, toast]);

  const handleDeletePost = useCallback(async () => {
    const blogId = Number(id);
    if (!Number.isFinite(blogId) || blogId <= 0) {
      return;
    }
    if (!isAuthenticated) {
      toast({ title: '请先登录', status: 'warning', duration: 2000, isClosable: true });
      return;
    }

    const ok = window.confirm('确认删除该帖子吗？删除后不可恢复。');
    if (!ok) return;

    setDeletingPost(true);
    try {
      const res = await deleteBlog(blogId);
      if (res.code === 0) {
        toast({ title: '帖子已删除', status: 'success', duration: 2000, isClosable: true });
        router.push('/discuss');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '删除失败';
      toast({ title: '删除帖子失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setDeletingPost(false);
    }
  }, [id, isAuthenticated, router, toast]);

  const handleDeleteReply = useCallback(async (replyId: number) => {
    const blogId = Number(id);
    if (!Number.isFinite(blogId) || blogId <= 0) {
      return;
    }

    const ok = window.confirm('确认删除该回复吗？');
    if (!ok) return;

    try {
      const res = await deleteBlogReply(blogId, replyId);
      if (res.code === 0) {
        setReplies((prev) => prev.filter((r) => r.id !== replyId));
        toast({ title: '回复已删除', status: 'success', duration: 2000, isClosable: true });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '删除失败';
      toast({ title: '删除回复失败', description: message, status: 'error', duration: 3000, isClosable: true });
    }
  }, [id, toast]);

  return (
    <Box>
      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
      ) : !blog ? (
        <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
          <Heading size="md" color="gray.700" mb={2}>讨论不存在或已删除</Heading>
          <Text color="gray.500">帖子 ID: {id}</Text>
        </Box>
      ) : (
        <>
      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <HStack mb={4}>
          <Badge colorScheme={blog.type === 1 ? 'green' : 'blue'}>{blog.type === 1 ? '题解' : '博客'}</Badge>
          <Badge colorScheme="purple">ID: {blog.id}</Badge>
          {(blog.tags || []).map((tag) => (
            <Badge key={tag} colorScheme={tag === '题解' ? 'green' : 'gray'}>{tag}</Badge>
          ))}
        </HStack>
        <Heading size="xl" mb={6} color="gray.800">
          {blog.title}
        </Heading>
        
        <Flex align="center" mb={6} justify="space-between">
          <HStack spacing={4}>
            <Avatar size="md" name={blog.username} src={blog.avatar || undefined} />
            <Box>
              <UserName
                username={blog.username}
                userId={blog.user_id}
                role={blog.role}
                badge={blog.badge}
                acceptedCount={blog.accepted_count}
              />
              <Text fontSize="sm" color="gray.500">发表于 {new Date(blog.created_at).toLocaleString()}</Text>
            </Box>
          </HStack>
          <HStack spacing={3}>
            <Text fontSize="sm" color="gray.500">浏览量: {blog.views}</Text>
            {(currentUser?.role === 1 || currentUser?.id === blog.user_id) && (
              <Button size="sm" colorScheme="blue" variant="ghost" onClick={() => router.push(`/discuss/${blog.id}/edit`)}>
                编辑帖子
              </Button>
            )}
            {(currentUser?.role === 1 || currentUser?.id === blog.user_id) && (
              <Button size="sm" colorScheme="red" variant="outline" onClick={handleDeletePost} isLoading={deletingPost}>
                删除帖子
              </Button>
            )}
          </HStack>
        </Flex>

        <Divider mb={6} />

        <Box color="gray.700" fontSize="lg" lineHeight="tall" minH="200px" whiteSpace="pre-wrap">
          {blog.content}
        </Box>

        {blog.type === 1 && blog.problem_id > 0 && (
          <Box mt={4}>
            <Text fontSize="sm" color="gray.500">关联题目：</Text>
            <Button
              as={"a"}
              href={`/problem/${blog.problem_id}`}
              size="sm"
              variant="link"
              colorScheme="green"
            >
              Problem #{blog.problem_id}
            </Button>
          </Box>
        )}
      </Box>

      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Heading size="md" mb={6}>全部回复 ({replies.length})</Heading>
        <VStack spacing={6} align="stretch" divider={<Divider />}>
          {replies.length === 0 ? (
            <Box>
              <Text color="gray.500">当前还没有回复。</Text>
            </Box>
          ) : replies.map((reply, idx) => (
            <Box key={reply.id}>
              <Flex justify="space-between" mb={3}>
                <HStack spacing={3}>
                  <Avatar size="sm" name={reply.username} src={reply.avatar || undefined} />
                  <UserName
                    username={reply.username}
                    userId={reply.user_id}
                    role={reply.role}
                    badge={reply.badge}
                    acceptedCount={reply.accepted_count}
                    fontSize="sm"
                  />
                </HStack>
                <HStack spacing={3}>
                  <Text fontSize="xs" color="gray.500">#{idx + 1} 回复于 {new Date(reply.created_at).toLocaleString()}</Text>
                  {(currentUser?.role === 1 || currentUser?.id === reply.user_id) && (
                    <Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDeleteReply(reply.id)}>
                      删除
                    </Button>
                  )}
                </HStack>
              </Flex>
              <Text color="gray.700" pl={11} whiteSpace="pre-wrap">
                {reply.content}
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>

      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Heading size="sm" mb={4}>发表回复</Heading>
        <Textarea
          placeholder="写下你的想法......"
          rows={5}
          mb={4}
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
        />
        <Button size="sm" variant="outline" mb={2} onClick={refreshCaptcha}>
          {captchaChallenge || '加载验证码中...'}
        </Button>
        <Textarea
          placeholder="请输入验证码计算结果"
          rows={1}
          mb={4}
          value={captchaAnswer}
          onChange={(e) => setCaptchaAnswer(e.target.value)}
        />
        <Flex justify="flex-end">
          <Button colorScheme="blue" onClick={handleSubmitReply} isLoading={submitting} loadingText="发布中">
            发布
          </Button>
        </Flex>
      </Box>
        </>
      )}
    </Box>
  );
}