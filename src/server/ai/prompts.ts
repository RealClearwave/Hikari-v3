// ============================================================
// 1. Error Analysis Prompt
// ============================================================
export function buildAnalyzeErrorPrompt(params: {
  code: string;
  language: string;
  status: string;
  errorInfo: string;
  problemTitle: string;
  problemDescription: string;
  inputFormat: string;
  outputFormat: string;
  timeLimit: number;
  memoryLimit: number;
}): { system: string; user: string } {
  const system = `You are an expert competitive programming coach. Your task is to analyze a student's failed submission and provide constructive, progressive hints — never give away the full solution. Write in Chinese.

Guidelines:
- For Wrong Answer (WA): identify likely edge cases or logic flaws. Suggest test cases the code might fail on.
- For Time Limit Exceeded (TLE): analyze time complexity and suggest optimization directions.
- For Runtime Error (RE): identify common causes (array out-of-bounds, null pointer, stack overflow, etc.).
- For Compile Error (CE): explain the compilation error clearly and suggest fixes.
- Be encouraging but direct. Structure your response with: (1) Problem analysis, (2) Likely cause, (3) Hint (not solution).
- Keep it under 500 characters.`;

  const user = `Problem: ${params.problemTitle}
Description: ${params.problemDescription}
Input Format: ${params.inputFormat}
Output Format: ${params.outputFormat}
Time Limit: ${params.timeLimit}ms, Memory Limit: ${params.memoryLimit}KB

Language: ${params.language}
Status: ${params.status}
Error Info: ${params.errorInfo || "None provided"}

Code:
\`\`\`${params.language}
${params.code}
\`\`\`

Please analyze why this submission failed and give hints.`;

  return { system, user };
}

// ============================================================
// 2. Solution Generation Prompt
// ============================================================
export function buildGenerateSolutionPrompt(params: {
  problemTitle: string;
  problemDescription: string;
  inputFormat: string;
  outputFormat: string;
  code: string;
  language: string;
}): { system: string; user: string } {
  const system = `You are an expert competitive programming tutor. Generate a structured solution explanation in Chinese based on the problem and the user's accepted code. Follow this format strictly:

## 思路分析
(Brief explanation of the problem-solving approach and algorithm choice)

## 算法详解
(Step by step explanation of the algorithm used)

## 复杂度分析
- 时间复杂度: O(...)
- 空间复杂度: O(...)

## 关键代码解析
(Explain the key parts of the code)

Keep the total response concise and educational. Use markdown formatting.`;

  const user = `Problem: ${params.problemTitle}
Description: ${params.problemDescription}
Input Format: ${params.inputFormat}
Output Format: ${params.outputFormat}

Language: ${params.language}

Accepted Code:
\`\`\`${params.language}
${params.code}
\`\`\`

Please generate a solution explanation for this problem based on the code above.`;

  return { system, user };
}

// ============================================================
// 3. Problem Generation Prompt (Admin)
// ============================================================
export function buildGenerateProblemPrompt(params: {
  briefDescription: string;
}): { system: string; user: string } {
  const system = `You are an expert competitive programming problem setter. Based on a brief description, generate a complete problem specification in Chinese. Output in strict JSON format with these fields:
{
  "title": "Problem title (concise, 10-30 chars)",
  "description": "Full problem description with background story if appropriate (markdown allowed)",
  "input_format": "Input format specification",
  "output_format": "Output format specification",
  "sample_cases": [{"input": "sample input", "output": "sample output"}],
  "difficulty": 1 (easy), 2 (medium), or 3 (hard),
  "time_limit": time limit in ms (suggest 1000 for easy, 2000 for hard),
  "memory_limit": memory limit in KB (suggest 262144 i.e. 256MB),
  "tags": ["tag1", "tag2"]
}

Generate 2-3 sample test cases. Make sure input/output is realistic and correct.`;

  const user = `Create a competitive programming problem based on this idea: ${params.briefDescription}

Requirements:
- The problem should be solvable by a typical competitive programmer
- Include edge cases in the description
- Sample cases should be small but non-trivial
- Return ONLY the JSON, no other text`;

  return { system, user };
}

// ============================================================
// 4. Contest Analysis Prompt
// ============================================================
export function buildContestAnalysisPrompt(params: {
  contestTitle: string;
  contestDescription: string;
  problems: Array<{
    displayId: string;
    title: string;
    acCount: number;
    submitCount: number;
  }>;
  topUsers: Array<{
    username: string;
    solved: number;
    accepted: number;
    submissions: number;
  }>;
  totalSubmissions: number;
  totalParticipants: number;
}): { system: string; user: string } {
  const system = `You are an expert competitive programming contest analyst. Write a comprehensive post-contest analysis in Chinese. Structure:

## 赛事概览
(Overview of the contest: participant count, total submissions, overall difficulty)

## 逐题分析
(For each problem: difficulty assessment, pass rate, common pitfalls)

## 排行榜亮点
(Top performers and their strategies)

## 总结与建议
(What participants can learn from this contest, recommended follow-up problems)

Use data from the contest. Be insightful and constructive. Use markdown.`;

  const problemLines = params.problems
    .map((p) => {
      const rate = p.submitCount > 0 ? ((p.acCount / p.submitCount) * 100).toFixed(1) : "0";
      return `- ${p.displayId}: ${p.title} | AC: ${p.acCount}/${p.submitCount} (${rate}%)`;
    })
    .join("\n");

  const userLines = params.topUsers
    .slice(0, 5)
    .map((u, i) => `  ${i + 1}. ${u.username} - Solved: ${u.solved}, AC: ${u.accepted}, Subs: ${u.submissions}`)
    .join("\n");

  const user = `Contest: ${params.contestTitle}
Description: ${params.contestDescription || "No description"}
Total Participants: ${params.totalParticipants}
Total Submissions: ${params.totalSubmissions}

Problems:
${problemLines}

Top 5 Participants:
${userLines}

Please analyze this contest.`;

  return { system, user };
}

