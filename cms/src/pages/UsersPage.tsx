import { Box, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { fetchUsers, type User } from '../api/userApi';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [rowCount, setRowCount] = useState(0);

    const loadUsers = async ({
        page,
        pageSize,
        field,
        sort,
    }: {
        page: number;
        pageSize: number;
        field?: string;
        sort?: 'asc' | 'desc';
    }) => {
        try {
            setLoading(true);
            const { users, total } = await fetchUsers({
                page: page + 1,
                pageSize,
                field,
                sort,
            });
            console.log({ users });

            setUsers(users);
            setRowCount(total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers({ page, pageSize });
    }, [page, pageSize]);

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', flex: 1 },
        { field: 'username', headerName: 'Username', flex: 1 },
        { field: 'country', headerName: 'Country', flex: 1 },
        { field: 'ipCountryCode', headerName: 'IP Code', flex: 1 },
        {
            field: 'profileImage',
            headerName: 'Avatar',
            flex: 1,
            renderCell: (params) => (
                <img
                    src={params.value || '/default-avatar.png'}
                    alt="avatar"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        objectFit: 'cover',
                    }}
                />
            ),
        },
        {
            field: 'active',
            headerName: 'Active',
            flex: 1,
            renderCell: (params) => (params.value ? '✅' : '❌'),
        },
        {
            field: 'createdAt',
            headerName: 'Created At',
            flex: 2,
            valueGetter: (params) => new Date(params).toLocaleString(),
        },
        {
            field: 'updatedAt',
            headerName: 'Updated At',
            flex: 2,
            valueGetter: (params) => new Date(params).toLocaleString(),
        },
    ];

    if (error)
        return (
            <Box p={2}>
                <Typography color="error">Error: {error}</Typography>
            </Box>
        );

    return (
        <Box p={2} sx={{ maxWidth: '1200px', overflowX: 'auto' }}>
            <Typography variant="h5" mb={2} fontWeight={600}>
                Users
            </Typography>
            <Box sx={{ height: 600, minWidth: 800 }}>
                <DataGrid
                    rows={users}
                    getRowId={(row) => row.id}
                    columns={columns}
                    rowCount={rowCount}
                    paginationModel={{ pageSize, page }}
                    onPaginationModelChange={(newModel) => {
                        setPage(newModel.page);
                        setPageSize(newModel.pageSize);
                    }}
                    onSortModelChange={(sortModel) => {
                        if (sortModel.length) {
                            const { field, sort } = sortModel[0];
                            console.log({
                                field,
                                sort,
                            });

                            loadUsers({
                                page,
                                pageSize,
                                field,
                                sort: sort || undefined,
                            });
                        }
                    }}
                    paginationMode="server"
                    sortingMode="server"
                    pageSizeOptions={[10, 20, 50, 100]}
                    loading={loading}
                    disableRowSelectionOnClick
                />
            </Box>
        </Box>
    );
}
