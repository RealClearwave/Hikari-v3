"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { getMyProfile, updateMyProfile } from '@/api/user';
import { useAuthStore } from '@/store/auth';

export default function UserEditPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState(0);
  const [badge, setBadge] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateUser = useAuthStore((state) => state.updateUser);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) {
      toast({ title: '请先登录', status: 'warning', duration: 2000, isClosable: true });
      router.push('/user/login');
      return;
    }

    setLoading(true);
    try {
      const res = await getMyProfile();
      if (res.code === 0) {
        setUsername(res.data.username || '');
        setEmail(res.data.email || '');
        setAvatar(res.data.avatar || '');
        setRole(Number(res.data.role || 0));
        setBadge(res.data.badge || '');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '加载失败';
      toast({ title: '获取用户信息失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, router, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const name = username.trim();
    const mail = email.trim();
    const avatarUrl = avatar.trim();
    const badgeText = badge.trim();

    if (!name || !mail) {
      toast({ title: '用户名和邮箱不能为空', status: 'warning', duration: 2000, isClosable: true });
      return;
    }

    setSaving(true);
    try {
      const payload = role === 1
        ? { username: name, email: mail, avatar: avatarUrl, badge: badgeText }
        : { username: name, email: mail, avatar: avatarUrl };
      const res = await updateMyProfile(payload);
      if (res.code === 0) {
        updateUser(res.data);
        toast({ title: '信息修改成功', status: 'success', duration: 2000, isClosable: true });
        router.push(`/user/profile?uid=${res.data.id}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '修改失败';
      toast({ title: '修改用户信息失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Heading size="lg" mb={2}>修改信息</Heading>
      <Text color="gray.500" mb={6}>修改当前登录账号的基础资料。</Text>

      {loading ? (
        <Text color="gray.500">加载中...</Text>
      ) : (
        <VStack as="form" onSubmit={handleSubmit} spacing={5} align="stretch">
          <FormControl isRequired>
            <FormLabel>用户名</FormLabel>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={64} />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>邮箱</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={128} />
          </FormControl>

          <FormControl>
            <FormLabel>头像 URL</FormLabel>
            <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} maxLength={255} />
          </FormControl>

          {role === 1 && (
            <FormControl>
              <FormLabel>Badge（管理员）</FormLabel>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                maxLength={64}
                placeholder="例如：官方认证"
              />
            </FormControl>
          )}

          <Button type="submit" colorScheme="blue" alignSelf="flex-end" isLoading={saving} loadingText="保存中">
            保存修改
          </Button>
        </VStack>
      )}
    </Box>
  );
}
