export interface GitHubRefResponse {
  object: { sha: string };
}

export interface GitHubCommitResponse {
  sha: string;
  tree: { sha: string };
}

export interface GitHubTreeResponse {
  sha: string;
}

export interface CommitResult {
  commitSha: string;
  commitUrl: string;
}
