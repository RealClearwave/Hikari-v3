"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Box, Table, Thead, Tbody, Tr, Th, Td, Badge, 
  Heading, Flex, Input, Select, Button, HStack, IconButton, Link, Spinner, useToast
} from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';
import NextLink from 'next/link';
import { getProblemList, Problem } from '@/api/problem';

const ProblemList: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const size = 20;
  
  const toast = useToast();

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProblemList(page, size);
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
  }, [page, size, toast]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const maxPage = Math.ceil(total / size) || 1;

  return (
    <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.800">题库 (Problem Set)</Heading>
        
        <HStack spacing={4}>
          <Select placeholder="所有分类" w="150px">
            <option value="basic">基础题</option>
            <option value="graph">图论</option>
            <option value="dp">动态规划</option>
          </Select>
          <Flex>
            <Input placeholder="搜索题目..." borderRightRadius="none" />
            <IconButton 
              aria-label="Search problem" 
              icon={<FaSearch />} 
              colorScheme="blue" 
              borderLeftRadius="none" 
            />
          </Flex>
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" />
        </Flex>
      ) : (
        <>
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th w="10%">状态</Th>
                <Th w="10%">编号</Th>
                <Th>标题</Th>
                <Th w="15%">时间限制</Th>
                <Th w="15%">内存限制</Th>
              </Tr>
            </Thead>
            <Tbody>
              {problems.map((p) => (
                <Tr key={p.id} _hover={{ bg: "gray.50" }}>
                  <Td />
                  <Td>
                    <Link as={NextLink} href={`/problem/${p.id}`} fontWeight="bold" color="gray.600" _hover={{ textDecoration: 'underline' }}>
                      {p.id}
                    </Link>
                  </Td>
                  <Td>
                    <Link as={NextLink} href={`/problem/${p.id}`} color="blue.500" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>
                      {p.title}
                    </Link>
                    {p.difficulty === 1 && <Badge ml={2} colorScheme="green">简单</Badge>}
                    {p.difficulty === 2 && <Badge ml={2} colorScheme="orange">中等</Badge>}
                    {p.difficulty === 3 && <Badge ml={2} colorScheme="red">困难</Badge>}
                  </Td>
                  <Td fontSize="sm" color="gray.500">{p.time_limit} ms</Td>
                  <Td fontSize="sm" color="gray.500">{p.memory_limit} KB</Td>
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
              <Button size="sm" colorScheme="blue">{page}</Button>
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