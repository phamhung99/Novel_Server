export function extractContentPart(
    content: string,
    removeRegex: string,
    titles: string[],
    otherPartTitles: string[],
): string {
    content = content.replace(new RegExp(removeRegex, 'g'), '');

    const titleIndices = titles
        .map((title) => content.indexOf(title))
        .filter((index) => index >= 0);

    const titleIndex = titleIndices.length > 0 ? Math.max(...titleIndices) : -1;

    const otherPartIndices = otherPartTitles
        .map((title) => content.indexOf(title))
        .filter((index) => titleIndex < index);

    const endIndex =
        otherPartIndices.length > 0
            ? Math.min(...otherPartIndices)
            : content.length;

    if (titleIndex === -1) return '';

    let contentPart = content.substring(titleIndex, endIndex);

    for (const title of titles) {
        contentPart = contentPart.replace(title, '');
    }

    return contentPart.trim();
}

export function extractComicScript(
    content: string,
    removeRegex: string,
    titles: string[],
    otherPartTitles: string[],
): string[] {
    const script = extractContentPart(
        content,
        removeRegex,
        titles,
        otherPartTitles,
    );

    return script
        .split(/Scene \d+/)
        .map((scene) => scene.trim())
        .filter((scene) => isCleanedStringNotBlank(scene));
}

export function isCleanedStringNotBlank(str: string): boolean {
    const cleaned = str.replace(/["#$%&*:;>=<^~+-]/g, '');
    return cleaned.trim().length > 0;
}

export function boldScript(scenes: string[]): string[] {
    return scenes
        .filter((scene) => scene.trim().length > 0)
        .map((scene) =>
            scene
                .split('\n')
                .filter((line) => isCleanedStringNotBlank(line))
                .map((line) => boldSceneLine(line))
                .join('<br>'),
        );
}

export function boldSceneLine(line: string): string {
    if (line.includes(':')) {
        const index = line.indexOf(':');
        const boldedText = line.substring(0, index + 1).trim();
        const remainingText = line.substring(index + 1).trim();
        return `<b>${boldedText}</b> ${remainingText}`;
    } else {
        return `<b>${line}</b>`;
    }
}
