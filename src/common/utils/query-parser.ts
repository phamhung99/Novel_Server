export function parseSort(
    sortStr: string | undefined,
    allowedFields?: string[],
): Record<string, 'ASC' | 'DESC'> {
    const defaultOrder: Record<string, 'ASC' | 'DESC'> = {
        'story.createdAt': 'DESC',
    };

    if (!sortStr || sortStr.trim() === '') {
        return defaultOrder;
    }

    const order: Record<string, 'ASC' | 'DESC'> = {};

    const parts = sortStr.split(',').map((p) => p.trim());

    for (const part of parts) {
        let field = part;
        let direction: 'ASC' | 'DESC' = 'ASC';

        if (field.startsWith('-')) {
            field = field.slice(1).trim();
            direction = 'DESC';
        } else if (field.includes(':')) {
            const [f, dir] = field.split(':');
            field = f.trim();
            const dirUpper = dir?.trim().toUpperCase();
            direction = dirUpper === 'DESC' ? 'DESC' : 'ASC';
        }

        if (allowedFields && !allowedFields.includes(field)) {
            continue;
        }

        order[`story.${field}`] = direction;
    }

    return Object.keys(order).length > 0 ? order : defaultOrder;
}
