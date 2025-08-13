export const importMap: {
    'viva-wallet-plugin/client#BeforeDashboardClient': () => import("react").JSX.Element;
    'viva-wallet-plugin/rsc#BeforeDashboardServer': (props: import("payload").ServerComponentProps) => Promise<import("react").JSX.Element>;
};
