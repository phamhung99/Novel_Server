export function cleanNextOptions(
    rawOptions: unknown[] | undefined | null,
): { label: string; description: string | null }[] {
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
        return [];
    }

    return rawOptions
        .filter((opt): opt is Record<string, unknown> => {
            return (
                opt != null && typeof opt === 'object' && !Array.isArray(opt)
            );
        })
        .map((opt) => {
            const labelRaw = opt.label;

            const descriptionRaw = opt.description;

            const label =
                typeof labelRaw === 'string' && labelRaw.trim() !== ''
                    ? labelRaw.trim()
                    : null;

            const description =
                typeof descriptionRaw === 'string' &&
                descriptionRaw.trim() !== ''
                    ? descriptionRaw.trim()
                    : null;

            if (label === null) {
                return null;
            }

            return {
                label,
                description,
            };
        })
        .filter(
            (item): item is { label: string; description: string | null } =>
                item !== null,
        );
}
