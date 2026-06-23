"use client";

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Text,
  Textarea,
  Tooltip,
  useColorMode,
} from '@chakra-ui/react';
import {
  FiBold,
  FiItalic,
  FiCode,
  FiList,
  FiHash,
  FiLink,
  FiImage,
  FiEye,
  FiEdit3,
} from 'react-icons/fi';

// Inline markdown → HTML renderer (no external deps)
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g,
    '<pre style="background:#1a202c;color:#e2e8f0;padding:12px 16px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;margin:8px 0;"><code>$2</code></pre>');

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g,
    '<code style="background:#edf2f7;color:#c7254e;padding:2px 6px;border-radius:3px;font-size:13px;font-family:monospace;">$1</code>');

  // Bold (**...**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (*...*)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Images (![alt](url))
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:8px 0;">');

  // Links ([text](url))
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" style="color:#3182ce;text-decoration:underline;">$1</a>');

  // Headings (# ..., ## ..., ### ...)
  html = html.replace(/^### (.+)$/gm,
    '<h3 style="font-size:1.1em;font-weight:700;margin:12px 0 6px;color:#2d3748;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm,
    '<h2 style="font-size:1.3em;font-weight:700;margin:14px 0 8px;color:#1a202c;border-bottom:1px solid #cbd5e0;padding-bottom:6px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm,
    '<h1 style="font-size:1.6em;font-weight:800;margin:16px 0 10px;color:#1a202c;border-bottom:2px solid #3182ce;padding-bottom:6px;">$1</h1>');

  // Unordered lists (- ...)
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:20px;">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g,
    '<ul style="margin:8px 0;padding-left:16px;">$1</ul>');

  // Blockquotes (> ...)
  html = html.replace(/^&gt; (.+)$/gm,
    '<blockquote style="border-left:3px solid #3182ce;padding:4px 12px;margin:8px 0;color:#4a5568;background:#f7fafc;border-radius:0 4px 4px 0;">$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p style="margin:8px 0;line-height:1.7;">');
  html = '<p style="margin:8px 0;line-height:1.7;">' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

  return html;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const TOOLBAR_BUTTONS = [
  { label: '标题', icon: FiHash, before: '## ', after: '', placeholder: '标题' },
  { label: '粗体', icon: FiBold, before: '**', after: '**', placeholder: '粗体文本' },
  { label: '斜体', icon: FiItalic, before: '*', after: '*', placeholder: '斜体文本' },
  { label: '代码', icon: FiCode, before: '`', after: '`', placeholder: '代码' },
  { label: '代码块', icon: FiCode, before: '```\n', after: '\n```', placeholder: '// your code' },
  { label: '链接', icon: FiLink, before: '[', after: '](url)', placeholder: '链接文本' },
  { label: '图片', icon: FiImage, before: '![', after: '](url)', placeholder: '图片描述' },
  { label: '列表', icon: FiList, before: '- ', after: '', placeholder: '列表项' },
] as const;

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '开始编写...',
  minHeight = '320px',
}: MarkdownEditorProps) {
  const [previewMode, setPreviewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const editRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { colorMode } = useColorMode();

  const html = useMemo(() => renderMarkdown(value), [value]);

  // Insert text at cursor position
  const insertAtCursor = useCallback(
    (before: string, after: string = '', placeholder: string = '') => {
      const el = editRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.substring(start, end) || placeholder;
      const newText = value.substring(0, start) + before + selected + after + value.substring(end);
      onChange(newText);

      // Restore cursor position
      requestAnimationFrame(() => {
        el.focus();
        const newPos = start + before.length + selected.length + after.length;
        el.setSelectionRange(newPos, newPos);
      });
    },
    [value, onChange],
  );

  // Sync scroll (approximate)
  const handleEditorScroll = useCallback(() => {
    const editEl = editRef.current;
    const previewEl = previewRef.current;
    if (!editEl || !previewEl) return;

    const ratio =
      editEl.scrollTop / (editEl.scrollHeight - editEl.clientHeight || 1);
    previewEl.scrollTop =
      ratio * (previewEl.scrollHeight - previewEl.clientHeight);
  }, []);

  const previewContent = (
    <Box
      ref={previewRef}
      className="markdown-preview"
      p={4}
      minH={minHeight}
      bg={colorMode === 'dark' ? 'gray.700' : 'white'}
      color={colorMode === 'dark' ? 'gray.100' : 'gray.800'}
      borderRadius="md"
      borderWidth={1}
      borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
      overflowY="auto"
      maxH="600px"
      dangerouslySetInnerHTML={{ __html: html }}
      sx={{
        '& a:hover': { textDecoration: 'underline' },
        '& pre': { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
        '& img': { maxWidth: '100%' },
        '& code': {
          bg: colorMode === 'dark' ? 'gray.600' : 'gray.100',
          px: '4px',
          py: '1px',
          borderRadius: '3px',
          fontSize: '13px',
        },
        '& pre code': {
          bg: 'transparent',
          px: 0,
          py: 0,
        },
      }}
    />
  );

  return (
    <Box>
      {/* Toolbar */}
      <Flex
        bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
        borderWidth={1}
        borderBottomWidth={0}
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        borderTopRadius="md"
        p={2}
        gap={1}
        flexWrap="wrap"
        align="center"
        justify="space-between"
      >
        <HStack spacing={0} flexWrap="wrap">
          {TOOLBAR_BUTTONS.map((btn) => (
            <Tooltip key={btn.label} label={btn.label} placement="top">
              <IconButton
                aria-label={btn.label}
                icon={<btn.icon />}
                size="sm"
                variant="ghost"
                onClick={() => insertAtCursor(btn.before, btn.after, btn.placeholder)}
                color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
              />
            </Tooltip>
          ))}
        </HStack>
        <HStack spacing={0}>
          <Tooltip label="仅编辑">
            <IconButton
              aria-label="编辑模式"
              icon={<FiEdit3 />}
              size="sm"
              variant={previewMode === 'edit' ? 'solid' : 'ghost'}
              colorScheme={previewMode === 'edit' ? 'blue' : undefined}
              onClick={() => setPreviewMode('edit')}
            />
          </Tooltip>
          <Tooltip label="双栏">
            <IconButton
              aria-label="分屏模式"
              icon={<FiEye />}
              size="sm"
              variant={previewMode === 'split' ? 'solid' : 'ghost'}
              colorScheme={previewMode === 'split' ? 'blue' : undefined}
              onClick={() => setPreviewMode('split')}
            />
          </Tooltip>
          <Tooltip label="仅预览">
            <IconButton
              aria-label="预览模式"
              icon={<FiEye />}
              size="sm"
              variant={previewMode === 'preview' ? 'solid' : 'ghost'}
              colorScheme={previewMode === 'preview' ? 'blue' : undefined}
              onClick={() => setPreviewMode('preview')}
            />
          </Tooltip>
        </HStack>
      </Flex>

      {/* Editor + Preview */}
      {previewMode === 'split' ? (
        <Flex
          borderWidth={1}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          borderBottomRadius="md"
          overflow="hidden"
          direction={{ base: 'column', md: 'row' }}
        >
          <Box flex={1} borderRightWidth={{ base: 0, md: 1 }} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
            <Text fontSize="xs" color="gray.500" px={3} py={1} bg={colorMode === 'dark' ? 'gray.600' : 'gray.100'}>
              Markdown 编辑
            </Text>
            <Textarea
              ref={editRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleEditorScroll}
              placeholder={placeholder}
              minH={minHeight}
              maxH="600px"
              fontFamily="monospace"
              fontSize="14px"
              border="none"
              borderRadius={0}
              resize="vertical"
              _focus={{ boxShadow: 'none' }}
              bg={colorMode === 'dark' ? 'gray.800' : 'white'}
              color={colorMode === 'dark' ? 'gray.100' : 'gray.800'}
            />
          </Box>
          <Box flex={1}>
            <Text fontSize="xs" color="gray.500" px={3} py={1} bg={colorMode === 'dark' ? 'gray.600' : 'gray.100'}>
              实时预览
            </Text>
            {previewContent}
          </Box>
        </Flex>
      ) : previewMode === 'edit' ? (
        <Box borderWidth={1} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'} borderBottomRadius="md" overflow="hidden">
          <Textarea
            ref={editRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            minH={minHeight}
            maxH="600px"
            fontFamily="monospace"
            fontSize="14px"
            border="none"
            borderRadius={0}
            resize="vertical"
            _focus={{ boxShadow: 'none' }}
            bg={colorMode === 'dark' ? 'gray.800' : 'white'}
            color={colorMode === 'dark' ? 'gray.100' : 'gray.800'}
          />
        </Box>
      ) : (
        <Box borderWidth={1} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'} borderBottomRadius="md" overflow="hidden">
          {previewContent}
        </Box>
      )}

      {/* Word/char count */}
      <Flex justify="flex-end" mt={1}>
        <Text fontSize="xs" color="gray.400">
          {value.length} 字符 · {value.split(/\s+/).filter(Boolean).length} 词
        </Text>
      </Flex>
    </Box>
  );
}
