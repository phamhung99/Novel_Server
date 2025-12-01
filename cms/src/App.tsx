import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import StoryUploadPage from './pages/StoryUploadPage';
import StoryPreviewPage from './pages/StoryPreviewPage';
import ChapterGeneratorPage from './pages/ChapterGeneratorPage';
import ManageStories from './pages/ManageStoriesPage';
import StoryDetailPage from './pages/StoryDetailPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Navigate to="/dashboard/users" replace />}
                />
                <Route path="/dashboard" element={<Dashboard />}>
                    <Route path="users" element={<UsersPage />} />
                    <Route
                        path="stories/upload"
                        element={<StoryUploadPage />}
                    />
                    <Route
                        path="stories/preview"
                        element={<StoryPreviewPage />}
                    />
                    <Route
                        path="chapter-generator"
                        element={<ChapterGeneratorPage />}
                    />
                    <Route path="stories/manage" element={<ManageStories />} />
                    <Route
                        path="stories/:storyId"
                        element={<StoryDetailPage />}
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
