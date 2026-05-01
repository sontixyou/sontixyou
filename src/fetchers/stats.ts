import { graphql } from "@octokit/graphql";
import { retry } from "../lib/retry.js";

export type Stats = {
  name: string;
  totalStars: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  contributedTo: number;
  totalReviews: number;
  followers: number;
  rank: { level: string; percentile: number };
};

type StatsQueryResponse = {
  user: null | {
    name: string | null;
    login: string;
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestReviewContributions: number;
      restrictedContributionsCount: number;
    };
    repositoriesContributedTo: { totalCount: number };
    pullRequests: { totalCount: number };
    openIssues: { totalCount: number };
    closedIssues: { totalCount: number };
    followers: { totalCount: number };
    repositories: {
      totalCount: number;
      nodes: { stargazers: { totalCount: number } }[];
    };
  };
};

const QUERY = /* GraphQL */ `
  query userInfo($login: String!) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
      }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, PULL_REQUEST_REVIEW]) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      openIssues: issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      followers {
        totalCount
      }
      repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
        totalCount
        nodes {
          stargazers {
            totalCount
          }
        }
      }
    }
  }
`;

const exponentialCdf = (x: number) => 1 - Math.pow(2, -x);
const logNormalCdf = (x: number) => x / (1 + x);

const calculateRank = (s: {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  stars: number;
  followers: number;
}) => {
  const COMMITS_MEDIAN = 1000, COMMITS_WEIGHT = 2;
  const PRS_MEDIAN = 50, PRS_WEIGHT = 3;
  const ISSUES_MEDIAN = 25, ISSUES_WEIGHT = 1;
  const REVIEWS_MEDIAN = 2, REVIEWS_WEIGHT = 1;
  const STARS_MEDIAN = 50, STARS_WEIGHT = 4;
  const FOLLOWERS_MEDIAN = 10, FOLLOWERS_WEIGHT = 1;
  const TOTAL =
    COMMITS_WEIGHT + PRS_WEIGHT + ISSUES_WEIGHT + REVIEWS_WEIGHT + STARS_WEIGHT + FOLLOWERS_WEIGHT;

  const score =
    (COMMITS_WEIGHT * exponentialCdf(s.commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponentialCdf(s.prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponentialCdf(s.issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponentialCdf(s.reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * logNormalCdf(s.stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * logNormalCdf(s.followers / FOLLOWERS_MEDIAN)) /
    TOTAL;

  const percentile = 100 * (1 - score);
  const TIERS = [
    { max: 1, level: "S" }, { max: 12.5, level: "A+" }, { max: 25, level: "A" },
    { max: 37.5, level: "A-" }, { max: 50, level: "B+" }, { max: 62.5, level: "B" },
    { max: 75, level: "B-" }, { max: 87.5, level: "C+" }, { max: 100, level: "C" },
  ] as const;
  const tier = TIERS.find((t) => percentile <= t.max);
  return { level: tier?.level ?? "C", percentile };
};

export const fetchStats = async (
  login: string,
  token: string,
  countPrivate: boolean,
): Promise<Stats> => {
  const data = await retry(
    () =>
      graphql<StatsQueryResponse>(QUERY, {
        login,
        headers: { authorization: `token ${token}` },
      }),
    { label: "fetchStats" },
  );

  const u = data.user;
  if (!u) throw new Error(`User '${login}' not found`);
  const totalStars = u.repositories.nodes.reduce((sum, r) => sum + r.stargazers.totalCount, 0);
  const totalCommits =
    u.contributionsCollection.totalCommitContributions +
    (countPrivate ? u.contributionsCollection.restrictedContributionsCount : 0);

  const stats = {
    commits: totalCommits,
    prs: u.pullRequests.totalCount,
    issues: u.openIssues.totalCount + u.closedIssues.totalCount,
    reviews: u.contributionsCollection.totalPullRequestReviewContributions,
    stars: totalStars,
    followers: u.followers.totalCount,
  };

  return {
    name: u.name ?? u.login,
    totalStars,
    totalCommits,
    totalPRs: stats.prs,
    totalIssues: stats.issues,
    contributedTo: u.repositoriesContributedTo.totalCount,
    totalReviews: stats.reviews,
    followers: stats.followers,
    rank: calculateRank(stats),
  };
};
