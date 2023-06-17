declare module 'uxp' {
    namespace storage {
        interface FileSystemProvider {
            createSessionToken(entry: Entry): string;
        }
    }
    namespace versions {
        const plugin: string;
        const uxp: string;
    }
}