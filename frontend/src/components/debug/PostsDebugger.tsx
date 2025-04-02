
import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { Post } from '../../types/forum';

interface PostsDebuggerProps {
  posts: Post[];
  category: string;
  loading: boolean;
  error: string | null;
}

const PostsDebugger: React.FC<PostsDebuggerProps> = ({ posts, category, loading, error }) => {
  return (
    <Paper 
      sx={{ 
        padding: 2, 
        margin: 2, 
        backgroundColor: '#f5f5f5', 
        border: '1px dashed #999'
      }}
    >
      <Typography variant="h6">Debug Information</Typography>
      <Box sx={{ mt: 1 }}>
        <Typography><strong>Category:</strong> {category}</Typography>
        <Typography><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</Typography>
        <Typography><strong>Error:</strong> {error || 'None'}</Typography>
        <Typography><strong>Posts Count:</strong> {posts.length}</Typography>
        <Typography><strong>Has Posts:</strong> {posts && posts.length > 0 ? 'Yes' : 'No'}</Typography>
        <Typography><strong>Posts Array:</strong> {Array.isArray(posts) ? 'Yes' : 'No'}</Typography>
        {posts.length > 0 && (
          <Typography>
            <strong>First Post:</strong> {posts[0].title} (ID: {posts[0].id}, 
            Status: {posts[0].approval_status || 'unknown'})
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default PostsDebugger;