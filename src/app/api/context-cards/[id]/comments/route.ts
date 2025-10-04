import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { getAblyServer } from "@/lib/ably/ably";
import { findUserAccessibleCard } from '@/queries/card-queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    
    const { id: cardId } = await params;

    if (!cardId || typeof cardId !== "string") {
      return NextResponse.json({ error: "Invalid or missing card ID" }, { status: 400 });
    }

    // Parse pagination params
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "10");
    const cursor = searchParams.get("cursor");

    // Ensure the context card exists and user has access to it
    const card = await findUserAccessibleCard(cardId, user.id);

    if (!card) {
      return NextResponse.json({ error: "Context card not found or access denied" }, { status: 404 });
    }

    // Fetch comments with author info, paginated
    const comments = await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return NextResponse.json({ comments, nextCursor });
  } catch (error) {
    console.error("❌ Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    
    const { id: cardId } = await params;
    const { content } = await req.json();

    if (!cardId || typeof cardId !== "string" || !content?.trim()) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Ensure card exists and user has access to it
    const card = await findUserAccessibleCard(cardId, user.id, {
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Context card not found or access denied" }, { status: 404 });
    }

    // Create comment
    const newComment = await prisma.comment.create({
      data: {
        content: content.trim(),
        cardId,
        authorId: user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Log comment activity
    await logActivity({
      type: "COMMENT_CREATED",
      description: `Added a comment to card`,
      metadata: { cardId, commentId: newComment.id },
      userId: user.id,
      projectId: card.project.id,
    });

    const ably = getAblyServer();
    
    // Publish to card-specific channel for real-time comments
    await ably.channels.get(`card:${cardId}:comments`).publish("comment:created", {
      id: newComment.id,
      content: newComment.content,
      createdAt: newComment.createdAt,
      author: newComment.author,
    });

    // Publish to project activity feed
    await ably.channels.get(`project:${card.project.id}`).publish("activity:created", {
      id: Date.now(), // temporary ID for real-time display
      type: "COMMENT_CREATED",
      description: `Added a comment to card`,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
      createdAt: new Date().toISOString(),
      projectId: card.project.id,
      metadata: { cardId, commentId: newComment.id },
    });

    return NextResponse.json({ comment: newComment });
  } catch (error) {
    console.error("❌ Error creating comment:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}