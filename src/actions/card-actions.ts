'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/logActivity';
import { TaskStatus } from '@/interfaces/common';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { findCardWithModifyAccess } from '@/queries/db-queries';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ContextCard } from '@prisma/client';
import { 
  sanitizeText, 
  validateInput, 
  contextCardSchema, 
  validateFileUpload,
  sanitizeHtml as serverSanitizeHtml
} from '@/lib/security';
import { ContextCardService } from '@/services/contextCard.service';
import { gemini } from "@/lib/gemini";

// Helper function to validate project access
async function validateProjectAccess(projectIdOrSlug: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { id: projectIdOrSlug },    // Try matching by ID first
        { slug: projectIdOrSlug }   // Then try matching by slug
      ],
      AND: {
        OR: [
          { createdById: userId },
          { team: { members: { some: { userId: userId } } } }
        ]
      }
    },
    include: {
      team: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  return project;
}

// Helper function to parse input with AI directly (without HTTP calls)
async function parseInputWithAI(input: string) {
  // Check if Gemini API key is available
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set");
    throw new Error("AI service is not configured. Please set the GEMINI_API_KEY environment variable.");
  }

  const prompt = `
You are an assistant that helps parse natural language into structured data to create a context card.

User input: "${input}"

Instructions:
1. Extract a meaningful title (max 100 characters)
2. Create comprehensive content based on the input
3. Determine the most appropriate type (TASK for actionable items, INSIGHT for knowledge/observations, DECISION for conclusions/choices)
4. Set visibility (PUBLIC for general information, PRIVATE for sensitive/personal content)

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Brief descriptive title",
  "content": "Detailed content based on the input",
  "type": "TASK",
  "visibility": "PUBLIC"
}

Do not include any other text, explanations, or formatting. Only return the JSON object.`;

  console.log("Sending prompt to Gemini:", prompt);
  
  const rawText = await gemini.generateContent(prompt, {
    model: "gemini-2.5-flash",
  });

  console.log("Raw Gemini response:", rawText);

  // More robust JSON extraction
  let jsonString = rawText.trim();
  
  // Remove any markdown code block formatting
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // Find JSON object boundaries
  const jsonStart = jsonString.indexOf("{");
  const jsonEnd = jsonString.lastIndexOf("}");
  
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error("No valid JSON found in response:", rawText);
    throw new Error("AI response does not contain valid JSON");
  }

  jsonString = jsonString.slice(jsonStart, jsonEnd + 1);
  console.log("Extracted JSON string:", jsonString);

  let parsedCard;
  try {
    parsedCard = JSON.parse(jsonString);
  } catch (parseError) {
    console.error("JSON parsing failed:", parseError, "JSON string:", jsonString);
    throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }

  // Validate required fields
  const validTypes = ["TASK", "INSIGHT", "DECISION"];
  const validVisibilities = ["PUBLIC", "PRIVATE"];

  if (!parsedCard.title || typeof parsedCard.title !== 'string') {
    throw new Error("Invalid or missing title field");
  }

  if (!parsedCard.content || typeof parsedCard.content !== 'string') {
    throw new Error("Invalid or missing content field");
  }

  if (!parsedCard.type || !validTypes.includes(parsedCard.type)) {
    throw new Error("Invalid or missing type field. Must be one of: " + validTypes.join(", "));
  }

  if (!parsedCard.visibility || !validVisibilities.includes(parsedCard.visibility)) {
    throw new Error("Invalid or missing visibility field. Must be one of: " + validVisibilities.join(", "));
  }

  console.log("Successfully parsed card:", parsedCard);
  return parsedCard;
}

// Helper function to get authenticated user in server actions
async function getAuthenticatedUserForAction() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error('No authenticated user found');
  }
  
  // Create a proper session object for the auth utils function
  const properSession = {
    user: {
      id: session.user.id || '',
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    expires: session.expires,
  };
  
  const user = await getAuthenticatedUserFromSession(properSession);
  
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  return user;
}

