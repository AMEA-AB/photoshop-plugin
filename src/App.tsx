// App imports
import React from 'react';
import Spectrum from 'react-uxp-spectrum';

import { storage } from 'uxp';
import { core } from 'photoshop';

import './App.css';
import AmeaService from '@services/amea-service';
import type { Document } from 'photoshop/dom/Document';
import GenerateInputs from '@components/GenerateInputs';

type OutputType = keyof Document['saveAs'];

export default function App() {
    const [rows, setRows] = React.useState<DataRow[] | undefined>(undefined);
    const [outputFolder, setOutputFolder] = React.useState<storage.Folder | undefined>(undefined);
    const [templatesFolder, setTemplatesFolder] = React.useState<storage.Folder | undefined>(undefined);
    const [outputType, setOutputType] = React.useState<OutputType>('png');

    const handleGenerate = () => core.executeAsModal(async (executionContext) => {
        const templates = rows.map((row) => row.Template).filter((value, index, self) => self.indexOf(value) === index);

        if (!templatesFolder) {
            for (const [index, template] of templates.entries()) {
                executionContext.reportProgress({value: index / templates.length, commandName: 'Downloading templates'});
                await AmeaService.downloadTemplateFile(template);
                console.log('Template downloaded', templatesFolder);
            }
        }
        const tempFolder = await storage.localFileSystem.getTemporaryFolder();
        let proccessedRows = 0;
        for (const [index, row] of AmeaService.mapFilenames(rows).entries()) {
            executionContext.reportProgress({value: index / rows.length, commandName: `Generating image for ${row['Order number']}`});
            try {
                await AmeaService.generateImageFromRow(row, templatesFolder ?? tempFolder, outputFolder, row.filename, outputType);
                proccessedRows += 1;
            } catch (error) {
                console.error(error);
                await core.showAlert({ message: `Error while processing ${row['Order number']}` });
            }
        }
        executionContext.reportProgress({value: 1});
        await core.showAlert({ message: `${proccessedRows} row${proccessedRows > 1 ? 's have' : ' has'}  been processed` });
    }, {commandName: 'Generate templates'});

    return (
        <div className="panel">
            <Spectrum.Heading size="M">Generate templates</Spectrum.Heading>
            <Spectrum.Detail>Generate images from templates based on data from a xlsx-file</Spectrum.Detail>
            <Spectrum.Divider size="medium" />
            <Spectrum.Body>
                <GenerateInputs
                    rows={rows}
                    outputFolder={outputFolder}
                    onRowsChange={(rows) => setRows(rows)}
                    onOutputFolderChange={(folder) => setOutputFolder(folder)}
                    onOutputTypeChange={(type) => setOutputType(type)}
                    onTemplatesFolderChange={(folder) => setTemplatesFolder(folder)}
                />
            </Spectrum.Body>
            <footer>
                <Spectrum.Button variant="cta" disabled={!rows || !outputFolder} onClick={() => handleGenerate()}>
                    Generate
                </Spectrum.Button>
            </footer>
        </div>
    );
}
