import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { CreateMindmapDto, GenerateMindmapDto, UpdateMindmapDto } from "../mindmap.dto";
import { generateMindmap } from "./mindmap.ai.service";
import { NLPService } from "../../nlp/nlp.service";

export class MindmapService {

  private async validateUserAccess(dtoUserId: string, tokenUserId: string) {
    if (dtoUserId !== tokenUserId) {
      await prisma.activityLog.create({
        data: {
          userId: tokenUserId,
          action: "UNAUTHORIZED_OPERATION_ATTEMPT",
          details: `Token user ${tokenUserId} tried to perform action as ${dtoUserId}`,
        },
      });

      throw createHttpError(403, "Unauthorized: User token mismatch.");
    }

    const user = await prisma.user.findUnique({ where: { id: dtoUserId } });
    if (!user) throw createHttpError(404, "User not found");
    return user;
  }

  async createFromText(dto: GenerateMindmapDto, tokenUserId: string) {
    await this.validateUserAccess(dto.userId, tokenUserId);

    // Run both simultaneously
    const structure = await generateMindmap(dto.sourceText);

    let rawDescription: any = {
      summary: dto.sourceText.slice(0, 300)
    };

    try {
      rawDescription = await Promise.race([
        NLPService.summarize(dto.sourceText),
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                summary: dto.sourceText.slice(0, 300)
              }),
            5000
          )
        )
      ]);
    } catch { }

    const derivedTitle = (structure as any)?.topic ?? dto.sourceText.split(/\s+/).slice(0, 5).join(" ");

    const deriveDescription = typeof rawDescription === "object"
      ? (rawDescription as any).summary ?? ""
      : rawDescription;

    const saved = await prisma.mindmap.create({
      data: {
        title: derivedTitle,
        description: dto.description
          ? (typeof dto.description === "string"
            ? dto.description
            : JSON.stringify(dto.description))
          : deriveDescription ?? "",
        structure: structure as any,
        userId: dto.userId,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: dto.userId,
        action: "CREATE_MINDMAP",
        details: `Mindmap '${derivedTitle}' created from text by user '${dto.userId}'.`,
      },
    });

    return saved;
  }

  // ✏️ Create a raw mindmap manually (client provides structure)
  async createRaw(dto: CreateMindmapDto, tokenUserId: string) {
    await this.validateUserAccess(dto.userId, tokenUserId);
    const mindmap = await prisma.mindmap.create({
      data: {
        title: dto.title,
        description: dto.description ?? "",
        structure: dto.structure as any,
        userId: dto.userId,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: dto.userId,
        action: "MINDMAP_CREATED_MANUAL",
        details: `Manual mindmap "${dto.title}" created for user ${dto.userId}`,
      },
    });

    return mindmap;
  }

  async getMindmapsByUser(userId: string, tokenUserId: string) {
    await this.validateUserAccess(userId, tokenUserId);
    const mindmaps = await prisma.mindmap.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: "MINDMAP_LIST_VIEWED",
        details: `User ${userId} fetched their list of mindmaps`,
      },
    });

    return mindmaps;
  }

  async getMindmapById(mindmapId: string, tokenUserId: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");

    await this.validateUserAccess(mindmap.userId, tokenUserId);

    await prisma.activityLog.create({
      data: {
        userId: mindmap.userId,
        action: "MINDMAP_VIEWED",
        details: `Mindmap "${mindmap.title}" viewed (ID: ${mindmapId})`,
      },
    });

    return mindmap;
  }

  async updateMindmap(data: UpdateMindmapDto, mindmapId: string, userId?: string, tokenUserId?: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");

    await this.validateUserAccess(mindmap.userId, tokenUserId || userId || "");

    if (userId && mindmap.userId !== userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "MINDMAP_UPDATE_UNAUTHORIZED",
          details: `User ${userId} attempted to update mindmap ${mindmapId}`,
        },
      });

      throw createHttpError(403, "You are not authorized to update this mindmap.");
    }

    const updateData: Record<string, any> = {};
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.structure) updateData.structure = data.structure;

    if (Object.keys(updateData).length === 0) {
      throw createHttpError(400, "Please provide at least one field to update.");
    }

    const updated = await prisma.mindmap.update({
      where: { id: mindmapId },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        userId: mindmap.userId,
        action: "MINDMAP_UPDATED",
        details: `Mindmap "${updated.title}" (ID: ${mindmapId}) updated.`,
      },
    });

    return updated;
  }

  async deleteMindmap(mindmapId: string, userId: string, tokenUserId: string): Promise<void> {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");

    await this.validateUserAccess(mindmap.userId, tokenUserId || userId || "");

    if (mindmap.userId !== userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "MINDMAP_DELETE_UNAUTHORIZED",
          details: `User ${userId} tried deleting mindmap ${mindmapId}`,
        },
      });

      throw createHttpError(403, "Not authorized to delete this mindmap.");
    }

    await prisma.mindmap.delete({ where: { id: mindmapId } });

    await prisma.activityLog.create({
      data: {
        userId,
        action: "MINDMAP_DELETED",
        details: `User ${userId} deleted mindmap ${mindmapId}`,
      },
    });
  }
}