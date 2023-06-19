import { storage } from 'uxp';
import { app, constants } from 'photoshop';

import DownloadService from '@services/download-service';
import PhotoshopService from '@services/photoshop-service';
import { replaceAllInString } from '@helpers';

import type { Document } from 'photoshop/dom/Document';

type OutputType = keyof Document['saveAs'];

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
      while (filenames.includes(filename)) {
        filename = `${this.generateFilename(row)} ${i}`;
        i++;
      }
      filenames.push(filename);
      return { ...row, filename };
    });
  }

  private static async populateDocumentFromRow(row: DataRow) {
    const layers = app.activeDocument.layers.filter((layer) => !layer.pixelsLocked);
    for(const layer of layers){
      if(layer.allLocked || !layer.visible) continue;
      const data = row[layer.name];
      console.log(data, layer);
      if(!data || data === '') {
        await PhotoshopService.hideLayer(layer, true);
      } else {
        if (layer.kind === constants.LayerKind.TEXT) {
          await PhotoshopService.setText(layer, data);
        } else if (layer.kind === constants.LayerKind.SMARTOBJECT) {
          const fileURL = data;
          const filenameRegex = /.*\/(.*)/g;
          const filename = filenameRegex.exec(fileURL)[1];
          const file = await DownloadService.getFileFromWeb(fileURL, filename);
          await PhotoshopService.setImage(layer, file);
        }
      }
    }
  }

  private static async addEffectsToDocumentFromRow(row: DataRow) {
    // Invert colors
    const invert = row['Invert'] === 'true';
    for (const layer of app.activeDocument.layers) {
      await PhotoshopService.invertLayer(layer, invert);
    }

    // Mirror document
    const mirror = row['Mirror'] === 'true';
    if (mirror) {
      await PhotoshopService.mirrorDocument(app.activeDocument);
    }
  }

  private static async exportDocument(outputFolder: storage.Folder, filename: string, outputType: OutputType = 'png') {
    const outputFile = await outputFolder.createFile(filename, { overwrite: true });
    await app.activeDocument.saveAs[outputType](outputFile as unknown as File);
  }

  public static async generateImageFromRow(row: DataRow, templatesFolder: storage.Folder, outputFolder: storage.Folder, filename: string, outputType: OutputType = 'png') {
    const templateFile = await templatesFolder.getEntry(row.Template) as storage.File;
    await PhotoshopService.openPhotoshopFile(templateFile);
    await this.populateDocumentFromRow(row);
    await this.addEffectsToDocumentFromRow(row);
    await this.exportDocument(outputFolder, filename, outputType);
    await PhotoshopService.closeDocument();
  }
}

export default AmeaService;
