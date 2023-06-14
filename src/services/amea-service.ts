import { storage } from 'uxp';
import DownloadService from './download-service';

class AmeaService {

    async getTemplateFile(templateName: string, templatesFolder?: storage.Folder) {
        let file: storage.File | undefined;
        if (templatesFolder) {
            file = await templatesFolder.getEntry(templateName) as storage.File;
        } else {
            const encodedTemplateName = encodeURIComponent(templateName);
            const templateFileURL = `${process.env.TEMPLATES_FOLDER_URL}/${encodedTemplateName}`;
            file = await DownloadService.getFileFromWeb(templateFileURL, templateName)
        }
        if (!file || !file.isFile) throw Error(`Could not find template '${templateName}'`);
        return file;
    }
}

export default new AmeaService();