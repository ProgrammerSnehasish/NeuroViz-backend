import createHttpError from "http-errors";
import prisma from "../../config/database";
import { CreateMindmapDto, UpdateMindmapDto } from "./mindmap.dto";

export class MindmapService {
  async createMindmap(data: CreateMindmapDto) {
    const { title, description, structure, userId } = data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found.");

    return await prisma.mindmap.create({
      data: { title, description, structure, userId },
    });
  }

  async getMindmapsByUser(userId: string) {
    const mindmaps = await prisma.mindmap.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return mindmaps;
  }

  async getMindmapById(mindmapId: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");
    return mindmap;
  }

  async updateMindmap(data: UpdateMindmapDto, mindmapId: string, userId: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");
    if (mindmap.userId !== userId) throw createHttpError(403, "Not authorized to update this mindmap.");

    const updateData: Record<string, any> = {};

    if (data.title) updateData["title"] = data.title;
    if (data.description) updateData["description"] = data.description;
    if (data.structure) updateData["structure"] = data.structure;

    if (Object.keys(updateData).length === 0)
      throw createHttpError(400, "Provide some data to update mindmap.");

    return await prisma.mindmap.update({
      where: { id: mindmapId },
      data: updateData,
    });
  }

  async deleteMindmap(mindmapId: string, userId: string): Promise<void> {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");
    if (mindmap.userId !== userId)
      throw createHttpError(403, "Not authorized to delete this mindmap.");

    await prisma.mindmap.delete({ where: { id: mindmapId } });
  }
}
