import DownloadService from '@services/download-service';
import { replaceAllInString } from '@helpers';

class AmeaService {
  public static async downloadTemplateFile(templateName: string) {
    const encodedTemplateName = encodeURIComponent(templateName);
    const templateFileURL = `${process.env.TEMPLATES_FOLDER_URL}/${encodedTemplateName}`;
    const file = await DownloadService.getFileFromWeb(templateFileURL, templateName);
    return file;
  }

  private static generateFilename(row: DataRow) {
    const order_number = replaceAllInString(row['Order number'], '#', '');
    const product = replaceAllInString(replaceAllInString(row['Product'], '*', '-'), '/', '-');
    const filename = `${order_number} - ${product}`;
    return filename;
  }

  public static mapFilenames(rows: DataRow[]) {
    const filenames: string[] = [];
    return rows.map((row) => {
      let filename = this.generateFilename(row);
      let i = 2;
      while(filenames.includes(filename)) {
        filename = `${this.generateFilename(row)} ${i}`;
        i++;
      }
      filenames.push(filename);
      return {...row, filename};
    });
  }
}

export default AmeaService;
