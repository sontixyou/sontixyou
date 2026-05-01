import { graphql } from "@octokit/graphql";
import { retry } from "../lib/retry.js";

export type Language = { name: string; color: string; size: number };

type Response = {
  user: {
    repositories: {
      nodes: {
        languages: {
          edges: { size: number; node: { name: string; color: string | null } }[];
        };
      }[];
    };
  };
};

const QUERY = /* GraphQL */ `
  query userInfo($login: String!) {
    user(login: $login) {
      repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
        nodes {
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

export const fetchTopLanguages = async (
  login: string,
  token: string,
  topN = 5,
): Promise<Language[]> => {
  const data = await retry(
    () =>
      graphql<Response>(QUERY, {
        login,
        headers: { authorization: `token ${token}` },
      }),
    { label: "fetchTopLanguages" },
  );

  const totals = new Map<string, Language>();
  for (const repo of data.user.repositories.nodes) {
    for (const edge of repo.languages.edges) {
      const key = edge.node.name;
      const prev = totals.get(key);
      if (prev) {
        prev.size += edge.size;
      } else {
        totals.set(key, {
          name: edge.node.name,
          color: edge.node.color ?? "#858585",
          size: edge.size,
        });
      }
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.size - a.size)
    .slice(0, topN);
};
