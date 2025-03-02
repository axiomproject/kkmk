import React, { useState, useEffect, useCallback, useRef } from 'react';
import CreatePost from './CreatePost';
import PostList from './PostList';
import ForumSidebar from './ForumSidebar';
import { Card, CardContent, IconButton, Tooltip, Typography } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Post, Comment } from '../../types/forum'; // Remove unused NewPost import
import '../../styles/Forum.css';
import ForumIcon from '@mui/icons-material/Forum';
import PeopleIcon from '@mui/icons-material/People';
import PollIcon from '@mui/icons-material/Poll';
import CircleIcon from '@mui/icons-material/Circle';
import MenuIcon from '@mui/icons-material/Menu'; // Add this import
import SearchIcon from '@mui/icons-material/Search'; // Keep this for the icon

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

const Forum: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; image?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [hasHighlighted, setHasHighlighted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCategoryInfo, setActiveCategoryInfo] = useState<{
    category: string;
    eventTitle?: string;
  }>({ category: 'All' });
  const forumMainRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [originalPosts, setOriginalPosts] = useState<Post[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchPosts();
    fetchEvents(); // Add this to fetch events when component mounts
  }, []);

  useEffect(() => {
    const checkAdminStatus = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsAdmin(user.role === 'admin');
      }
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    
    if (postId && posts.length > 0) {
      // Always set these regardless of hasHighlighted
      setHighlightedPostId(postId);
      setHasHighlighted(true);
      
      setTimeout(() => {
        const postElement = document.getElementById(`post-${postId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth' });
          postElement.classList.add('highlighted-post');
          
          setTimeout(() => {
            postElement.classList.remove('highlighted-post');
            setHighlightedPostId(null);
            // Don't remove postId from URL to allow refreshing to the same post
          }, 3500);
        }
      }, 300);
    }
  }, [posts]);

  // Add an additional effect to reset highlighting when the URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get('postId');
      
      if (!postId) {
        setHasHighlighted(false);
      }
    };

    // Listen for URL changes
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Add useEffect to handle body scroll
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isSidebarOpen]);

  // Update useEffect for mobile view detection with 976px breakpoint
  useEffect(() => {
    const checkMobileView = () => {
      if (window.innerWidth <= 976) {
        setView('grid');
      }
    };

    // Check on mount
    checkMobileView();

    // Add resize listener
    window.addEventListener('resize', checkMobileView);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
    }
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/forum/posts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data);
      setOriginalPosts(data); // Store original posts
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventPosts = async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/forum/event-posts/${eventId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Find the event title
      const eventTitle = events.find(e => e.id === eventId)?.title;
      
      // Update the category of each post to match the event title
      const postsWithEventCategory = data.map((post: Post) => ({
        ...post,
        category: eventTitle || 'Events'
      }));
      
      setPosts(postsWithEventCategory);
    } catch (error) {
      console.error('Failed to fetch event posts:', error);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Add this function
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched events:', data); // Debug log
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleAddPost = async (postData: FormData) => {
    try {
      console.log('Creating post with form data:', {
        eventId: postData.get('eventId'),
        category: postData.get('category'),
        title: postData.get('title')
      });

      const response = await fetch(`${API_URL}/api/forum/posts`, {
        method: 'POST',
        body: postData,
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const createdPost = await response.json();
      
      // If this is an event post, fetch event posts again
      if (activeEventId) {
        fetchEventPosts(activeEventId);
      } else {
        setPosts(prevPosts => [createdPost, ...prevPosts]);
      }
      
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setActiveEventId(null);
    
    // Scroll to forum content with smooth behavior
    if (forumMainRef.current) {
      forumMainRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }

    if (category === 'events') {
      fetchEvents();
      setActiveCategoryInfo({ category: 'events' });
    } else {
      fetchPosts();
      setActiveCategoryInfo({ category });
    }
  };

  const handleEventSelect = async (eventId: string, eventTitle: string) => {
    setActiveEventId(eventId);
    setActiveCategoryInfo({ 
      category: 'event', 
      eventTitle
    });
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching event posts for event:', { id: eventId, title: eventTitle });
      
      const response = await fetch(`${API_URL}/api/forum/event-posts/${eventId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched event posts:', data.length);
      
      // Don't modify the posts' categories - use them as stored in database
      setPosts(data);
    } catch (error: any) {
      console.error('Error fetching event posts:', error);
      setError(`Failed to load event posts: ${error.message}`);
      setPosts([]); // Set empty array to avoid undefined errors
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = (postId: string, newComment: Comment) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const updatedComments = [...(post.comments || []), {
            ...newComment,
            author_id: newComment.author_id,
            author_name: newComment.author_name,
            author_avatar: newComment.author_avatar,
            created_at: newComment.created_at
          }];
          return { ...post, comments: updatedComments };
        }
        return post;
      })
    );
  };

  const handleVote = async (postId: string, optionId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId && post.poll
          ? {
              ...post,
              poll: {
                ...post.poll,
                totalVotes: post.poll.totalVotes + 1,
                options: post.poll.options.map(option => ({
                  ...option,
                  votes: option.id === optionId ? option.votes + 1 : option.votes
                }))
              }
            }
          : post
      )
    );
  };

  const handleCommentLike = useCallback(async (postId: string, commentId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.map(comment => {
              if (comment.id === commentId) {
                // Instead of incrementing/decrementing, just return the new count from the server
                return {
                  ...comment
                };
              }
              return comment;
            })
          };
        }
        return post;
      })
    );
    
    // Fetch the updated posts to get the correct like count
    try {
      const response = await fetch(`${API_URL}/api/forum/posts`);
      if (response.ok) {
        const updatedPosts = await response.json();
        setPosts(updatedPosts);
      }
    } catch (error) {
      console.error('Failed to refresh posts:', error);
    }
  }, []);

  const handleDeletePost = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  const handleUpdatePost = (postId: string, updatedPost: Partial<Post>) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, ...updatedPost }
          : post
      )
    );
    fetchPosts();
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    // Update posts state to remove the deleted comment
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(comment => comment.id !== commentId)
          };
        }
        return post;
      })
    );
  };

  // Add this helper function
  const getHeaderTitle = () => {
    if (activeCategoryInfo.category === 'event' && activeCategoryInfo.eventTitle) {
      return activeCategoryInfo.eventTitle;
    }
    if (activeCategoryInfo.category === 'all') {
      return 'Community Forum';
    }
    return `${activeCategoryInfo.category.charAt(0).toUpperCase()}${activeCategoryInfo.category.slice(1)} Discussions`;
  };

  // Add search function
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      setPosts(originalPosts);
      return;
    }

    const searchTermLower = value.toLowerCase();
    const filtered = originalPosts.filter(post => {
      const inTitle = post.title.toLowerCase().includes(searchTermLower);
      const inContent = post.content?.toLowerCase().includes(searchTermLower);
      const inCategory = post.category.toLowerCase().includes(searchTermLower);
      const inComments = post.comments?.some(comment => 
        comment.content.toLowerCase().includes(searchTermLower)
      );
      const inAuthor = post.author_name.toLowerCase().includes(searchTermLower);
      
      return inTitle || inContent || inCategory || inComments || inAuthor;
    });
    
    setPosts(filtered);
  };

  return (
    <>
      <div className="forum-banner">
        <div className="forum-banner-content">
          <h1>Community Forum</h1>
          <p>Join the conversation, share your thoughts, and connect with others</p>
          <div className="forum-stats">
            <div className="stat-items">
              <ForumIcon />
              <div>
                <h3>{posts.length}</h3>
                <p>Discussions</p>
              </div>
            </div>
            <div className="stat-items">
              <PeopleIcon />
              <div>
                <h3>
                  {Array.from(new Set(posts.map(post => post.author_id))).length}
                </h3>
                <p>Members</p>
              </div>
            </div>
            <div className="stat-items">
              <PollIcon />
              <div>
                <h3>{posts.filter(post => post.type === 'poll').length}</h3>
                <p>Active Polls</p>
              </div>
            </div>
          </div>
          {/* Add this new section for role legends */}
          <div className="role-legends" style={{ 
            display: 'flex', 
            gap: '20px', 
            justifyContent: 'center',
            marginTop: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '10px',
            borderRadius: '8px'
          }}>
            {[
              { role: 'Volunteer', color: '#4CAF50' },
              { role: 'Sponsor', color: '#f99407' },
              { role: 'Admin', color: '#FF5722' },
              { role: 'Staff', color: '#9C27B0' }
            ].map(({ role, color }) => (
              <div key={role} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px'
              }}>
                <CircleIcon sx={{ color, fontSize: 12 }} />
                <span style={{ 
                  color: 'white',
                  fontSize: '0.9rem',
                  fontFamily: '"Poppins", sans-serif'
                }}>
                  {role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="forum-container">
        <ForumSidebar 
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          events={events} // Pass events to sidebar
          isAdmin={isAdmin} // Add this prop
        />
        <div className="forum-main" ref={forumMainRef}>
          <div className="forum-header">
            <div className="header-left">
              <IconButton 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                sx={{ 
                  color: '#f99407', // Match the color
                  '&:hover': {
                    backgroundColor: 'rgba(249, 148, 7, 0.1)',
                  },
                  width: 40,
                  height: 40,
                  padding: '8px',
                  marginRight: '8px',
                  // Show only below 768px (mobile)
                  display: { xs: 'flex', md: 'none' }
                }}
              >
                <MenuIcon />
              </IconButton>
              <h1>{getHeaderTitle()}</h1>
            </div>
            
            {/* Replace MUI Paper with custom search bar */}
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search posts, comments, categories..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
        
            </div>

            <div className="forum-controls">
              {/* Only show view toggle above 976px */}
              {window.innerWidth > 976 && (
                <Tooltip title={`Switch to ${view === 'list' ? 'grid' : 'list'} view`}>
                  <IconButton 
                    onClick={() => setView(view === 'list' ? 'grid' : 'list')}
                    sx={{ 
                      color: '#f99407',
                      '&:hover': {
                        backgroundColor: 'rgba(249, 148, 7, 0.1)',
                      }
                    }}
                  >
                    {view === 'list' ? <GridViewIcon /> : <ViewListIcon />}
                  </IconButton>
                </Tooltip>
              )}
              {/* Only show create post button if user is not a scholar */}
              {userRole !== 'scholar' && (
                <CreatePost 
                  onPostCreate={handleAddPost} 
                  eventId={activeEventId || undefined} // Convert null to undefined
                  categoryInfo={activeCategoryInfo}
                />
              )}
            </div>
          </div>
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : activeCategory === 'events' && !activeEventId ? (
            // Show events grid when Events category is selected
            <div className="events-grid">
              {events.map((event) => (
                <Card 
                  key={event.id}
                  onClick={() => handleEventSelect(event.id, event.title)}
                  sx={{ 
                    cursor: 'pointer',
                    padding: '0',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                      transition: 'all 0.3s ease'
                    }
                  }}
                >
                  {event.image && (
                    <img
                      src={`${API_URL}${event.image}`}
                      alt={event.title}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <CardContent>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontFamily: '"Poppins", sans-serif',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        mb: 1
                      }}
                    >
                      {event.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontFamily: '"Poppins", sans-serif',
                        fontSize: '0.875rem'
                      }}
                    >
                      Click to view event posts
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <PostList 
              view={view} 
              category={activeCategoryInfo.category} 
              eventId={activeEventId}
              posts={posts} 
              highlightedPostId={highlightedPostId}
              onAddComment={handleAddComment}
              onCategoryChange={handleCategoryChange}
              onVote={handleVote}  // Make sure this prop is passed
              onCommentLike={handleCommentLike}
              onDeletePost={handleDeletePost}
              onUpdatePost={handleUpdatePost}
              onDeleteComment={handleDeleteComment} // Add this prop
              userRole={userRole} // Add this prop
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Forum;
