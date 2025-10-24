import { CreateMindmapDto, UpdateMindmapDto, GenerateMindmapDto } from "./mindmap.dto";
import { MindmapService } from "./mindmap.service";

export class MindmapController {
  private mindmapService: MindmapService;

  constructor() {
    this.mindmapService = new MindmapService();
  }

  // 🧠 Create a mindmap directly from provided JSON structure
  public async createMindmap(data: CreateMindmapDto) {
    return await this.mindmapService.createRaw(data);
  }

  // 🤖 Create a mindmap from plain text (AI-generated structure)
  public async createMindmapFromText(data: GenerateMindmapDto) {
    return await this.mindmapService.createFromText(data);
  }

  // 📋 Get all mindmaps for a given user
  public async getMindmapsByUser(userId: string) {
    return await this.mindmapService.getMindmapsByUser(userId);
  }

  // 🔍 Get a single mindmap by its ID
  public async getMindmapById(mindmapId: string) {
    return await this.mindmapService.getMindmapById(mindmapId);
  }

  // 🛠 Update a mindmap
  public async updateMindmap(data: UpdateMindmapDto, mindmapId: string, userId: string) {
    return await this.mindmapService.updateMindmap(data, mindmapId, userId);
  }

  // 🗑 Delete a mindmap
  public async deleteMindmap(mindmapId: string, userId: string) {
    return await this.mindmapService.deleteMindmap(mindmapId, userId);
  }
}
