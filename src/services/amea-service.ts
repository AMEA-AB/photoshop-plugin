import { storage } from 'uxp';
import DownloadService from '@services/download-service';

class AmeaService {
  static async downloadTemplateFile(templateName: string, outputFolder: storage.Folder) {
    const encodedTemplateName = encodeURIComponent(templateName);
    const templateFileURL = `${process.env.TEMPLATES_FOLDER_URL}/${encodedTemplateName}`;
    const file = await DownloadService.getFileFromWeb(templateFileURL, templateName);
    return file;
  }
}

export default AmeaService;
