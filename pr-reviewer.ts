// pr-reviewer.ts
import { Octokit } from "@octokit/rest";
import OpenAI from "openai";

// Initialize Octokit with GitHub Actions token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Review prompt template
const reviewPrompt = `
You are an expert code reviewer AI. Your task is to:
1. Analyze GitHub PR code changes
2. Provide constructive feedback following these guidelines:
   - Check for code quality (readability, structure)
   - Identify potential bugs
   - Suggest improvements
   - Keep comments concise and actionable
3. Format your review as:
[Code Review]
Summary: [Brief summary of changes]
Findings: [Key observations]
Suggestions: [Actionable improvements]

Review the following code changes:
{diff}
`;

async function reviewPullRequest(owner: string, repo: string, pullNumber: number): Promise<string | null> {
  try {
    // Get PR diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: "diff" },
    });
    const diffString = diff as unknown as string;
    // Generate review using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: reviewPrompt.replace("{diff}", diffString),
        },
      ],
      max_tokens: 1000,
    });

    const reviewContent = completion.choices[0]?.message.content;
    if (!reviewContent) throw new Error("No review content generated");

    // Post review comment to PR
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body: reviewContent,
      event: "COMMENT",
    });

    console.log(`Successfully reviewed PR #${pullNumber}`);
    return reviewContent;

  } catch (error) {
    console.error(`Error reviewing PR: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Main execution using GitHub event context
async function main() {
  const githubContext = JSON.parse(process.env.GITHUB_CONTEXT || "{}");
  const { repository, pull_request } = githubContext;

  if (!repository || !pull_request) {
    console.error("No PR context available");
    return;
  }

  const [owner, repo] = repository.full_name.split("/");
  const pullNumber = pull_request.number;

  await reviewPullRequest(owner, repo, pullNumber);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});