import { Badge, HStack, Link, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { getUsernameColor } from '@/utils/userDecorations';

interface UserNameProps {
  username: string;
  userId?: number;
  role?: number;
  badge?: string;
  acceptedCount?: number;
  withLink?: boolean;
  fontSize?: string;
}

export default function UserName({
  username,
  userId,
  role,
  badge,
  acceptedCount,
  withLink = true,
  fontSize = 'md',
}: UserNameProps) {
  const textColor = getUsernameColor(role, acceptedCount);
  const isAdmin = Number(role) === 1;
  const badgeText = isAdmin ? (badge || '管理员') : '';

  const nameNode = (
    <Text fontWeight="bold" color={textColor} fontSize={fontSize}>
      {username}
    </Text>
  );

  return (
    <HStack spacing={2}>
      {withLink && userId ? (
        <Link as={NextLink} href={`/user/profile?uid=${userId}`} _hover={{ textDecoration: 'underline' }}>
          {nameNode}
        </Link>
      ) : nameNode}
      {badgeText ? (
        <Badge
          bgGradient="linear(to-r, purple.500, pink.500)"
          color="white"
          borderRadius="sm"
          px={2}
          py={0.5}
          fontSize="10px"
        >
          {badgeText}
        </Badge>
      ) : null}
    </HStack>
  );
}
