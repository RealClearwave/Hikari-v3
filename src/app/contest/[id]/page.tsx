"use client";

import React from 'react';
import { Box, Heading, Text, Badge, Flex, Tabs, TabList, TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td, Progress, Grid, GridItem, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';

const ContestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box>
      <Box bg="white" p={6} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Flex justify="space-between" align="start" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl" mb={2} color="gray.800">比赛 {id}: 【光轨-R1】Hikari 十一月官方月赛</Heading>
            <Text color="gray.600" mb={4}>Hosted by: <Badge colorScheme="purple">Hacker_Center</Badge></Text>
          </Box>
          <Box textAlign="right" p={4} bg="gray.50" borderRadius="md" borderWidth={1}>
            <Text fontSize="sm" color="gray.500" mb={1}>Current Status</Text>
            <Badge colorScheme="green" fontSize="md" px={3} py={1} borderRadius="full">Running</Badge>
          </Box>
        </Flex>

        <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
          <GridItem>
            <Text color="gray.500" fontSize="sm">Start Time</Text>
            <Text fontWeight="bold">2023-11-01 14:00:00</Text>
          </GridItem>
          <GridItem>
            <Text color="gray.500" fontSize="sm">End Time</Text>
            <Text fontWeight="bold">2023-11-01 17:00:00</Text>
          </GridItem>
          <GridItem>
            <Text color="gray.500" fontSize="sm">Contest Type</Text>
            <Text fontWeight="bold">ACM / Public</Text>
          </GridItem>
        </Grid>
        
        <Box mt={4}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm" fontWeight="bold" color="blue.600">Progress: 60%</Text>
            <Text fontSize="sm" color="gray.500">01:48:00 Remaining</Text>
          </Flex>
          <Progress value={60} colorScheme="blue" borderRadius="md" size="sm" hasStripe isAnimated />
        </Box>
      </Box>

      <Box bg="white" borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Tabs colorScheme="blue" size="lg">
          <TabList px={4} bg="gray.50">
            <Tab fontWeight="medium" py={4}>Overview</Tab>
            <Tab fontWeight="medium" py={4}>Problems</Tab>
            <Tab fontWeight="medium" py={4}>Submissions</Tab>
            <Tab fontWeight="medium" py={4}>Standings</Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={6}>
              <Heading size="md" mb={4}>比赛介绍</Heading>
              <Text mb={4}>欢迎大家参加 Hikari 十一月首场官方月赛！本次比赛共设 5 道题目，难度由易到难。</Text>
              <Text mb={4}>请注意，本次比赛采用 ACM 赛制，如有错误提交将会有 20 分钟罚时。</Text>
            </TabPanel>

            <TabPanel p={0}>
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th w="10%"></Th>
                    <Th w="15%">#</Th>
                    <Th>Title</Th>
                    <Th w="20%" isNumeric>AC / Total</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr _hover={{ bg: "gray.50" }}>
                    <Td><Badge colorScheme="green" borderRadius="full">AC</Badge></Td>
                    <Td fontWeight="bold">A</Td>
                    <Td><Link as={NextLink} href={`/contest/${id}/problem/A`} color="blue.500" fontWeight="medium">签到题</Link></Td>
                    <Td isNumeric>450 / 920</Td>
                  </Tr>
                  <Tr _hover={{ bg: "gray.50" }}>
                    <Td></Td>
                    <Td fontWeight="bold">B</Td>
                    <Td><Link as={NextLink} href={`/contest/${id}/problem/B`} color="blue.500" fontWeight="medium">数列排序</Link></Td>
                    <Td isNumeric>210 / 600</Td>
                  </Tr>
                  <Tr _hover={{ bg: "gray.50" }}>
                    <Td><Badge colorScheme="red" borderRadius="full">WA</Badge></Td>
                    <Td fontWeight="bold">C</Td>
                    <Td><Link as={NextLink} href={`/contest/${id}/problem/C`} color="blue.500" fontWeight="medium">树上路径</Link></Td>
                    <Td isNumeric>30 / 250</Td>
                  </Tr>
                </Tbody>
              </Table>
            </TabPanel>

            <TabPanel p={6}>
              <Text color="gray.500" textAlign="center">提交记录正在加载...</Text>
            </TabPanel>

            <TabPanel p={6}>
              <Text color="gray.500" textAlign="center">实时排行榜正在计算中...</Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default ContestDetail;