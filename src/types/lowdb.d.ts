// types/lowdb.d.ts
declare module 'lowdb' {
    import { LowdbSync } from 'lowdb';
    import FileSync from 'lowdb/adapters/FileSync';
  
    export interface LowdbOptions<SchemaType> {
      defaultsJSON?: Partial<SchemaType>;
    }
  
    export default function low<SchemaType = any>(
      adapter: FileSync
    ): LowdbSync<SchemaType>;
  }
  
  declare module 'lowdb/adapters/FileSync' {
    class FileSync {
      constructor(filename: string);
    }
    export = FileSync;
  }