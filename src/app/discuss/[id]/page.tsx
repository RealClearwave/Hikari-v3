"use client";

import React from 'react';
import { Box, Heading, Text, Avatar, Flex, VStack, HStack, Divider, Badge, Button, Textarea } from '@chakra-ui/react';
import { useParams } from 'next/navigation';

const DiscussDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box>
      {/* 帖子主内容 */}
      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <HStack mb={4}>
          <Badge colorScheme="red">公告</Badge>
          <Badge colorScheme="blue">建议</Badge>
        </HStack>
        <Heading size="xl" mb={6} color="gray.800">
          Hikari V3 前端重构建议与反馈 (Topic: {id})
        </Heading>
        
        <Flex align="center" mb={6} justify="space-between">
          <HStack spacing={4}>
            <Avatar size="md" name="Clearwave" />
            <Box>
              <Text fontWeight="bold" color="purple.600">Clearwave</Text>
              <Text fontSize="sm" color="gray.500">发表于 2023-11-01 10:00:00</Text>
            </Box>
          </HStack>
          <Text fontSize="sm" color="gray.500">浏览量: 340</Text>
        </Flex>

        <Divider mb={6} />

        <Box color="gray.700" fontSize="lg" lineHeight="tall" minH="200px">
          <p>各位同学大家好，目前 Hikari V3 的前端正在用 React 和 Chakra UI 重新构建中。</p>
          <p>如果在新的页面体验中遇到任何排版问题或样式 Bug，请在本贴下方回复！</p>
          <br/>
          <p>感谢大家的支持~</p>
        </Box>
      </Box>

      {/* 回复区 */}
      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm" mb={6}>
        <Heading size="md" mb={6}>全部回复 (2)</Heading>
        <VStack spacing={6} align="stretch" divider={<Divider />}>
          
          <Box>
            <Flex justify="space-between" mb={3}>
              <HStack spacing={3}>
                <Avatar size="sm" name="Undefined_Argon" />
                <Text fontWeight="bold" color="purple.500" fontSize="sm">Undefined_Argon</Text>
              </HStack>
              <Text fontSize="xs" color="gray.500">#1 回复于 10分钟前</Text>
            </Flex>
            <Text color="gray.700" pl={11}>
              我觉得题库列表页很好看，希望比赛页也能加入更多组件。
            </Text>
          </Box>

          <Box>
            <Flex justify="space-between" mb={3}>
              <HStack spacing={3}>
                <Avatar size="sm" name="baoxuanming" />
                <Text fontWeight="bold" color="purple.400" fontSize="sm">baoxuanming</Text>
              </HStack>
              <Text fontSize="xs" color="gray.500">#2 回复于 5分钟前</Text>
            </Flex>
            <Text color="gray.700" pl={11}>
              新版 UI 的夜间模式有发版计划吗？
            </Text>
          </Box>
          
        </VStack>
      </Box>

      {/* 发表回复区 */}
      <Box bg="white" p={8} borderWidth={1} borderColor="gray.200" borderRadius="md" boxShadow="sm">
        <Heading size="sm" mb={4}>发表回复</Heading>
        <Textarea placeholder="写下你的想法......" rows={5} mb={4} />
        <Flex justify="flex-end">
          <Button colorScheme="blue">发布</Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default DiscussDetail;