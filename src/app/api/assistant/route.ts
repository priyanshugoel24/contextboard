import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";
import Fuse from "fuse.js";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import {
  ProjectSearchData,
  TeamSearchData,
  FuseSearchResult,
  RelevantProject,
  RelevantTeam,
} from "@/interfaces/search";
import { bodySchema } from "@/lib/security";

// Enhanced fuzzy matching for project and team identification
function findRelevantProjectsAndTeams(
  prompt: string,
  projects: ProjectSearchData[],
  teams: TeamSearchData[]
) {
  const queryLower = prompt.toLowerCase();
  const relevantProjects: RelevantProject[] = [];
  const relevantTeams: RelevantTeam[] = [];

  // Create Fuse instances for fuzzy search
  const projectFuse = new Fuse(projects, {
    keys: ["name", "slug", "teamName"],
    threshold: 0.4, // Allow for typos and partial matches
    includeScore: true,
  });

  const teamFuse = new Fuse(teams, {
    keys: ["name", "slug"],
    threshold: 0.4,
    includeScore: true,
  });

  // 1. Direct fuzzy search matches for projects
  const projectFuseResults = projectFuse.search(queryLower);
  projectFuseResults.forEach((result: FuseSearchResult<ProjectSearchData>) => {
    if (result.score! < 0.4) {
      // Good fuzzy match
      relevantProjects.push({
        project: result.item,
        score: 1 - result.score!, // Convert to relevance score
        reason: `Fuzzy match for project "${result.item.name}"`,
      });
    }
  });

  // 1. Direct fuzzy search matches for teams
  const teamFuseResults = teamFuse.search(queryLower);
  teamFuseResults.forEach((result: FuseSearchResult<TeamSearchData>) => {
    if (result.score! < 0.4) {
      // Good fuzzy match
      relevantTeams.push({
        team: result.item,
        score: 1 - result.score!, // Convert to relevance score
        reason: `Fuzzy match for team "${result.item.name}"`,
      });
    }
  });

  // 2. Exact substring matches for projects (highest priority)
  projects.forEach((project) => {
    const projectName = project.name.toLowerCase();
    const projectSlug = project.slug.toLowerCase();
    const teamName = project.teamName?.toLowerCase() || "";

    if (
      projectName.includes(queryLower) ||
      queryLower.includes(projectName) ||
      projectSlug.includes(queryLower) ||
      queryLower.includes(projectSlug) ||
      (teamName &&
        (teamName.includes(queryLower) || queryLower.includes(teamName)))
    ) {
      relevantProjects.push({
        project,
        score: 0.95,
        reason: `Direct name match for project "${project.name}"`,
      });
    }
  });

  // 2. Exact substring matches for teams (highest priority)
  teams.forEach((team) => {
    const teamName = team.name.toLowerCase();
    const teamSlug = team.slug.toLowerCase();

    if (
      teamName.includes(queryLower) ||
      queryLower.includes(teamName) ||
      teamSlug.includes(queryLower) ||
      queryLower.includes(teamSlug)
    ) {
      relevantTeams.push({
        team,
        score: 0.95,
        reason: `Direct name match for team "${team.name}"`,
      });
    }
  });

  // 3. Quoted project and team names
  const quotedMatches = queryLower.match(/["']([^"']+)["']/g);
  if (quotedMatches) {
    quotedMatches.forEach((quoted) => {
      const quotedName = quoted.slice(1, -1).toLowerCase();
      projects.forEach((project) => {
        const projectName = project.name.toLowerCase();
        if (
          projectName.includes(quotedName) ||
          quotedName.includes(projectName)
        ) {
          relevantProjects.push({
            project,
            score: 0.9,
            reason: `Quoted match for project "${project.name}"`,
          });
        }
      });
      teams.forEach((team) => {
        const teamName = team.name.toLowerCase();
        if (teamName.includes(quotedName) || quotedName.includes(teamName)) {
          relevantTeams.push({
            team,
            score: 0.9,
            reason: `Quoted match for team "${team.name}"`,
          });
        }
      });
    });
  }

  // 4. Pattern-based matches for projects and teams
  const patterns = [
    /(?:project|in|for|about)\s+["']?([^"'\s]+(?:\s+[^"'\s]+)*?)["']?(?:\s|$|[,.!?])/gi,
    /(?:working on|update on|status of)\s+["']?([^"'\s]+(?:\s+[^"'\s]+)*?)["']?(?:\s|$|[,.!?])/gi,
    /(?:team|group)\s+["']?([^"'\s]+(?:\s+[^"'\s]+)*?)["']?(?:\s|$|[,.!?])/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const extractedName = match[1].toLowerCase().trim();
      projects.forEach((project) => {
        const projectName = project.name.toLowerCase();
        if (
          projectName.includes(extractedName) ||
          extractedName.includes(projectName)
        ) {
          relevantProjects.push({
            project,
            score: 0.8,
            reason: `Pattern match for project "${project.name}"`,
          });
        }
      });
      teams.forEach((team) => {
        const teamName = team.name.toLowerCase();
        if (
          teamName.includes(extractedName) ||
          extractedName.includes(teamName)
        ) {
          relevantTeams.push({
            team,
            score: 0.8,
            reason: `Pattern match for team "${team.name}"`,
          });
        }
      });
    }
  });

  // Remove duplicates and sort by score for projects
  const uniqueProjects = new Map<string, (typeof relevantProjects)[0]>();
  relevantProjects.forEach((item) => {
    const existing = uniqueProjects.get(item.project.id);
    if (!existing || item.score > existing.score) {
      uniqueProjects.set(item.project.id, item);
    }
  });

  // Remove duplicates and sort by score for teams
  const uniqueTeams = new Map<string, (typeof relevantTeams)[0]>();
  relevantTeams.forEach((item) => {
    const existing = uniqueTeams.get(item.team.id);
    if (!existing || item.score > existing.score) {
      uniqueTeams.set(item.team.id, item);
    }
  });

  return {
    projects: Array.from(uniqueProjects.values()).sort(
      (a, b) => b.score - a.score
    ),
    teams: Array.from(uniqueTeams.values()).sort((a, b) => b.score - a.score),
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    const json = await req.json();
    const parse = bodySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { prompt } = parse.data;

    // Get comprehensive data in parallel for teams, projects, and members
    // Run queries in parallel, but allow partial results if some fail
    const [userTeamsResult, userProjectsResult, allTeamMembersResult] =
      await Promise.allSettled([
        prisma.team.findMany({
          where: {
            OR: [
              { createdById: user.id },
              {
                members: {
                  some: {
                    userId: user.id,
                    status: "ACTIVE",
                  },
                },
              },
            ],
            isArchived: false,
          },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
              where: { status: "ACTIVE" },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            projects: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                tags: true,
                createdAt: true,
                lastActivityAt: true,
              },
              where: { isArchived: false },
            },
            _count: {
              select: {
                projects: { where: { isArchived: false } },
                members: { where: { status: "ACTIVE" } },
              },
            },
          },
          orderBy: { lastActivityAt: "desc" },
        }),

        prisma.project.findMany({
          where: {
            OR: [
              { createdById: user.id },
              {
                team: {
                  members: {
                    some: {
                      userId: user.id,
                      status: "ACTIVE",
                    },
                  },
                },
              },
            ],
            isArchived: false,
          },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, image: true },
            },
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                hackathonModeEnabled: true,
                hackathonDeadline: true,
              },
            },
            _count: {
              select: {
                contextCards: { where: { isArchived: false } },
              },
            },
          },
          orderBy: { lastActivityAt: "desc" },
        }),

        prisma.teamMember.findMany({
          where: {
            team: {
              members: {
                some: {
                  userId: user.id,
                  status: "ACTIVE",
                },
              },
            },
            status: "ACTIVE",
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            team: {
              select: { id: true, name: true, slug: true },
            },
          },
        }),
      ]);

    // Use results if fulfilled, otherwise fallback to empty array
    const userTeams =
      userTeamsResult.status === "fulfilled" ? userTeamsResult.value : [];
    const userProjects =
      userProjectsResult.status === "fulfilled" ? userProjectsResult.value : [];
    const allTeamMembers =
      allTeamMembersResult.status === "fulfilled"
        ? allTeamMembersResult.value
        : [];

    if (userProjects.length === 0 && userTeams.length === 0) {
      return NextResponse.json({
        answer:
          "You don't have access to any projects or teams yet. Create a project or join a team to get started! You can create projects to organize your context cards, tasks, insights, and decisions.",
        metadata: {
          scope: "empty",
          projectsAnalyzed: 0,
          cardsAnalyzed: 0,
          teamsAnalyzed: 0,
          relevantProjects: null,
        },
      });
    }

    // Get comprehensive context data for all projects
    const allProjectIds = userProjects.map((p) => p.id);
    const allTeamIds = userTeams.map((t) => t.id);

    // Fetch comprehensive data in parallel
    const [
      allCardsResult,
      recentActivitiesResult,
      commentsResult,
      teamActivitiesResult,
    ] = await Promise.allSettled([
      prisma.contextCard.findMany({
        where: {
          projectId: { in: allProjectIds },
          isArchived: false,
          OR: [
            { visibility: "PUBLIC" },
            { userId: user.id },
            { assignedToId: user.id },
          ],
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              team: { select: { name: true, slug: true } },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          linkedCard: {
            select: { id: true, title: true, type: true },
          },
          linkedFrom: {
            select: { id: true, title: true, type: true },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 150,
      }),

      prisma.activity.findMany({
        where: {
          projectId: { in: allProjectIds },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: {
              id: true,
              name: true,
              team: { select: { name: true } },
            },
          },
          team: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),

      prisma.comment.findMany({
        where: {
          card: {
            projectId: { in: allProjectIds },
            isArchived: false,
          },
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          card: {
            select: {
              id: true,
              title: true,
              project: {
                select: { name: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),

      Promise.allSettled(
        allTeamIds.map((teamId) =>
          prisma.project.findMany({
            where: { teamId, isArchived: false },
            select: {
              id: true,
              name: true,
              lastActivityAt: true,
              _count: {
                select: {
                  contextCards: { where: { isArchived: false } },
                  activities: {
                    where: {
                      createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                      },
                    },
                  },
                },
              },
            },
          })
        )
      ),
    ]);

    // Use results if fulfilled, otherwise fallback to empty array
    const allCards =
      allCardsResult.status === "fulfilled" ? allCardsResult.value : [];
    const recentActivities =
      recentActivitiesResult.status === "fulfilled"
        ? recentActivitiesResult.value
        : [];
    const comments =
      commentsResult.status === "fulfilled" ? commentsResult.value : [];
    const teamActivities =
      teamActivitiesResult.status === "fulfilled"
        ? teamActivitiesResult.value
            .filter((r): r is PromiseFulfilledResult<{ name: string; id: string; lastActivityAt: Date; _count: { activities: number; contextCards: number; }; }[]> => r.status === "fulfilled")
            .map((r) => r.value)
        : [];

    // Flatten team activities
    const flatTeamActivities = teamActivities.flat();

    // Use enhanced fuzzy logic to find relevant projects and teams
    const projectsWithTeamNames = userProjects.map((p) => ({
      ...p,
      teamName: p.team?.name,
    }));

    const relevantResults = findRelevantProjectsAndTeams(
      prompt,
      projectsWithTeamNames,
      userTeams
    );
    const relevantProjects = relevantResults.projects;
    const relevantTeams = relevantResults.teams;

    // Determine the scope of the response and build focused context
    let focusedProjects: typeof userProjects = [];
    let focusedTeams: typeof userTeams = [];
    let responseScope = "general";

    if (relevantProjects.length > 0 || relevantTeams.length > 0) {
      // If we found specific project matches, focus on those
      const relevantProjectIds = relevantProjects
        .slice(0, 3)
        .map((rp: { project: { id: string } }) => rp.project.id);
      focusedProjects = userProjects.filter((p) =>
        relevantProjectIds.includes(p.id)
      );

      // If we found specific team matches, focus on those and their projects
      const relevantTeamIds = relevantTeams
        .slice(0, 3)
        .map((rt: { team: { id: string } }) => rt.team.id);
      focusedTeams = userTeams.filter((t) => relevantTeamIds.includes(t.id));

      // Also include projects from relevant teams
      const teamProjectIds = focusedTeams.flatMap((t) =>
        t.projects.map((p) => p.id)
      );
      const teamProjects = userProjects.filter((p) =>
        teamProjectIds.includes(p.id)
      );
      focusedProjects = [...focusedProjects, ...teamProjects].filter(
        (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
      );

      responseScope =
        relevantProjects.length === 1 && relevantTeams.length === 0
          ? "single-project"
          : relevantProjects.length === 0 && relevantTeams.length === 1
          ? "single-team"
          : "multi-entity";
    } else {
      // For general queries, include all projects and teams
      focusedProjects = userProjects;
      focusedTeams = userTeams;
      responseScope = "general";
    }

    // Filter cards and activities based on focused projects
    const relevantCards = allCards.filter((card) =>
      focusedProjects.some((project) => project.id === card.projectId)
    );

    const relevantActivities = recentActivities.filter((activity) =>
      focusedProjects.some((project) => project.id === activity.projectId)
    );

    // Build comprehensive team summaries with analytics
    const teamSummaries = focusedTeams.map((team) => {
      const teamMemberCount = team.members.length;
      const teamProjectCount = team.projects.length;
      const teamProjects = team.projects
        .map((p) => `${p.name} (${p.description || "No description"})`)
        .join(", ");

      // Calculate team activity metrics
      const teamProjectIds = team.projects.map((p) => p.id);
      const teamProjectsData = flatTeamActivities.filter((project) =>
        teamProjectIds.includes(project.id)
      );

      const totalTeamCards = teamProjectsData.reduce(
        (sum: number, project: { _count: { contextCards: number } }) =>
          sum + project._count.contextCards,
        0
      );
      const weeklyActivity = teamProjectsData.reduce(
        (sum: number, project: { _count: { activities: number } }) =>
          sum + project._count.activities,
        0
      );

      // Member roles and expertise
      const memberDetails = team.members
        .map((member) => {
          const userCards = relevantCards.filter(
            (card) => card.userId === member.userId
          );
          const userActivities = relevantActivities.filter(
            (activity) => activity.userId === member.userId
          );
          return `${
            member.user.name || member.user.email?.split("@")[0]
          } (${member.role.toLowerCase()}, ${userCards.length} cards, ${
            userActivities.length
          } recent activities)`;
        })
        .join("; ");

      return `
TEAM: ${team.name} (${team.slug})
- Created by: ${team.createdBy.name || team.createdBy.email}
- Members (${teamMemberCount}): ${memberDetails}
- Projects (${teamProjectCount}): ${teamProjects || "No projects"}
- Total Context Cards: ${totalTeamCards}
- Weekly Activity: ${weeklyActivity} activities
- Description: ${team.description || "No description provided"}
- Hackathon Mode: ${team.hackathonModeEnabled ? "Enabled" : "Disabled"}
${
  team.hackathonDeadline
    ? `- Hackathon Deadline: ${team.hackathonDeadline.toLocaleDateString()}`
    : ""
}
      `.trim();
    });

    // Build comprehensive project summaries with team context
    const projectSummaries = focusedProjects.map((project) => {
      const projectCards = relevantCards.filter(
        (card) => card.projectId === project.id
      );
      const projectActivities = relevantActivities.filter(
        (activity) => activity.projectId === project.id
      );
      const projectComments = comments.filter(
        (comment) => comment.card.project.slug === project.slug
      );
      const cardCount = project._count.contextCards;

      const cardsByType = {
        TASK: projectCards.filter((c) => c.type === "TASK").length,
        INSIGHT: projectCards.filter((c) => c.type === "INSIGHT").length,
        DECISION: projectCards.filter((c) => c.type === "DECISION").length,
      };

      const cardsByStatus = {
        ACTIVE: projectCards.filter((c) => c.status === "ACTIVE").length,
        CLOSED: projectCards.filter((c) => c.status === "CLOSED").length,
      };

      // Calculate engagement metrics
      const totalCommentsCount = projectComments.length;
      const uniqueCommentators = new Set(
        projectComments.map((c) => c.author.id)
      ).size;
      const cardsWithComments = projectCards.filter(
        (card) => card._count.comments > 0
      ).length;

      // Team member activity breakdown for this project (if project belongs to a team)
      const teamMemberActivity = project.team
        ? allTeamMembers
            .filter((tm) => tm.teamId === project.team?.id)
            .map((teamMember) => {
              const memberCards = projectCards.filter(
                (card) =>
                  card.userId === teamMember.userId ||
                  card.assignedToId === teamMember.userId
              );
              const memberActivities = projectActivities.filter(
                (activity) => activity.userId === teamMember.userId
              );
              const memberComments = projectComments.filter(
                (comment) => comment.author.id === teamMember.userId
              );
              return `${
                teamMember.user.name || teamMember.user.email?.split("@")[0]
              } (${teamMember.role.toLowerCase()}: ${
                memberCards.length
              } cards, ${memberActivities.length} activities, ${
                memberComments.length
              } comments)`;
            })
            .join("; ")
        : "No team members";

      return `
PROJECT: ${project.name} (${project.slug})
- Team: ${project.team?.name || "Independent project"}
- Created by: ${project.createdBy.name || project.createdBy.email}
- Team Members Activity: ${teamMemberActivity}
- Cards: ${cardCount} total (${cardsByType.TASK} tasks, ${
        cardsByType.INSIGHT
      } insights, ${cardsByType.DECISION} decisions)
- Status: ${cardsByStatus.ACTIVE} active, ${cardsByStatus.CLOSED} closed
- Engagement: ${totalCommentsCount} comments from ${uniqueCommentators} people on ${cardsWithComments} cards
- Recent Activity: ${projectActivities.length} activities in recent period
- Description: ${project.description || "No description provided"}
- Tags: ${project.tags.length > 0 ? project.tags.join(", ") : "No tags"}
- Last Updated: ${project.lastActivityAt?.toLocaleDateString() || "Unknown"}
      `.trim();
    });

    // Build detailed card context with relationships
    const cardContext = relevantCards
      .map((card) => {
        const assignedInfo = card.assignedTo
          ? ` | Assigned to: ${card.assignedTo.name || card.assignedTo.email}`
          : "";
        const linkedInfo = card.linkedCard
          ? ` | Linked to: ${card.linkedCard.title} (${card.linkedCard.type})`
          : "";
        const linkedFromInfo =
          card.linkedFrom.length > 0
            ? ` | Referenced by: ${card.linkedFrom
                .map((lf) => lf.title)
                .join(", ")}`
            : "";
        const statusInfo = card.status ? ` | Status: ${card.status}` : "";
        const commentsInfo =
          card._count.comments > 0 ? ` | ${card._count.comments} comments` : "";
        const teamInfo = card.project.team
          ? ` | Team: ${card.project.team.name}`
          : "";

        return `[${card.project.name}${teamInfo}] (${card.type}${statusInfo}) ${card.title}: ${card.content}${assignedInfo}${linkedInfo}${linkedFromInfo}${commentsInfo}`;
      })
      .join("\n");

    // Build activity context with team information
    const activityContext = relevantActivities
      .map((activity) => {
        const userName =
          activity.user?.name || activity.user?.email?.split("@")[0] || "User";
        const teamInfo = activity.project?.team
          ? ` (${activity.project.team.name})`
          : activity.team?.name ? ` (${activity.team.name})` : "";
        const projectName = activity.project?.name || (activity.team ? `Team: ${activity.team.name}` : "Unknown");
        return `[${projectName}${teamInfo}] ${userName}: ${activity.type} - ${activity.description}`;
      })
      .join("\n");

    // Build engagement insights from comments
    const engagementContext =
      comments.length > 0
        ? comments
            .map((comment) => {
              const authorName =
                comment.author.name ||
                comment.author.email?.split("@")[0] ||
                "User";
              return `[${comment.card.project.name}] ${authorName} on "${
                comment.card.title
              }": ${comment.content.substring(0, 100)}${
                comment.content.length > 100 ? "..." : ""
              }`;
            })
            .join("\n")
        : "";

    // Generate user-specific insights
    const userInsights = {
      totalProjects: userProjects.length,
      totalTeams: userTeams.length,
      totalCards: allCards.length,
      activeCards: allCards.filter((card) => card.status === "ACTIVE").length,
      tasksAssigned: allCards.filter(
        (card) => card.assignedToId === user.id && card.type === "TASK"
      ).length,
      recentActivity: recentActivities.filter(
        (activity) => activity.userId === user.id
      ).length,
      teamRoles: allTeamMembers
        .filter((tm) => tm.user.id === user.id)
        .map((tm) => `${tm.team.name}: ${tm.role.toLowerCase()}`)
        .join(", "),
    };

    // Generate comprehensive system prompt
    const systemPrompt = `
You are an intelligent project and team assistant with comprehensive access to a user's entire workspace ecosystem.

SCOPE: ${responseScope.toUpperCase()} (${focusedProjects.length} project(s), ${
      focusedTeams.length
    } team(s) in focus)

USER PROFILE:
- User: ${user.name || user.email}
- Total Teams: ${userInsights.totalTeams}
- Total Projects: ${userInsights.totalProjects}
- Total Cards: ${userInsights.totalCards} (${userInsights.activeCards} active)
- Tasks Assigned to You: ${userInsights.tasksAssigned}
- Your Team Roles: ${userInsights.teamRoles || "No team roles"}
- Your Recent Activity: ${userInsights.recentActivity} actions

${
  teamSummaries.length > 0
    ? `TEAM ECOSYSTEM (${teamSummaries.length} teams):
${teamSummaries.join("\n\n")}

`
    : ""
}PROJECT ECOSYSTEM (${projectSummaries.length} projects):
${projectSummaries.join("\n\n")}

CONTEXT CARDS (${relevantCards.length} cards):
${cardContext}

${
  activityContext.length > 0
    ? `RECENT ACTIVITIES (${relevantActivities.length} activities):
${activityContext}

`
    : ""
}${
      engagementContext.length > 0
        ? `COLLABORATION & ENGAGEMENT (${comments.length} recent comments):
${engagementContext}

`
        : ""
    }USER QUERY: ${prompt}

INSTRUCTIONS:
- Provide comprehensive, actionable insights based on the available team and project data
- Reference specific teams, projects, cards, and team members when relevant
- If the query mentions a specific team or project, focus on that entity's data
- For general queries, provide strategic overview insights across all teams and projects
- Identify patterns, trends, and potential issues across the workspace
- Suggest next actions, improvements, or optimizations when appropriate
- Consider team dynamics, workload distribution, and collaboration patterns
- Use the user's name and project/team-specific terminology
- If no relevant data is found, suggest concrete ways to add value to the workspace
- Be concise but thorough, prioritizing actionable insights

${
  relevantProjects.length > 0
    ? `RELEVANT PROJECT MATCHES:
${relevantProjects
  .map(
    (rp) =>
      `- ${rp.project.name} (${rp.reason}, relevance: ${rp.score.toFixed(2)})`
  )
  .join("\n")}

`
    : ""
}${
      relevantTeams.length > 0
        ? `RELEVANT TEAM MATCHES:
${relevantTeams
  .map(
    (rt) =>
      `- ${rt.team.name} (${rt.reason}, relevance: ${rt.score.toFixed(2)})`
  )
  .join("\n")}

`
        : ""
    }CONTEXT: Respond as an intelligent workspace assistant who understands team dynamics, project management, and can provide strategic insights about collaboration, productivity, and project progress.
    `.trim();

    const text = await gemini.generateAssistantContent(systemPrompt);

    // Log for debugging
    console.log(
      `🤖 AI Assistant - User: ${user.email}, Query: "${prompt.substring(
        0,
        50
      )}...", Scope: ${responseScope}, Teams: ${
        focusedTeams.length
      }, Projects: ${focusedProjects.length}, Cards: ${relevantCards.length}`
    );

    return NextResponse.json({
      answer: text,
      metadata: {
        scope: responseScope,
        teamsAnalyzed: focusedTeams.length,
        projectsAnalyzed: focusedProjects.length,
        cardsAnalyzed: relevantCards.length,
        activitiesAnalyzed: relevantActivities.length,
        commentsAnalyzed: comments.length,
        userInsights: {
          totalWorkspaceTeams: userTeams.length,
          totalWorkspaceProjects: userProjects.length,
          personalTasksAssigned: userInsights.tasksAssigned,
          teamRoles: userInsights.teamRoles,
        },
        relevantProjects:
          relevantProjects.length > 0
            ? relevantProjects.slice(0, 3).map((rp) => ({
                name: rp.project.name,
                reason: rp.reason,
                score: rp.score,
              }))
            : null,
        relevantTeams:
          relevantTeams.length > 0
            ? relevantTeams.slice(0, 3).map((rt) => ({
                name: rt.team.name,
                reason: rt.reason,
                score: rt.score,
              }))
            : null,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'No authenticated user found') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(
      "AI assistant error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        error:
          "I'm having trouble processing your request right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
