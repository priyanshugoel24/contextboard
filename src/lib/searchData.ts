import { prisma } from "@/lib/prisma";
import { CardResult, ProjectResult, TeamResult } from "@/interfaces/SearchLibTypes";

export async function getGlobalSearchData() {
  const results: Array<{ type: string; [key: string]: unknown }> = [];

  // Start all queries in parallel
  const promises = [
    prisma.contextCard.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        title: true,
        projectId: true,
        project: {
          select: {
            slug: true,
            name: true,
            team: {
              select: {
                name: true,
                slug: true,
              }
            }
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        slug: true,
        tags: true,
        team: {
          select: {
            name: true,
            slug: true,
          }
        }
      },
    }),
    prisma.team.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            projects: { where: { isArchived: false } }
          }
        }
      },
    }),
  ];

  const [cardsResult, projectsResult, teamsResult] = await Promise.allSettled(promises);

  // Helper functions to filter correct types
  function isCard(obj: unknown): obj is CardResult {
    return typeof obj === 'object' && obj !== null && 
           typeof (obj as CardResult).title === "string" && 
           typeof (obj as CardResult).projectId === "string";
  }
  
  function isProject(obj: unknown): obj is ProjectResult {
    return typeof obj === 'object' && obj !== null &&
           typeof (obj as ProjectResult).name === "string" && 
           typeof (obj as ProjectResult).slug === "string" && 
           Array.isArray((obj as ProjectResult).tags);
  }
  
  function isTeam(obj: unknown): obj is TeamResult {
    return typeof obj === 'object' && obj !== null &&
           typeof (obj as TeamResult).name === "string" && 
           typeof (obj as TeamResult).slug === "string" && 
           typeof (obj as TeamResult)._count === "object";
  }

  const cards = cardsResult.status === "fulfilled" ? (cardsResult.value as CardResult[]).filter(isCard) : [];
  if (cardsResult.status === "rejected") {
    console.error("Cards error:", cardsResult.reason);
  }

  const projects = projectsResult.status === "fulfilled" ? (projectsResult.value as ProjectResult[]).filter(isProject) : [];
  if (projectsResult.status === "rejected") {
    console.error("Projects error:", projectsResult.reason);
  }

  const teams = teamsResult.status === "fulfilled" ? (teamsResult.value as TeamResult[]).filter(isTeam) : [];
  if (teamsResult.status === "rejected") {
    console.error("Teams error:", teamsResult.reason);
  }

  const cardData = cards.map((card) => ({
    type: "card" as const,
    id: `card-${card.id}`,
    originalId: card.id,
    title: card.title || "Untitled Card",
    projectId: card.projectId,
    projectSlug: card.project?.slug || "",
    projectName: card.project?.name || "",
    teamName: card.project?.team?.name || "",
    teamSlug: card.project?.team?.slug || "",
  }));

  results.push(...cardData);

  const projectData = projects.map((project) => ({
    type: "project" as const,
    id: `project-${project.id}`,
    originalId: project.id,
    title: project.name,
    slug: project.slug,
    teamName: project.team?.name || "",
    teamSlug: project.team?.slug || "",
  }));

  results.push(...projectData);

  const teamData = teams.map((team) => ({
    type: "team" as const,
    id: `team-${team.id}`,
    originalId: team.id,
    title: team.name,
    name: team.name,
    slug: team.slug,
    description: team.description || "",
    projectCount: team._count.projects,
  }));

  results.push(...teamData);

  const tagData = projects.flatMap((project) =>
    (project.tags || []).map((tag: string) => ({
      type: "tag" as const,
      id: `tag-${project.id}-${tag}`,
      originalId: `${project.id}-${tag}`,
      title: `#${tag}`,
      tag,
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
      teamName: project.team?.name || "",
      teamSlug: project.team?.slug || "",
    }))
  );

  results.push(...tagData);

  return results;
}