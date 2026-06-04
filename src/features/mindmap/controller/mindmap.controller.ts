import { CreateMindmapDto, UpdateMindmapDto, GenerateMindmapDto } from "../mindmap.dto";
import { MindmapService } from "../service/mindmap.service";

export class MindmapController {
  private mindmapService: MindmapService;

  constructor() {
    this.mindmapService = new MindmapService();
  }

  // Create a mindmap directly from provided JSON structure
  public async createMindmap(data: CreateMindmapDto, tokenUserId: string) {
    return await this.mindmapService.createRaw(data, tokenUserId);
  }

  // Create a mindmap from plain text (AI auto-derives title & structure)
  public async createMindmapFromText(data: GenerateMindmapDto, tokenUserId: string) {
    return await this.mindmapService.createFromText(data, tokenUserId);
  }

  // Get all mindmaps for a given user
  public async getMindmapsByUser(userId: string, tokenUserId: string) {
    return await this.mindmapService.getMindmapsByUser(userId, tokenUserId);
  }

  // Get a single mindmap by its ID
  public async getMindmapById(mindmapId: string, tokenUserId: string) {
    return await this.mindmapService.getMindmapById(mindmapId, tokenUserId);
  }

  // Update a mindmap
  public async updateMindmap(data: UpdateMindmapDto, mindmapId: string, userId: string, tokenUserId: string) {
    return await this.mindmapService.updateMindmap(data, mindmapId, userId, tokenUserId);
  }

  // Delete a mindmap
  public async deleteMindmap(mindmapId: string, userId: string, tokenUserId: string) {
    return await this.mindmapService.deleteMindmap(mindmapId, userId, tokenUserId);
  }
}
