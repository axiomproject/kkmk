import React, { useState, KeyboardEvent, useEffect, useMemo } from 'react';
import { Post, Comment } from '../../types/forum';
import { 
  Card, CardContent, Typography, Avatar, Button, Chip, 
  TextField, Collapse, IconButton, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, Modal, Box, Snackbar, Alert // Add Modal, Box, Snackbar, and Alert imports
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { checkProfanity } from '../../utils/profanityFilter'; // Remove showProfanityWarning
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

interface PostListProps {
  view: 'list' | 'grid';
  category: string;
  eventId?: string | null;  // Add this line
  posts: Post[];
  onAddComment: (postId: string, comment: Comment) => void;
  onVote: (postId: string, optionId: string) => void;  // Add this prop
  onCommentLike: (postId: string, commentId: string) => void;
  onDeletePost: (postId: string) => void;
  onUpdatePost: (postId: string, updatedPost: Partial<Post>) => void;
  highlightedPostId?: string | null;
  onCategoryChange: (category: string) => void; // Add this prop
  userRole: string; // Add this prop
}

interface EditData {
  title: string;
  content: string;
  category: string;
  type: 'discussion' | 'poll';
  poll: {
    options: { id: string; text: string; votes: number; }[];
  };
}

// Update the helper function to include admin and staff roles
const getRoleBorderColor = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'volunteer':
      return '#4CAF50'; // Green
    case 'scholar':
      return '#2196F3'; // Blue
    case 'sponsor':
      return '#f99407'; // Orange
    case 'admin':
      return '#FF5722'; // Deep Orange/Red for Admin
    case 'staff':
      return '#9C27B0'; // Purple for Staff
    default:
      return 'transparent';
  }
};

const authorNameStyle = {
  margin: 0,
  padding: 0,
  textAlign: 'left' as const,
  width: '100%',
  fontFamily: '"Poppins", sans-serif',
  fontWeight: 500
};

