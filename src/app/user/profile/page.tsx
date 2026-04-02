"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Heading, Text, Avatar, Flex, VStack, Divider, Grid, GridItem, Badge, Link, Spinner, useToast, FormControl, FormLabel, Input, Select, Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import { getRecordList, RecordItem } from '@/api/record';
import { adminDeleteUser, adminUpdateUser, getUserDetail, UserDetail } from '@/api/user';
import { useAuthStore } from '@/store/auth';
import UserName from '@/components/UserName';

export default function UserProfilePage() {
  const [uid, setUid] = useState(0);
  const validUid = Number.isFinite(uid) && uid > 0 ? uid : 0;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminAvatar, setAdminAvatar] = useState('');
  const [adminRole, setAdminRole] = useState<'0' | '1'>('0');
  const [adminBadge, setAdminBadge] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((state) => state.user);
  const toast = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const nextUid = Number(params.get('uid') || 0);
    setUid(Number.isFinite(nextUid) ? nextUid : 0);
  }, []);

  const loadData = useCallback(async () => {
    if (validUid <= 0) {
      setLoading(false);
      setUser(null);
      setRecords([]);
      return;
    }

    setLoading(true);
    try {
      const [userRes, recordRes] = await Promise.all([
        getUserDetail(validUid),
        getRecordList(1, 500, undefined, validUid),
      ]);

      if (userRes.code === 0) {
        setUser(userRes.data);
        setAdminUsername(userRes.data.username || '');
        setAdminEmail(userRes.data.email || '');
        setAdminAvatar(userRes.data.avatar || '');
        setAdminRole(String(userRes.data.role === 1 ? 1 : 0) as '0' | '1');
        setAdminBadge(userRes.data.badge || '');
      }
      if (recordRes.code === 0) {
        setRecords(recordRes.data.list);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '加载失败';
      toast({ title: '获取用户数据失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [toast, validUid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const accepted = records.filter((r) => r.status === 2).length;
    const solvedSet = new Set(records.filter((r) => r.status === 2).map((r) => r.problem_id));
    return {
      accepted,
      submissions: records.length,
      solvedProblems: Array.from(solvedSet).sort((a, b) => a - b),
    };
  }, [records]);

  const canManageThisUser = currentUser?.role === 1 && !!user && currentUser.id !== user.id;

  const handleAdminSave = async () => {
    if (!user) return;

    const username = adminUsername.trim();
    const email = adminEmail.trim();
    const avatar = adminAvatar.trim();
    const role = Number(adminRole) as 0 | 1;
    const badge = adminBadge.trim();

    if (!username || !email) {
      toast({ title: '用户名和邮箱不能为空', status: 'warning', duration: 2000, isClosable: true });
      return;
    }

    setAdminSaving(true);
    try {
      const res = await adminUpdateUser(user.id, {
        username,
        email,
        avatar,
        role,
        badge,
      });
      if (res.code === 0) {
        setUser(res.data);
        setAdminUsername(res.data.username || '');
        setAdminEmail(res.data.email || '');
        setAdminAvatar(res.data.avatar || '');
        setAdminRole(String(res.data.role === 1 ? 1 : 0) as '0' | '1');
        setAdminBadge(res.data.badge || '');
        toast({ title: '用户信息已更新', status: 'success', duration: 2200, isClosable: true });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '更新失败';
      toast({ title: '管理员更新失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!user) return;

    const ok = window.confirm(`确认删除用户 ${user.username} (ID ${user.id}) 吗？此操作不可恢复。`);
    if (!ok) return;

    setAdminDeleting(true);
    try {
      const res = await adminDeleteUser(user.id);
      if (res.code === 0) {
        toast({ title: '用户已删除', status: 'success', duration: 2200, isClosable: true });
        if (typeof window !== 'undefined') {
          window.location.href = '/user';
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '删除失败';
      toast({ title: '删除用户失败', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setAdminDeleting(false);
    }
  };

  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 3fr' }} gap={6}>
      <GridItem>
        <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" textAlign="center">
          {loading ? (
            <Flex justify="center" py={6}><Spinner size="lg" /></Flex>
          ) : (
            <>
              <Avatar size="2xl" name={user?.username || `User ${validUid || 0}`} src={user?.avatar || undefined} mb={4} />
              <Flex justify="center" mb={2}>
                <UserName
                  username={user?.username || `User #${validUid || 0}`}
                  role={user?.role}
                  badge={user?.badge}
                  acceptedCount={stats.accepted}
                  withLink={false}
                  fontSize="xl"
                />
              </Flex>
              <Text color="gray.600" fontSize="sm" mb={6}>{user?.email || 'No email'}</Text>

              <Divider mb={4} />

              <VStack align="stretch" spacing={3} textAlign="left">
                <Flex justify="space-between">
                  <Text color="gray.500">积分 (Rating)</Text>
                  <Text fontWeight="bold" color="purple.600">{user?.rating ?? 0}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color="gray.500">解决题数</Text>
                  <Text fontWeight="bold">{stats.solvedProblems.length}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color="gray.500">通过数</Text>
                  <Text fontWeight="bold">{stats.accepted}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color="gray.500">提交总数</Text>
                  <Text fontWeight="bold">{stats.submissions}</Text>
                </Flex>
              </VStack>
            </>
          )}
        </Box>
      </GridItem>

      <GridItem>
        <VStack spacing={6} align="stretch">
          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
            <Heading size="md" mb={4} borderLeft="4px solid" borderColor="blue.500" pl={3}>解决的题目</Heading>
            {loading ? (
              <Flex justify="center" py={4}><Spinner /></Flex>
            ) : (
              <Flex flexWrap="wrap" gap={2}>
                {stats.solvedProblems.length === 0 ? (
                  <Text color="gray.500">暂无通过题目</Text>
                ) : stats.solvedProblems.map((pid) => (
                  <Link as={NextLink} key={pid} href={`/problem/${pid}`}>
                    <Badge colorScheme="green" variant="subtle" px={2} py={1} cursor="pointer" _hover={{ bg: 'green.200' }}>
                      {pid}
                    </Badge>
                  </Link>
                ))}
              </Flex>
            )}
          </Box>

          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
            <Heading size="md" mb={4} borderLeft="4px solid" borderColor="blue.500" pl={3}>最近提交的记录</Heading>
            {loading ? (
              <Flex justify="center" py={4}><Spinner /></Flex>
            ) : (
              <VStack align="stretch" spacing={2}>
                {records.length === 0 ? (
                  <Text color="gray.500">暂无提交记录</Text>
                ) : records.slice(0, 8).map((r) => (
                  <Link key={r.id} as={NextLink} href={`/record/${r.id}`} color="blue.500" _hover={{ textDecoration: 'underline' }}>
                    #{r.id} - Problem {r.problem_id} - {new Date(r.created_at).toLocaleString()}
                  </Link>
                ))}
              </VStack>
            )}
          </Box>

          {canManageThisUser && (
            <Box bg="white" p={6} borderWidth={1} borderColor="orange.200" borderRadius="md" boxShadow="sm">
              <Heading size="md" mb={4} borderLeft="4px solid" borderColor="orange.500" pl={3}>管理员操作：修改用户与权限</Heading>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>用户名</FormLabel>
                  <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} maxLength={32} />
                </FormControl>

                <FormControl>
                  <FormLabel>邮箱</FormLabel>
                  <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} type="email" />
                </FormControl>

                <FormControl>
                  <FormLabel>头像 URL</FormLabel>
                  <Input value={adminAvatar} onChange={(e) => setAdminAvatar(e.target.value)} />
                </FormControl>

                <FormControl>
                  <FormLabel>管理员权限</FormLabel>
                  <Select value={adminRole} onChange={(e) => setAdminRole((e.target.value === '1' ? '1' : '0'))}>
                    <option value="0">普通用户（解除管理员）</option>
                    <option value="1">管理员（授予管理员）</option>
                  </Select>
                </FormControl>

                <FormControl isDisabled={adminRole !== '1'}>
                  <FormLabel>管理员 Badge</FormLabel>
                  <Input
                    value={adminBadge}
                    onChange={(e) => setAdminBadge(e.target.value)}
                    maxLength={64}
                    placeholder="例如：官方认证"
                  />
                </FormControl>

                <Flex justify="space-between" gap={3}>
                  <Button colorScheme="red" variant="outline" onClick={handleAdminDelete} isLoading={adminDeleting}>
                    删除用户
                  </Button>
                  <Button colorScheme="orange" onClick={handleAdminSave} isLoading={adminSaving}>
                    保存修改
                  </Button>
                </Flex>
              </VStack>
            </Box>
          )}
        </VStack>
      </GridItem>
    </Grid>
  );
}
