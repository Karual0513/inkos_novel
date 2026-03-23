import type { Server } from "node:http";
export interface StudioServerOptions {
    readonly publicDir?: string;
    readonly workspaceRoot?: string;
    readonly cliEntry?: string;
}
export declare function createStudioServer(options?: StudioServerOptions): Server;
export declare function startStudioServer(server?: Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>): Promise<Server>;
//# sourceMappingURL=server.d.ts.map