export interface QueryOptions<T> {
    filter?: Record<string, any>;
    sort?: string;
    fields?: (keyof T)[];
    page?: number;
    limit?: number;
    search?: { field: keyof T; value: string };
}

export function parseQueryOptions<T>(
    query: {
        filter?: string;
        sort?: string;
        fields?: string;
        page?: number;
        limit?: number;
        searchField?: string;
        searchValue?: string;
    },
    validKeys: (keyof T)[],
): QueryOptions<T> {
    const filterObj = query.filter ? JSON.parse(query.filter) : undefined;
    const fieldsArr = query.fields
        ? (query.fields
              .split(',')
              .map((f) => f.trim())
              .filter((f) => validKeys.includes(f as keyof T)) as (keyof T)[])
        : validKeys;
    const search =
        query.searchField && query.searchValue
            ? { field: query.searchField as keyof T, value: query.searchValue }
            : undefined;

    return {
        filter: filterObj,
        sort: query.sort,
        fields: fieldsArr,
        page: query.page,
        limit: query.limit,
        search,
    };
}
