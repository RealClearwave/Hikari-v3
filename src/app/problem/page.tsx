"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Badge, Wrap, WrapItem,
  Heading, Flex, Input, Button, HStack, IconButton, Link, Spinner, useToast
} from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';
import NextLink from 'next/link';
import { getProblemList, Problem } from '@/api/problem';
import { getTags, Tag } from '@/api/tags';

const ProblemList: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [tagId, setTagId] = useState<number>(0);
  const [tags, setTags] = useState<Tag[]>([]);
  const size = 20;

  const toast = useToast();

  useEffect(() => {
    getTags()
      .then((res) => { if (res.code === 0) setTags(res.data.list); })
      .catch(() => { /* tags are optional */ });
  }, []);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProblemList(page, size, keyword, tagId);
      if (res.code === 0) {
        setProblems(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      toast({
        title: '获取题目列表失败',
        description: message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, size, keyword, tagId, toast]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(searchInput.trim());
  };

  const handleTagClick = (id: number) => {
    setPage(1);
    setTagId(tagId === id ? 0 : id);
  };

  const maxPage = Math.ceil(total / size) || 1;

  return (
    <Box bg={{ base: "white", _dark: "gray.800" }} p={6} borderWidth={1} borderColor="blackAlpha.200" borderRadius="md" boxShadow="sm">
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">题库 (Problem Set)</Heading>

        <Flex>
          <Input
            placeholder="搜索题目..."
            borderRightRadius="none"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <IconButton
            aria-label="Search problem"
            icon={<FaSearch />}
            colorScheme="blue"
            borderLeftRadius="none"
            onClick={handleSearch}
          />
        </Flex>
      </Flex>

      {tags.length > 0 && (
        <Wrap mb={4} spacing={2}>
          <WrapItem>
            <Badge
              as="button"
              onClick={() => { setPage(1); setTagId(0); }}
              colorScheme={tagId === 0 ? "blue" : "gray"}
              variant={tagId === 0 ? "solid" : "subtle"}
              px={3} py={1} borderRadius="full" cursor="pointer" fontSize="sm"
            >
              全部
            </Badge>
          </WrapItem>
          {tags.map((tag) => (
            <WrapItem key={tag.id}>
              <Badge
                as="button"
                onClick={() => handleTagClick(tag.id)}
                colorScheme={tagId === tag.id ? tag.color : "gray"}
                variant={tagId === tag.id ? "solid" : "subtle"}
                px={3} py={1} borderRadius="full" cursor="pointer" fontSize="sm"
              >
                {tag.name}{tag.problem_count ? ` (${tag.problem_count})` : ""}
              </Badge>
            </WrapItem>
          ))}
        </Wrap>
      )}

      {loading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" />
        </Flex>
      ) : (
        <>
          <Table variant="simple">
            <Thead bg="blackAlpha.50">
              <Tr>
                <Th w="10%">编号</Th>
                <Th>标题</Th>
                <Th w="20%">标签</Th>
                <Th w="10%">难度</Th>
                <Th w="15%">时间/内存</Th>
              </Tr>
            </Thead>
            <Tbody>
              {problems.map((p) => (
                <Tr key={p.id} _hover={{ bg: "blackAlpha.50" }}>
                  <Td>
                    <Link as={NextLink} href={`/problem/${p.id}`} fontWeight="bold" color="gray.500" _hover={{ textDecoration: 'underline' }}>
                      {p.id}
                    </Link>
                  </Td>
                  <Td>
                    <Link as={NextLink} href={`/problem/${p.id}`} color="blue.500" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>
                      {p.title}
                    </Link>
                  </Td>
                  <Td>
                    <Wrap spacing={1}>
                      {p.tags?.map((t) => (
                        <WrapItem key={t.id}>
                          <Badge colorScheme={t.color} variant="subtle" fontSize="xs" borderRadius="full" px={2}>
                            {t.name}
                          </Badge>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Td>
                  <Td>
                    {p.difficulty === 1 && <Badge colorScheme="green" variant="subtle">简单</Badge>}
                    {p.difficulty === 2 && <Badge colorScheme="orange" variant="subtle">中等</Badge>}
                    {p.difficulty === 3 && <Badge colorScheme="red" variant="subtle">困难</Badge>}
                  </Td>
                  <Td fontSize="sm" color="gray.500">{p.time_limit}ms / {Math.round(p.memory_limit / 1024)}MB</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex justify="center" mt={6}>
            <HStack>
              <Button
                size="sm"
                isDisabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button size="sm" colorScheme="blue" variant="solid">{page}</Button>
              <Button
                size="sm"
                isDisabled={page >= maxPage}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
};

export default ProblemList;