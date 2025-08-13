import '@payloadcms/next/css';
export declare const GET: (request: Request, args: {
    params: Promise<{
        slug: string[];
    }>;
}) => Promise<Response>;
export declare const POST: (request: Request, args: {
    params: Promise<{
        slug: string[];
    }>;
}) => Promise<Response>;
export declare const DELETE: (request: Request, args: {
    params: Promise<{
        slug: string[];
    }>;
}) => Promise<Response>;
export declare const PATCH: (request: Request, args: {
    params: Promise<{
        slug: string[];
    }>;
}) => Promise<Response>;
export declare const PUT: (request: Request, args: {
    params: Promise<{
        slug: string[];
    }>;
}) => Promise<Response>;
export declare const OPTIONS: (request: Request, args: {
    params: Promise<{
        slug: string[];
    }>;
}) => Promise<Response>;