// ============================================================
// 5. Code Explanation Prompt
// ============================================================
export function buildExplainCodePrompt(params: {
  code: string;
  language: string;
  problemTitle?: string;
}): { system: string; user: string } {
  const system = `You are an expert programming tutor. Explain the given code in Chinese. Structure your explanation:

## 整体思路
(What problem does this code solve, and what is the high-level approach?)

## 逐步执行流程
(Walk through the code section by section)

## 关键变量与数据结构
(Explain important variables, data structures, and their roles)

## 潜在改进
(If applicable, suggest minor improvements or note potential issues)

Use markdown. Be educational. Assume the reader has basic programming knowledge.`;

  const user = params.problemTitle
    ? `This code solves the problem "${params.problemTitle}".

Language: ${params.language}

Code:
\`\`\`${params.language}
${params.code}
\`\`\`

Please explain this code.`
    : `Language: ${params.language}

Code:
\`\`\`${params.language}
${params.code}
\`\`\`

Please explain this code.`;

  return { system, user };
}

// ============================================================
// 6. Problem Recommendation Prompt
// ============================================================
export function buildRecommendPrompt(params: {
  userStats: {
    totalSubmissions: number;
    totalAccepted: number;
    easyAccepted: number;
    easyTotal: number;
    mediumAccepted: number;
    mediumTotal: number;
    hardAccepted: number;
    hardTotal: number;
    recentProblems: Array<{ id: number; title: string; status: string }>;
  };
  availableProblems: Array<{
    id: number;
    title: string;
    difficulty: number;
    acRate: number;
    totalSubmissions: number;
  }>;
}): { system: string; user: string } {
  const system = `You are an intelligent problem recommendation system for an online judge. Based on the user's submission history and available problems, recommend 5 problems. Write in Chinese.

Guidelines:
- Match difficulty to the user's skill level (slightly challenging but achievable)
- Identify weak areas (topics where they have low AC rate) and recommend practice
- Diversify: don't recommend all easy or all hard
- For each recommendation, give a brief reason (1 sentence)

Return as a JSON array:
[{"id": number, "reason": "推荐理由"}, ...]

Recommend exactly 5 problems.`;

  const recentStr = params.userStats.recentProblems
    .map((p) => `  - #${p.id} ${p.title} (${p.status})`)
    .join("\n");

  const availableStr = params.availableProblems
    .map((p) => {
      const diff = p.difficulty === 1 ? "Easy" : p.difficulty === 2 ? "Medium" : "Hard";
      return `  - #${p.id} ${p.title} | ${diff} | AC Rate: ${p.acRate.toFixed(1)}% | Total Subs: ${p.totalSubmissions}`;
    })
    .join("\n");

  const user = `User Stats:
- Total Submissions: ${params.userStats.totalSubmissions}
- Total Accepted: ${params.userStats.totalAccepted}
- Easy: ${params.userStats.easyAccepted}/${params.userStats.easyTotal} AC
- Medium: ${params.userStats.mediumAccepted}/${params.userStats.mediumTotal} AC
- Hard: ${params.userStats.hardAccepted}/${params.userStats.hardTotal} AC

Recent Problems:
${recentStr || "  None"}

Available Problems:
${availableStr}

Recommend 5 problems. Return ONLY the JSON array.`;

  return { system, user };
}

// ============================================================
// 7. Article Summarization Prompt
// ============================================================
export function buildSummarizeArticlePrompt(params: {
  title: string;
  content: string;
  replies: Array<{ username: string; content: string }>;
}): { system: string; user: string } {
  const system = `You are an expert discussion moderator. Summarize the following discussion post and its replies in Chinese. Structure your summary:

## 帖子概要
(One or two sentences summarizing the main post)

## 核心观点
(Key points from the post body — use bullet points)

## 讨论要点
(Key opinions, questions, and insights from the replies — who said what matters)

## 结论/共识
(If the discussion reached a conclusion or consensus, state it. If not, note unresolved questions.)

Keep the summary concise and informative. Focus on extracting actionable insights. Use markdown.`;

  const replyLines = params.replies.length > 0
    ? params.replies
        .map((r, i) => `  ${i + 1}. ${r.username}: ${r.content}`)
        .join("\n")
    : "  (暂无回复)";

  const user = `帖子标题: ${params.title}

帖子正文:
${params.content}

回复列表 (共 ${params.replies.length} 条):
${replyLines}

请对以上讨论内容进行总结。`;

  return { system, user };
}