export async function archiveContextCard(cardId: string, isArchived: boolean) {
  try {
    const user = await getAuthenticatedUserForAction();

    // Check if user has access to this card
    const card = await findCardWithModifyAccess(cardId, user.id, {
      include: {
        project: {
          include: {
            team: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    });

    if (!card) {
      throw new Error('Card not found or access denied');
    }

    const updatedCard = await prisma.contextCard.update({
      where: { id: cardId },
      data: { 
        isArchived,
        updatedAt: new Date()
      },
    });

    // Log the activity
    await logActivity({
      type: "CARD_ARCHIVED",
      description: `${isArchived ? 'Archived' : 'Unarchived'} card "${card.title}"`,
      metadata: { cardId: card.id, isArchived },
      userId: user.id,
      projectId: card.projectId,
    });

    // Revalidate relevant paths - we'll fetch project separately for now
    const project = await prisma.project.findUnique({
      where: { id: card.projectId },
      include: {
        team: {
          select: {
            slug: true
          }
        }
      }
    });

    if (project?.team) {
      revalidatePath(`/team/${project.team.slug}/project/${project.slug}`);
    }

    return { success: true, card: updatedCard };
  } catch (error) {
    console.error('Error archiving context card:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to archive card');
  }
}

export async function updateContextCardStatus(cardId: string, status: TaskStatus) {
  try {
    const user = await getAuthenticatedUserForAction();

    // Check if user has access to this card
    const card = await findCardWithModifyAccess(cardId, user.id, {
      include: {
        project: {
          include: {
            team: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    });

    if (!card) {
      throw new Error('Card not found or access denied');
    }

    const updatedCard = await prisma.contextCard.update({
      where: { id: cardId },
      data: { 
        status: status,
        updatedAt: new Date()
      },
    });

    // Log the activity
    await logActivity({
      type: "CARD_UPDATED",
      description: `Updated card "${card.title}" status to ${status}`,
      metadata: { cardId: card.id, oldStatus: card.status, newStatus: status },
      userId: user.id,
      projectId: card.projectId,
    });

    // Revalidate relevant paths - we'll fetch project separately for now
    const project = await prisma.project.findUnique({
      where: { id: card.projectId },
      include: {
        team: {
          select: {
            slug: true
          }
        }
      }
    });

    if (project?.team) {
      revalidatePath(`/team/${project.team.slug}/project/${project.slug}`);
    }

    return { success: true, card: updatedCard };
  } catch (error) {
    console.error('Error updating context card status:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update card status');
  }
}

// Server Action for creating context cards
export async function createContextCard(formData: FormData) {
  try {
    const user = await getAuthenticatedUserForAction();

    // Extract and sanitize form data
    const title = sanitizeText(formData.get('title') as string);
    const content = serverSanitizeHtml(formData.get('content') as string);
    const projectSlug = formData.get('projectSlug') as string;
    const type = formData.get('type') as 'TASK' | 'INSIGHT' | 'DECISION';
    const visibility = formData.get('visibility') as 'PRIVATE' | 'PUBLIC';
    const status = formData.get('status') as TaskStatus || 'ACTIVE';
    const why = formData.get('why') ? sanitizeText(formData.get('why') as string) : undefined;
    const issues = formData.get('issues') ? sanitizeText(formData.get('issues') as string) : undefined;
    const assignedToId = formData.get('assignedToId') as string | null;

    // Validate project access first
    const project = await validateProjectAccess(projectSlug, user.id);

    // Validate input
    const validationResult = validateInput(contextCardSchema, {
      title,
      content,
      type,
      visibility,
      why,
      issues,
      projectId: project.id  // Use the resolved project ID for validation
    });

    if (!validationResult.isValid) {
      throw new Error(validationResult.errors?.[0] || 'Invalid input');
    }

    // Handle file uploads
    const files = formData.getAll('attachments') as File[];
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > 0) {
        const validation = validateFileUpload(file);
        if (!validation.isValid) {
          throw new Error(`File "${file.name}" rejected: ${validation.error}`);
        }
        
        const url = await ContextCardService.uploadFileToSupabase(file);
        if (url) uploadedUrls.push(url);
      }
    }

    // Create the context card
    const contextCard = await prisma.contextCard.create({
      data: {
        title,
        content,
        projectId: project.id,  // Use the actual project ID from validated project
        userId: user.id,
        type,
        visibility,
        status,
        why,
        issues,
        attachments: uploadedUrls,
        assignedToId: assignedToId || undefined,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        project: {
          include: {
            team: {
              select: {
                slug: true
              }
            }
          }
        }
      },
    });

    // Log activity
    await logActivity({
      type: "CARD_CREATED",
      description: `Created ${type.toLowerCase()} card "${title}"`,
      metadata: { cardId: contextCard.id, type, visibility },
      userId: user.id,
      projectId: project.id,
    });

    // Revalidate paths
    if (contextCard.project?.team) {
      revalidatePath(`/team/${contextCard.project.team.slug}/project/${contextCard.project.slug}`);
    }

    return { success: true, card: contextCard };
  } catch (error) {
    console.error('Error creating context card:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create card');
  }
}

// Server Action for updating context cards
export async function updateContextCard(cardId: string, formData: FormData) {
  try {
    const user = await getAuthenticatedUserForAction();

    // Check if user has access to this card
    const existingCard = await findCardWithModifyAccess(cardId, user.id, {
      include: {
        project: {
          include: {
            team: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    });

    if (!existingCard) {
      throw new Error('Card not found or access denied');
    }

    // Extract and sanitize form data
    const title = formData.get('title') ? sanitizeText(formData.get('title') as string) : undefined;
    const content = formData.get('content') ? serverSanitizeHtml(formData.get('content') as string) : undefined;
    const type = formData.get('type') as 'TASK' | 'INSIGHT' | 'DECISION' | undefined;
    const visibility = formData.get('visibility') as 'PRIVATE' | 'PUBLIC' | undefined;
    const status = formData.get('status') as TaskStatus | undefined;
    const why = formData.get('why') ? sanitizeText(formData.get('why') as string) : undefined;
    const issues = formData.get('issues') ? sanitizeText(formData.get('issues') as string) : undefined;
    const assignedToId = formData.get('assignedToId') as string | null;

    // Build update data object
    const updateData: Partial<ContextCard> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (status !== undefined) updateData.status = status;
    if (why !== undefined) updateData.why = why;
    if (issues !== undefined) updateData.issues = issues;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    // Handle file uploads
    const files = formData.getAll('attachments') as File[];
    const existingAttachments = formData.getAll('existingAttachments') as string[];
    const uploadedUrls: string[] = [...existingAttachments];

    for (const file of files) {
      if (file.size > 0) {
        const validation = validateFileUpload(file);
        if (!validation.isValid) {
          throw new Error(`File "${file.name}" rejected: ${validation.error}`);
        }
        
        const url = await ContextCardService.uploadFileToSupabase(file);
        if (url) uploadedUrls.push(url);
      }
    }

    if (files.length > 0 || existingAttachments.length !== existingCard.attachments.length) {
      updateData.attachments = uploadedUrls;
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return { success: true, card: existingCard };
    }

    // Validate updated data
    if (title || content) {
      const validationResult = validateInput(contextCardSchema, {
        title: title || existingCard.title,
        content: content || existingCard.content,
        type: type || existingCard.type,
        visibility: visibility || existingCard.visibility,
        projectId: existingCard.projectId
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.errors?.[0] || 'Invalid input');
      }
    }

    const updatedCard = await prisma.contextCard.update({
      where: { id: cardId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Log activity
    await logActivity({
      type: "CARD_UPDATED",
      description: `Updated card "${updatedCard.title}"`,
      metadata: { cardId: updatedCard.id, changesCount: Object.keys(updateData).length },
      userId: user.id,
      projectId: existingCard.projectId,
    });

    // Revalidate paths
    if (existingCard.project?.team) {
      revalidatePath(`/team/${existingCard.project.team.slug}/project/${existingCard.project.slug}`);
    }

    return { success: true, card: updatedCard };
  } catch (error) {
    console.error('Error updating context card:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update card');
  }
}

// Fallback function when AI is not available
async function createCardWithManualParsing(input: string, projectIdOrSlug: string, user: { id: string }) {
  try {
    // Validate project access first
    const project = await validateProjectAccess(projectIdOrSlug, user.id);

    // Simple heuristic parsing
    const title = input.length > 50 ? input.substring(0, 50) + '...' : input;
    const content = input;
    
    // Determine type based on keywords
    let type: 'TASK' | 'INSIGHT' | 'DECISION' = 'INSIGHT';
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('task') || lowerInput.includes('todo') || lowerInput.includes('implement') || 
        lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('develop') ||
        lowerInput.includes('fix') || lowerInput.includes('update') || lowerInput.includes('add')) {
      type = 'TASK';
    } else if (lowerInput.includes('decision') || lowerInput.includes('choose') || lowerInput.includes('decided') ||
               lowerInput.includes('selected') || lowerInput.includes('approved')) {
      type = 'DECISION';
    }
    
    // Default to public visibility
    const visibility = 'PUBLIC';

    // Create the context card using the parsed data
    const contextCard = await prisma.contextCard.create({
      data: {
        title: sanitizeText(title),
        content: serverSanitizeHtml(content),
        projectId: project.id,  // Use the actual project ID
        userId: user.id,
        type,
        visibility,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        project: {
          include: {
            team: {
              select: {
                slug: true
              }
            }
          }
        }
      },
    });

    // Revalidate cache
    if (contextCard.project?.team) {
      revalidatePath(`/team/${contextCard.project.team.slug}/project/${contextCard.project.slug}`);
    }

    // Create activity record
    await logActivity({
      type: 'CARD_CREATED',
      description: `Created card "${contextCard.title}" (manual parsing fallback)`,
      metadata: { cardId: contextCard.id },
      userId: user.id,
      projectId: project.id,
    });

    return { 
      success: true, 
      card: contextCard,
      fallbackUsed: true // Indicate that manual parsing was used
    };
  } catch (error) {
    console.error('Error creating card with manual parsing:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create card');
  }
}

// Server Action for creating cards with AI (Smart Compose)
export async function createCardWithAI(input: string, projectId: string) {
  try {
    // Get authenticated user for server actions
    const user = await getAuthenticatedUserForAction();

    // Validate project access first
    const project = await validateProjectAccess(projectId, user.id);

    // Parse the input using AI directly
    let parsedCard;
    try {
      parsedCard = await parseInputWithAI(input);
    } catch (aiError) {
      // If AI parsing fails, fall back to manual parsing
      console.log('AI parsing failed, falling back to manual parsing:', aiError);
      return await createCardWithManualParsing(input, project.id, user);
    }

    if (!parsedCard?.title || !parsedCard?.content || !parsedCard?.type || !parsedCard?.visibility) {
      throw new Error('Incomplete card details received from AI');
    }

    // Create the context card using the parsed data
    const contextCard = await prisma.contextCard.create({
      data: {
        title: sanitizeText(parsedCard.title),
        content: serverSanitizeHtml(parsedCard.content),
        projectId: project.id,  // Use the actual project ID from the validated project
        userId: user.id,
        type: parsedCard.type,
        visibility: parsedCard.visibility,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        project: {
          include: {
            team: {
              select: {
                slug: true
              }
            }
          }
        }
      },
    });

    // Log activity
    await logActivity({
      type: "CARD_CREATED",
      description: `Created ${parsedCard.type.toLowerCase()} card "${parsedCard.title}" using AI`,
      metadata: { cardId: contextCard.id, type: parsedCard.type, aiGenerated: true },
      userId: user.id,
      projectId: project.id,
    });

    // Revalidate paths
    if (contextCard.project?.team) {
      revalidatePath(`/team/${contextCard.project.team.slug}/project/${contextCard.project.slug}`);
    }

    return { success: true, card: contextCard };
  } catch (error) {
    console.error('Error creating card with AI:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create card with AI');
  }
}

// Server Action for adding comments
export async function addComment(cardId: string, content: string, parentId?: string) {
  try {
    const user = await getAuthenticatedUserForAction();

    // Validate and sanitize content
    const sanitizedContent = sanitizeText(content.trim());
    if (!sanitizedContent) {
      throw new Error('Comment content is required');
    }

    // Check if user has access to this card
    const card = await prisma.contextCard.findFirst({
      where: {
        id: cardId,
        project: {
          OR: [
            { createdById: user.id },
            { team: { members: { some: { userId: user.id } } } }
          ]
        }
      },
      include: {
        project: {
          include: {
            team: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    });

    if (!card) {
      throw new Error('Card not found or access denied');
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: sanitizedContent,
        cardId,
        authorId: user.id,
        parentId: parentId || undefined,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Log activity
    await logActivity({
      type: "COMMENT_ADDED",
      description: `Added comment to card "${card.title}"`,
      metadata: { cardId, commentId: comment.id, isReply: !!parentId },
      userId: user.id,
      projectId: card.projectId,
    });

    // Revalidate paths
    if (card.project?.team) {
      revalidatePath(`/team/${card.project.team.slug}/project/${card.project.slug}`);
    }

    return { success: true, comment };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to add comment');
  }
}
