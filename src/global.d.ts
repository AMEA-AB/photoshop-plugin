declare module 'uxp' {
    namespace storage {
        interface FileSystemProvider {
            createSessionToken(entry: Entry): string;
        }
    }
}