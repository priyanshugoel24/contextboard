import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAblyServer, CHANNELS, type AblyStatusData } from "@/lib/ably/ably";
import { getAuthenticatedUser } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    const status = await prisma.status.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ status: status || { state: "Available" } });
  } catch (error) {
    if (error instanceof Error && error.message === 'No authenticated user found') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    const { state } = await req.json();

    if (!state || typeof state !== "string") {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const updated = await prisma.status.upsert({
      where: { userId: user.id },
      update: { state },
      create: {
        state,
        userId: user.id,
      },
    });

    // Publish status update to Ably
    try {
      const ably = getAblyServer();
      const channel = ably.channels.get(CHANNELS.STATUS_UPDATES);
      
      const statusData: AblyStatusData = {
        userId: user.id,
        status: state,
        timestamp: new Date().toISOString(),
      };

      await channel.publish('status-update', statusData);
      console.log("📡 Published status update to Ably:", statusData);
    } catch (ablyError) {
      console.error("❌ Failed to publish status to Ably:", ablyError);
      // Don't fail the entire request if Ably publish fails
    }

    return NextResponse.json({ status: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'No authenticated user found') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}