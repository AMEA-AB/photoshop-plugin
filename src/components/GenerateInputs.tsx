// App imports
import { storage } from 'uxp';
import * as xlsx from 'xlsx';
import React from 'react';
import Spectrum from 'react-uxp-spectrum';
import type { Document } from 'photoshop/dom/Document';

type OutputType = keyof Document['saveAs'];

interface Props {
    rows: DataRow[];
    outputFolder: storage.Folder;
    onRowsChange: (rows: DataRow[]) => unknown;
    onOutputTypeChange: (outputType: OutputType) => unknown;
    onOutputFolderChange: (folder: storage.Folder) => unknown;
    onTemplatesFolderChange: (folder: storage.Folder) => unknown;
}

export default function GenerateInputs({ rows, outputFolder, onRowsChange, onOutputTypeChange, onOutputFolderChange, onTemplatesFolderChange }: Props) {

    const handleSelectInputFile = async () => {
        const file = await storage.localFileSystem.getFileForOpening({ types: ['xlsx'], allowMultiple: false });
        if (!file || Array.isArray(file)) {
            return;
        }
        const data = await file.read({ format: storage.formats.binary });
        const workbook = xlsx.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = (xlsx.utils.sheet_to_json(worksheet) as DataRow[]).filter((row) => row.Template);
        onRowsChange(rows);
    };

    const handleSelectOutputFolder = async () => {
        const folder = await storage.localFileSystem.getFolder({ initialDomain: storage.domains.userDesktop });
        if (!folder) {
            return;
        }
        onOutputFolderChange(folder);
    };

    const handleSelectTemplatesFolder = async () => {
        const folder = await storage.localFileSystem.getFolder({ initialDomain: storage.domains.userDesktop });
        if (!folder) return;
        onTemplatesFolderChange(folder);
    };

    return (
        <>
            <div className="button-container">
                <Spectrum.Button variant={rows ? 'primary' : 'warning'} onClick={() => handleSelectInputFile()}>
                    Select input (xlsx-file)
                </Spectrum.Button>
            </div>
            <div className="button-container">
                <Spectrum.Button variant={outputFolder ? 'primary' : 'warning'} onClick={() => handleSelectOutputFolder()}>
                    Select output folder
                </Spectrum.Button>
            </div>
            <div className="button-container">
                <Spectrum.Button variant="secondary" onClick={() => handleSelectTemplatesFolder()}>
                    Select local templates folder
                </Spectrum.Button>
                <Spectrum.Detail>
                    Select a local folder if you don&apos;t want to use templates in the cloud.
                </Spectrum.Detail>
            </div>
            <Spectrum.RadioGroup onChange={(e) => onOutputTypeChange(e.target.value as 'png' | 'psd')}>
                <Spectrum.Label slot="label">Output filetype</Spectrum.Label>
                <Spectrum.Radio checked value="png">
                    PNG
                </Spectrum.Radio>
                <Spectrum.Radio value="psd">PSD</Spectrum.Radio>
            </Spectrum.RadioGroup>
        </>
    );
}
