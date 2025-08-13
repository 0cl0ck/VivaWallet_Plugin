import '@payloadcms/next/css';
import React from 'react';
import './custom.scss';
type Args = {
    children: React.ReactNode;
};
declare const Layout: ({ children }: Args) => React.JSX.Element;
export default Layout;
