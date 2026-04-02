"use client";

import React from 'react';
import { Box, Heading, Text, Flex, Badge, Button, Tabs, TabList, TabPanels, Tab, TabPanel, HStack, Divider, Table, Tbody, Tr, Td } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box>
      <Heading size="xl" mb={2} color="gray.800">{id}: A+B Problem</Heading>
      <HStack spacing={4} mb={6} fontSize="sm" color="gray.600">
        <Text>时间限制: <Badge colorScheme="blue">1000 ms</Badge></Text>
        <Text>内存限制: <Badge colorScheme="blue">256 MB</Badge></Text>
        <Text>提供者: <Text as="span" fontWeight="bold">Admin</Text></Text>
      </HStack>

      <Flex gap={6} flexDir={{ base: "column", lg: "row" }}>
        {/* Left: Problem Description */}
        <Box flex="3" bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
          <Tabs colorScheme="blue">
            <TabList>
              <Tab fontWeight="bold">题目描述</Tab>
              <Tab fontWeight="bold">提交记录</Tab>
              <Tab fontWeight="bold">统计</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} py={6}>
                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>题目描述</Heading>
                  <Text color="gray.700">计算两个整数 a 和 b 的和。</Text>
                </Box>
                
                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>输入格式</Heading>
                  <Text color="gray.700">两个整数 a 和 b，以空格分隔。</Text>
                </Box>
                
                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>输出格式</Heading>
                  <Text color="gray.700">输出 a + b 的结果。</Text>
                </Box>
                
                <Box mb={6}>
                  <Heading size="md" mb={3} borderLeft="4px solid" borderColor="blue.500" pl={3}>样例</Heading>
                  <Flex gap={4}>
                    <Box flex={1}>
                      <Badge colorScheme="gray" mb={2}>样例输入 1</Badge>
                      <Box bg="gray.50" p={3} borderRadius="md" fontFamily="monospace">
                        1 2
                      </Box>
                    </Box>
                    <Box flex={1}>
                      <Badge colorScheme="gray" mb={2}>样例输出 1</Badge>
                      <Box bg="gray.50" p={3} borderRadius="md" fontFamily="monospace">
                        3
                      </Box>
                    </Box>
                  </Flex>
                </Box>
              </TabPanel>
              
              <TabPanel>
                <Text color="gray.500">该题目的提交记录将在这里显示。</Text>
              </TabPanel>
              <TabPanel>
                <Text color="gray.500">分析数据将在这里显示。</Text>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

         {/* Right: Submit Area & Info */}
        <Box flex="1">
          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
            <Heading size="sm" mb={4}>提交代码</Heading>
            <Divider mb={4} />
            <Button as={NextLink} href={`/problem/${id}/submit`} colorScheme="blue" w="full" size="lg" mb={2}>前往提交</Button>
          </Box>
          
          <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
            <Heading size="sm" mb={4}>题目信息</Heading>
            <Divider mb={4} />
            <Table size="sm" variant="unstyled">
              <Tbody>
                <Tr>
                  <Td px={0} py={2} color="gray.500">通过数</Td>
                  <Td px={0} py={2} isNumeric fontWeight="bold">500</Td>
                </Tr>
                <Tr>
                  <Td px={0} py={2} color="gray.500">提交数</Td>
                  <Td px={0} py={2} isNumeric fontWeight="bold">1000</Td>
                </Tr>
                <Tr>
                  <Td px={0} py={2} color="gray.500">通过率</Td>
                  <Td px={0} py={2} isNumeric fontWeight="bold">50.0%</Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
};

export default ProblemDetail;