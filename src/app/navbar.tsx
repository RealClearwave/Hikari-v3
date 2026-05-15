"use client";

import { useEffect, useState } from "react";
import { Avatar, Box, Button, Container, Flex, HStack, IconButton, Link, Menu, MenuButton, MenuDivider, MenuItem, MenuList, Text, useColorMode } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiMoon, FiSun } from "react-icons/fi";
import { useAuthStore } from "@/store/auth";
import UserName from "@/components/UserName";

const NAV_ITEMS = [
  { label: "首页", href: "/" },
  { label: "题库", href: "/problem" },
  { label: "竞赛", href: "/contest" },
  { label: "记录", href: "/record" },
  { label: "讨论", href: "/discuss" },
  { label: "排行", href: "/leaderboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const { colorMode, toggleColorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const currentUser = mounted && isAuthenticated ? user : null;

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={1000}
      bg="blackAlpha.50"
      backdropFilter="saturate(180%) blur(10px)"
      borderBottom="1px solid"
      borderColor="blackAlpha.200"
      _dark={{
        bg: "whiteAlpha.50",
        borderColor: "whiteAlpha.100",
      }}
    >
      <Container maxW="1200px" py={3}>
        <Flex align="center" justify="space-between" gap={4}>
          <Link as={NextLink} href="/" _hover={{ textDecoration: "none" }}>
            <Text fontWeight="800" fontSize="lg" letterSpacing="tight">
              Hikari OJ
            </Text>
          </Link>

          <HStack spacing={1} display={{ base: "none", md: "flex" }}>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Button
                  key={item.href}
                  as={NextLink}
                  href={item.href}
                  size="sm"
                  variant={active ? "solid" : "ghost"}
                  colorScheme={active ? "blue" : undefined}
                  fontWeight={active ? "700" : "600"}
                >
                  {item.label}
                </Button>
              );
            })}
          </HStack>

          <HStack spacing={2}>
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === "light" ? <FiMoon /> : <FiSun />}
              size="sm"
              variant="ghost"
              onClick={toggleColorMode}
            />
            {currentUser ? (
              <Menu placement="bottom-end">
                <MenuButton
                  as={Button}
                  variant="ghost"
                  size="sm"
                  px={2}
                  py={1}
                  _hover={{ bg: 'blackAlpha.50' }}
                >
                  <HStack spacing={2}>
                    <Avatar size="sm" name={currentUser.username} src={currentUser.avatar || undefined} />
                    <Box maxW="160px" overflow="hidden">
                      <UserName
                        username={currentUser.username}
                        role={currentUser.role}
                        badge={currentUser.badge}
                        withLink={false}
                        fontSize="sm"
                      />
                    </Box>
                  </HStack>
                </MenuButton>
                <MenuList borderColor="blackAlpha.100" boxShadow="lg">
                  <Box px={3} py={2}>
                    <Box maxW="220px" overflow="hidden">
                      <UserName
                        username={currentUser.username}
                        role={currentUser.role}
                        badge={currentUser.badge}
                        withLink={false}
                        fontSize="sm"
                      />
                    </Box>
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {currentUser.email}
                    </Text>
                  </Box>
                  <MenuDivider />
                  <MenuItem as={NextLink} href="/user/edit">
                    修改信息
                  </MenuItem>
                  {currentUser.role === 1 && (
                    <>
                      <MenuDivider />
                      <MenuItem as={NextLink} href="/admin/problem/new">
                        创建题目
                      </MenuItem>
                      <MenuItem as={NextLink} href="/admin/contest/new">
                        创建比赛
                      </MenuItem>
                      <MenuItem as={NextLink} href="/admin/ai-config">
                        AI 功能配置
                      </MenuItem>
                    </>
                  )}
                  <MenuItem onClick={handleLogout}>
                    登出
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <>
                <Button as={NextLink} href="/user/login" size="sm" variant="ghost">
                  登录
                </Button>
                <Button as={NextLink} href="/user/register" size="sm" colorScheme="blue">
                  注册
                </Button>
              </>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
