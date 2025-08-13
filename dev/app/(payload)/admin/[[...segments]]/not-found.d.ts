import type { Metadata } from 'next';
type Args = {
    params: Promise<{
        segments: string[];
    }>;
    searchParams: Promise<{
        [key: string]: string | string[];
    }>;
};
export declare const generateMetadata: ({ params, searchParams }: Args) => Promise<Metadata>;
declare const NotFound: ({ params, searchParams }: Args) => Promise<import("react").JSX.Element>;
export default NotFound;