const PostList: React.FC<PostListProps> = ({ view, category, posts = [], onAddComment, onVote, onCommentLike, onDeletePost, onUpdatePost, highlightedPostId, onCategoryChange, userRole }) => {
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [newComments, setNewComments] = useState<{ [key: string]: string }>({});
  const [votedPolls, setVotedPolls] = useState<string[]>([]);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [allPosts, setPosts] = useState<Post[]>(posts);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    title: '',
    content: '',
    category: '',
    type: 'discussion',
    poll: { options: [] }
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Add this state
  const [commentError, setCommentError] = useState<{ [key: string]: string }>({});
  const [showProfanityAlert, setShowProfanityAlert] = useState(false); // Add this state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminOrStaff, setIsAdminOrStaff] = useState(false);

  const modalStyle = { // Add this style object
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '& img': {
      maxWidth: '90vw',
      maxHeight: '90vh',
      objectFit: 'contain'
    }
  };

  const handleImageClick = (imageUrl: string) => { // Add this handler
    setSelectedImage(imageUrl);
  };

  // Update this helper function to handle all possible avatar URL formats
  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return '/images/default-avatar.jpg'; // Default avatar
    
    console.log('Processing avatar path:', avatarPath); // Debug log
    
    // Check if it's a data URL (base64)
    if (avatarPath.startsWith('data:')) {
      return avatarPath; // Return as is, don't modify data URLs
    }
    
    // Check if the avatar path already includes http:// or https://
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    
    // Check if it's a relative path that should have API_URL prepended
    if (avatarPath.startsWith('/')) {
      return `${API_URL}${avatarPath}`;
    }
    
    // For profile_photo values that might be stored without a leading slash
    return `${API_URL}/${avatarPath}`;
  };

  useEffect(() => {
    const fetchUserLikes = async () => {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user) return;

      try {
        // Fetch liked posts
        const postsResponse = await fetch(`${API_URL}/api/forum/user-liked-posts/${user.id}`);
        if (postsResponse.ok) {
          const likedPostIds = await postsResponse.json();
          setLikedPosts(likedPostIds);
        }

        // Fetch liked comments (existing code)
        const commentsResponse = await fetch(`${API_URL}/api/forum/user-likes/${user.id}`);
        if (commentsResponse.ok) {
          const likedCommentIds = await commentsResponse.json();
          setLikedComments(likedCommentIds);
        }
      } catch (error) {
        console.error('Error fetching user likes:', error);
      }
    };

    fetchUserLikes();
  }, []);

  useEffect(() => {
    const fetchUserVotes = async () => {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user) return;

      try {
        const response = await fetch(`${API_URL}/api/forum/user-voted-polls/${user.id}`);
        if (response.ok) {
          const votedPollIds = await response.json();
          setVotedPolls(votedPollIds);
        }
      } catch (error) {
        console.error('Error fetching voted polls:', error);
      }
    };

    fetchUserVotes();
  }, []);

  // Add admin check in useEffect
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setIsAdmin(user.role === 'admin');
      setIsAdminOrStaff(['admin', 'staff'].includes(user.role));
    }
  }, []);

  // Update allPosts when props.posts changes
  useEffect(() => {
    setPosts(posts);
  }, [posts]);

  // Add this effect to handle highlighting
  useEffect(() => {
    if (highlightedPostId) {
      const postElement = document.getElementById(`post-${highlightedPostId}`);
      if (postElement) {
        setTimeout(() => {
          postElement.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [highlightedPostId, posts]);

  const handleLike = async (postId: string) => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      console.error('No user data found');
      return;
    }

    const increment = !likedPosts.includes(postId);
    try {
      const response = await fetch(
        `${API_URL}/api/forum/posts/${postId}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            increment,
            userId: user.id
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update like');
      }

      const updatedPost = await response.json();
      
      // Update liked posts state
      if (increment) {
        setLikedPosts(prev => [...prev, postId]);
      } else {
        setLikedPosts(prev => prev.filter(id => id !== postId));
      }

      // Use the server's like count instead of calculating locally
      setPosts((prevPosts: Post[]) => 
        prevPosts.map((post: Post) => 
          post.id === postId ? { ...post, likes: updatedPost.likes } : post
        )
      );
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleAddComment = async (postId: string) => {
    if (!newComments[postId]?.trim()) return;

    if (checkProfanity(newComments[postId])) {
      setCommentError({
        ...commentError,
        [postId]: 'Your comment contains inappropriate language'
      });
      setShowProfanityAlert(true);
      return;
    }

    setCommentError({ ...commentError, [postId]: '' });

    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) return;

    const commentData = {
      content: newComments[postId].trim(),
      author_id: user.id,
      author_name: user.name,
      author_avatar: user.profilePhoto || 'https://mui.com/static/images/avatar/1.jpg'
    };

    try {
      const response = await fetch(`${API_URL}/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const newComment = await response.json();
      onAddComment(postId, newComment);
      setNewComments(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      // Optionally show error to user
    }
  };

  const handleCommentSubmit = (postId: string, event?: KeyboardEvent) => {
    if (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleAddComment(postId);
      }
    } else {
      handleAddComment(postId);
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      console.error('No user data found');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/forum/posts/${postId}/vote/${optionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to record vote');
      }

      const updatedPoll = await response.json();

      // Update the posts state with the new poll data
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, poll: updatedPoll }
            : post
        )
      );

      setVotedPolls(prev => [...prev, postId]);
      onVote(postId, optionId);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleCommentLike = async (postId: string, commentId: string) => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      console.error('No user data found');
      return;
    }

    const increment = !likedComments.includes(commentId);
    try {
      const response = await fetch(
        `${API_URL}/api/forum/posts/${postId}/comments/${commentId}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            increment,
            userId: user.id
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update like');
      }

      const updatedComment = await response.json();
      
      if (increment) {
        setLikedComments(prev => [...prev, commentId]);
      } else {
        setLikedComments(prev => prev.filter(id => id !== commentId));
      }

      onCommentLike(postId, commentId);
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const getVotePercentage = (votes: number, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Invalid date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getCommentsCount = (post: Post) => {
    return post.comments ? post.comments.length : 0;
  };

  const filteredPosts = allPosts ? (
    category.toLowerCase() === 'all' 
      ? allPosts 
      : category === 'event'
        ? allPosts // Show all event posts when in event category
        : allPosts.filter((post: Post) => post.category.toLowerCase() === category.toLowerCase())
  ) : [];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, postId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPost(postId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = (post: Post) => {
    if (!post) return;
    
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    
    // If it's a poll, check votes
    if (post.type === 'poll' && post.poll && post.poll.totalVotes && post.poll.totalVotes > 0) {
      alert('Cannot edit poll after votes have been cast');
      return;
    }
    
    setEditData({
      title: post.title,
      content: post.content || '',
      category: post.category,
      type: post.type,
      poll: post.poll || { options: [] }
    });
    
    setSelectedPost(post.id);
    setEditDialog(true);
  };

  const handleDeleteClick = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    try {
      const response = await fetch(`${API_URL}/api/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete post');
      }
      
      onDeletePost(postId);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedPost) return;
    
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user) return;
    
    if (!editData.title.trim() || (editData.type === 'discussion' && !editData.content.trim())) {
      return;
    }
    
    try {
      const requestData = {
        userId: user.id,
        title: editData.title.trim(),
        content: editData.type === 'poll' ? '' : editData.content.trim(),
        category: editData.category, // Don't transform the category
        type: editData.type,
        ...(editData.type === 'poll' && {
          poll: editData.poll
        })
      };

      const response = await fetch(`${API_URL}/api/forum/posts/${selectedPost}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      const updatedPost = await response.json();
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === selectedPost ? { ...post, ...updatedPost } : post
        )
      );

      onUpdatePost(selectedPost, updatedPost);
      setEditDialog(false);
      resetEditData();
      setSelectedPost(null);
      
      const refreshResponse = await fetch(`${API_URL}/api/forum/posts`);
      if (refreshResponse.ok) {
        const refreshedPosts = await refreshResponse.json();
        setPosts(refreshedPosts);
      }

    } catch (error) {
      alert('Failed to update post. Please try again.');
    }
  };

  const handleEditTextChange = (field: keyof EditData, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetEditData = () => {
    setEditData({
      title: '',
      content: '',
      category: '',
      type: 'discussion',
      poll: { options: [] }
    });
  };

  const categoryOptions = useMemo(() => {
    // If this is an event post, just use its original category
    if (editData.category && (
      editData.category.toLowerCase().includes('event:') || 
      editData.category.toLowerCase() === 'events')
    ) {
      return [editData.category];
    }

    // For non-event posts, show standard categories
    return [
      editData.category || 'General', // Show current category first
      'General',
      'Announcements',
      'Questions',
      'Support',
      'Suggestions'
    ].filter((cat, index, self) => self.indexOf(cat) === index); // Remove duplicates
  }, [editData.category]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.post-action-wrapper')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const toggleDropdown = (postId: string) => {
    setOpenDropdownId(openDropdownId === postId ? null : postId);
  };

  // Update renderPostActions to show appropriate delete options based on roles
  const renderPostActions = (post: Post) => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    const isAuthor = post.author_id === user?.id;
    
    // Check if user can delete this post
    // Staff can't delete admin posts, all others follow normal rules
    const canDelete = isAuthor || 
                      isAdmin || 
                      (isAdminOrStaff && post.author_role !== 'admin');
    
    // Only show actions if user can edit or delete
    if (!isAuthor && !canDelete) return null;
  
    return (
      <div className="post-actions-dropdown">
        <button
          className="dropdown-button"
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown(post.id);
          }}
        >
          <MoreVertIcon />
        </button>
        {openDropdownId === post.id && (
          <div className="dropdown-menu">
            {/* Only show edit for author */}
            {isAuthor && (
              <div 
                className="dropdown-item"
                onClick={() => {
                  handleEditClick(post);
                  setOpenDropdownId(null);
                }}
              >
                <EditIcon sx={{ fontSize: 20 }} />
                Edit
              </div>
            )}
            {/* Show delete with appropriate label based on role */}
            {canDelete && (
              <div 
                className="dropdown-item delete"
                onClick={() => {
                  handleDeleteClick(post.id);
                  setOpenDropdownId(null);
                }}
              >
                <DeleteIcon sx={{ fontSize: 20 }} />
                {isAdmin ? 'Delete (Admin)' : 
                 user?.role === 'staff' ? 'Delete (Staff)' : 'Delete'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="no-posts">
        <Typography variant="h6" color="textSecondary" align="center">
          No posts available. Be the first to create a post!
        </Typography>
      </div>
    );
  }

  return (
    <>
      <Snackbar 
        open={showProfanityAlert} 
        autoHideDuration={6000} 
        onClose={() => setShowProfanityAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ width: '100%' }}
      >
        <Alert 
          severity="error" 
          variant="filled"
          onClose={() => setShowProfanityAlert(false)}
          sx={{
            width: '100%',
            fontSize: '1rem',
            alignItems: 'center',
            '& .MuiAlert-icon': {
              fontSize: '24px'
            }
          }}
        >
          Comment contains inappropriate language
        </Alert>
      </Snackbar>

      <div className={`post-list ${view}`}>
        {filteredPosts.map(post => {
          const isAuthor = post.author_id === JSON.parse(localStorage.getItem('user') || '{}').id;
          const isHighlighted = post.id === highlightedPostId;
          
          return (
            <Card 
              key={post.id} 
              id={`post-${post.id}`}
              sx={{ 
                mb: 2,
                position: 'relative',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid transparent',
                ...(post.id === highlightedPostId && {
                  borderLeft: '4px solid #f99407',
                  backgroundColor: 'rgba(249, 148, 7, 0.05)',
                  boxShadow: '0 0 15px rgba(249, 148, 7, 0.2)'
                })
              }}
            >
              <CardContent>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <Avatar 
                    src={getAvatarUrl(post.author_avatar)} 
                    sx={{ 
                      marginRight: '1rem',
                      border: `3px solid ${getRoleBorderColor(post.author_role)}`,
                    }} 
                    imgProps={{
                      onError: (e) => {
                        console.error('Avatar image failed to load:', post.author_avatar);
                        (e.target as HTMLImageElement).src = 'https://mui.com/static/images/avatar/1.jpg';
                      }
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Typography 
                        variant="subtitle1"
                        sx={authorNameStyle}
                      >
                        {post.author_name}
                      </Typography>
                      {post.author_role === 'admin' && (
                        <Chip
                          label="Admin"
                          size="small"
                          sx={{
                            backgroundColor: '#FF5722',
                            color: 'white',
                            height: '20px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            fontFamily: '"Poppins", sans-serif',
                            '& .MuiChip-label': {
                              padding: '0 8px'
                            }
                          }}
                        />
                      )}
                      {post.author_role === 'staff' && (
                        <Chip
                          label="Staff"
                          size="small"
                          sx={{
                            backgroundColor: '#9C27B0',
                            color: 'white',
                            height: '20px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            fontFamily: '"Poppins", sans-serif',
                            '& .MuiChip-label': {
                              padding: '0 8px'
                            }
                          }}
                        />
                      )}
                    </div>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block', 
                        textAlign: 'left',
                        fontFamily: '"Poppins", sans-serif'
                      }}
                    >
                      {formatDate(post.created_at)}
                    </Typography>
                  </div>
                  <Chip 
                    label={post.category} 
                    size="small"
                    onClick={category.toLowerCase() === 'all' ? () => onCategoryChange(post.category.toLowerCase()) : undefined}
                    sx={{ 
                      marginLeft: 'auto',
                      fontFamily: '"Poppins", sans-serif',
                        marginBottom: '20px',
                      cursor: category.toLowerCase() === 'all' ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      borderColor: 'transparent',
                      ...(view === 'grid' && {
                        maxWidth: '150px',
                        '& .MuiChip-label': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }
                      }),
                      // Only apply hover effects when in 'all' category
                      ...(category.toLowerCase() === 'all' && {
                        '&:hover': {
                          backgroundColor: '#f99407',
                          color: 'white',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 4px rgba(249, 148, 7, 0.2)'
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                          boxShadow: 'none'
                        }
                      })
                    }} 
                  />
                  {(isAuthor || isAdmin || (isAdminOrStaff && post.author_role !== 'admin')) && (
                    <div className="post-action-wrapper" style={{ marginLeft: '12px', position: 'relative' }}>
                      <button
                        type="button"
                        className="post-action-button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDropdown(post.id);
                        }}
                      >
                        <MoreVertIcon />
                      </button>
                      {openDropdownId === post.id && (
                        <div 
                          className="post-action-menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAuthor && (
                            <button
                              type="button"
                              className="post-action-item"
                              onClick={(e) => {
                                e.preventDefault();
                                handleEditClick(post);
                                setOpenDropdownId(null);
                              }}
                            >
                              <EditIcon fontSize="small" /> Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="post-action-item delete"
                            onClick={(e) => {
                              e.preventDefault();
                              if (window.confirm('Are you sure you want to delete this post?')) {
                                handleDeleteClick(post.id);
                                setOpenDropdownId(null);
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" /> {
                              isAdmin ? 'Delete (Admin)' : 
                              userRole === 'staff' ? 'Delete (Staff)' : 'Delete'
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                  }}
                >
                  {post.title}
                </Typography>

                <Typography 
                  variant="body1" 
                  paragraph
                  sx={{ 
                    textAlign: 'left', 
                    width: '100%',
                    fontFamily: '"Poppins", sans-serif'
                  }}
                >
                  {post.content}
                </Typography>

                {post.image_url && (
                  <div style={{ marginBottom: 16 }}>
                    <img
                      src={`${API_URL}${post.image_url}`}
                      alt="Post attachment"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 400,
                        objectFit: 'contain',
                        cursor: 'pointer' // Add this to show it's clickable
                      }}
                      onClick={() => handleImageClick(`${API_URL}${post.image_url}`)}
                    />
                  </div>
                )}

                {post.type === 'poll' && post.poll && post.poll.options && (
                  <div className="poll-container">
                    {post.poll.options.map(option => {
                      // Add safe access to totalVotes with default value
                      const totalVotes = post.poll?.totalVotes ?? 0;
                      const percentage = getVotePercentage(option.votes, totalVotes);
                      return (
                        <Button
                          key={option.id}
                          variant="outlined"
                          fullWidth
                          // Update disabled condition to include userRole check
                          disabled={votedPolls.includes(post.id) || userRole === 'scholar'}
                          onClick={() => handleVote(post.id, option.id)}
                          sx={{ 
                            mb: 1,
                            fontFamily: '"Poppins", sans-serif',
                            color: votedPolls.includes(post.id) || userRole === 'scholar' ? '#666' : '#242424',
                            borderColor: votedPolls.includes(post.id) || userRole === 'scholar' ? '#ddd' : '#e0e0e0',
                            justifyContent: 'space-between',
                            padding: '12px 20px',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': votedPolls.includes(post.id) ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${percentage}%`,
                              backgroundColor: 'rgba(249, 148, 7, 0.1)',
                              zIndex: 0
                            } : {},
                            '&:hover': {
                              backgroundColor: votedPolls.includes(post.id) ? 'transparent' : 'rgba(249, 148, 7, 0.1)',
                              borderColor: votedPolls.includes(post.id) ? '#ddd' : '#f99407',
                              color: votedPolls.includes(post.id) ? '#666' : '#f99407'
                            }
                          }}
                        >
                          <span style={{ zIndex: 1 }}>{option.text}</span>
                          <span style={{ 
                            color: '#666',
                            fontSize: '0.9em',
                            fontWeight: 500,
                            zIndex: 1 
                          }}>
                            {option.votes} votes ({percentage}%)
                          </span>
                        </Button>
                      );
                    })}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        textAlign: 'right',
                        marginTop: '0.5rem',
                        color: '#666',
                        fontFamily: '"Poppins", sans-serif'
                      }}
                    >
                      {userRole === 'scholar' ? (
                        'Scholars cannot vote on polls'
                      ) : (
                        <>Total votes: {post.poll?.totalVotes ?? 0} {votedPolls.includes(post.id) && '• You voted'}</>
                      )}
                    </Typography>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {/* Only show like button if user is not a scholar */}
                  {userRole !== 'scholar' && (
                    <Button 
                      startIcon={likedPosts.includes(post.id) ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                      size="small"
                      onClick={() => handleLike(post.id)}
                      sx={{
                        color: likedPosts.includes(post.id) ? '#f99407' : 'inherit',
                        fontFamily: '"Poppins", sans-serif',
                        '&:hover': {
                          color: '#f99407',
                        }
                      }}
                    >
                      {post.likes} Likes
                    </Button>
                  )}
                  
                  {/* Show comments count for all users but only allow toggle for non-scholars */}
                  <Button 
                    startIcon={expandedPosts.includes(post.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    size="small"
                    onClick={userRole !== 'scholar' ? () => toggleComments(post.id) : undefined}
                    disabled={userRole === 'scholar'}
                    sx={{
                      color: expandedPosts.includes(post.id) ? '#f99407' : 'inherit',
                      fontFamily: '"Poppins", sans-serif',
                      '&:hover': {
                        color: userRole !== 'scholar' ? '#f99407' : 'inherit',
                      }
                    }}
                  >
                    {getCommentsCount(post)} Comments
                  </Button>
                </div>

                {/* Only show comments section and add comment if user is not a scholar */}
                {userRole !== 'scholar' && (
                  <Collapse in={expandedPosts.includes(post.id)}>
                    <div className="comments-section">
                      <div className="comments-list">
                        {post.comments && post.comments.map(comment => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-header">
                              <Avatar 
                                src={getAvatarUrl(comment.author_avatar)}
                                sx={{ 
                                  width: 32, 
                                  height: 32,
                                  border: `2px solid ${getRoleBorderColor(comment.author_role)}`,
                                  padding: '1px'
                                }}
                                imgProps={{
                                  onError: (e) => {
                                    console.error('Comment avatar image failed to load:', comment.author_avatar);
                                    (e.target as HTMLImageElement).src = 'https://mui.com/static/images/avatar/1.jpg';
                                  }
                                }}
                              />
                              <div className="comment-info">
                                <Typography 
                                  variant="subtitle2" 
                                  sx={{ 
                                    textAlign: 'left',
                                    fontFamily: '"Poppins", sans-serif',
                                    fontWeight: 600
                                  }}
                                >
                                  {comment.author_name}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    textAlign: 'left', 
                                    display: 'block',
                                    fontFamily: '"Poppins", sans-serif'
                                  }}
                                >
                                  {formatDate(comment.created_at)}
                                </Typography>
                              </div>
                              <IconButton
                                size="small"
                                onClick={() => handleCommentLike(post.id, comment.id)}
                                sx={{
                                  marginLeft: 'auto',
                                  color: likedComments.includes(comment.id) ? '#f99407' : 'inherit',
                                  '&:hover': {
                                    color: '#f99407',
                                  }
                                }}
                              >
                                {likedComments.includes(comment.id) ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOutlinedIcon fontSize="small" />}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    ml: 0.5,
                                    color: 'inherit'
                                  }}
                                >
                                  {comment.likes}
                                </Typography>
                              </IconButton>
                            </div>
                            <Typography 
                              variant="body2" 
                              className="comment-content"
                              sx={{ 
                                textAlign: 'left',
                                fontFamily: '"Poppins", sans-serif'
                              }}
                            >
                              {comment.content}
                            </Typography>
                          </div>
                        ))}
                      </div>
                      <div className="add-comment">
                        {commentError[post.id] && (
                          <Typography 
                            color="error" 
                            sx={{ 
                              mb: 1,
                              p: 1,
                              bgcolor: 'rgba(211, 47, 47, 0.1)',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              fontSize: '0.875rem'
                            }}
                          >
                            <ErrorOutlineIcon fontSize="small" color="error" />
                            {commentError[post.id]}
                          </Typography>
                        )}
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Write a comment..."
                          value={newComments[post.id] || ''}
                          onChange={(e) => setNewComments(prev => ({
                            ...prev,
                            [post.id]: e.target.value
                          }))}
                          onKeyPress={(e: KeyboardEvent) => handleCommentSubmit(post.id, e)}
                          onFocus={() => {
                            // Clear error when user starts typing again
                            if (commentError[post.id]) {
                              setCommentError({ ...commentError, [post.id]: '' });
                            }
                          }}
                          InputProps={{
                            style: { 
                              fontFamily: '"Poppins", sans-serif',
                              margin: 0,
                             
                            },
                            className: 'comment-input',
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton 
                                  onClick={() => handleCommentSubmit(post.id)}
                                  size="small"
                                  sx={{ 
                                    color: '#f99407',
                                    '&:hover': {
                                      backgroundColor: 'rgba(249, 148, 7, 0.1)',
                                    }
                                  }}
                                >
                                  <SendIcon />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              margin: 0,
                              padding: 0
                            },
                            '& .MuiOutlinedInput-input': {
                              margin: 0,
                              padding: '8px 14px'
                            }
                          }}
                        />
                      </div>
                    </div>
                  </Collapse>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Add this Modal component */}
        <Modal
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          onClick={() => setSelectedImage(null)}
          sx={modalStyle}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              outline: 'none',
              bgcolor: 'transparent'
            }}
          >
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Enlarged post"
                style={{
                  display: 'block',
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  objectFit: 'contain'
                }}
              />
            )}
          </Box>
        </Modal>
      </div>

      {editDialog && (
        <div className="edit-modal" onClick={() => setEditDialog(false)}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()}>
            <div className="create-post-header">
              <h2>Edit {editData.type === 'poll' ? 'Poll' : 'Post'}</h2>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateSubmit();
            }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editData.title}
                  onChange={(e) => handleEditTextChange('title', e.target.value)}
                />
              </div>

              {editData.type === 'discussion' && (
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-textarea"
                    value={editData.content}
                    onChange={(e) => handleEditTextChange('content', e.target.value)}
                  />
                </div>
              )}

              {!editData.category.toLowerCase().includes('event') && (
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={editData.category}
                    onChange={(e) => handleEditTextChange('category', e.target.value)}
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="create-post-actions">
                <div
                  className="post-action-cancel"
                  onClick={() => setEditDialog(false)}
                >
                  Cancel
                </div>
                <div
                  className="post-action-submit"
                  onClick={handleUpdateSubmit}
                >
                  Save Changes
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PostList;
