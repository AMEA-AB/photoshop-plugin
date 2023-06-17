import { storage } from 'uxp';

class DownloadService {
  private static async fetchBuffer(url: string) {
    const response = await fetch(url);
    if (response.status !== 200) throw Error(`Could not download file from ${url}`);
    return response.arrayBuffer();
  }

  public static async getFileFromWeb(url: string, filename: string) {
    const tempFolder = await storage.localFileSystem.getTemporaryFolder();
    const file = await tempFolder.createFile(filename, { overwrite: true });
    console.log('Downloading file', url);
    const buffer = await this.fetchBuffer(url);
    file.write(buffer, { format: storage.formats.utf8 });
    return file;
  }
}

export default DownloadService;
