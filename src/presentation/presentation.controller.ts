import { Controller, Get, Header } from '@nestjs/common';
import { PresentationService } from './presentation.service';

@Controller('')
export class PresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  @Get()
  @Header('content-type', 'text/html')
  public async getPresentation(): Promise<string> {
    return this.presentationService?.getPresentationTemplate();
  }
}
