export declare const POST: (request: Request) => Promise<Response>;
export declare const OPTIONS: (request: Request, args: {
    params: Promise<{
        slug: string[];
    }>;
}) => Promise<Response>;
