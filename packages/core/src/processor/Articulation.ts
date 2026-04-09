import { RenderCommand } from '../engine/Coordinator';

class Articulation {
  private renderCommand: RenderCommand;

  constructor(renderCommand: RenderCommand) {
    this.renderCommand = renderCommand;
  }
}