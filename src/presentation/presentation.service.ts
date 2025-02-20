import { Injectable } from '@nestjs/common';
import { promises } from 'fs';
import * as path from 'path';

@Injectable()
export class PresentationService {
  public async getPresentationTemplate(): Promise<string> {
    return await this.getHtmlAsString();
  }

  private async getHtmlAsString(): Promise<string> {
    const filePath = path.join(__dirname, '..', '/assets/templates/index.html');
    try {
      return await promises.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`error reading file: ${error}`);
    }
  }
}
