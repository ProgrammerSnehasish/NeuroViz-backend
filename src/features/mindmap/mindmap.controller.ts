import { CreateMindmapDto, UpdateMindmapDto } from "./mindmap.dto";
import { MindmapService } from "./mindmap.service";

export class MindmapController {
  private mindmapService: MindmapService;

  constructor() {
    this.mindmapService = new MindmapService();
  }

  public async createMindmap(data: CreateMindmapDto) {
    return await this.mindmapService.createMindmap(data);
  }

  public async getMindmapsByUser(userId: string) {
    return await this.mindmapService.getMindmapsByUser(userId);
  }

  public async getMindmapById(mindmapId: string) {
    return await this.mindmapService.getMindmapById(mindmapId);
  }

  public async updateMindmap(data: UpdateMindmapDto, mindmapId: string, userId: string) {
    return await this.mindmapService.updateMindmap(data, mindmapId, userId);
  }

  public async deleteMindmap(mindmapId: string, userId: string) {
    return await this.mindmapService.deleteMindmap(mindmapId, userId);
  }
}
