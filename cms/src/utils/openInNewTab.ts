export const openInNewTab = (url: string) => {
    const absoluteUrl = url.startsWith('http')
        ? url
        : `${window.location.origin}${url}`;
    window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
};
