export interface Post {
  eventDetails: boolean;
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  category: string;
  type: 'discussion' | 'poll';
  likes: number;
  comments: Comment[];
  created_at: string;
  image_url?: string;
  poll?: Poll;
  author_role?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

// ...existing interfaces...

export interface NewPost {
  title: string;
  content: string;
  authorId: string;
  category: string;
  type: 'discussion' | 'poll';
  image?: File;
  poll?: {
    question: string;
    options: Array<{
      text: string;
      votes: number;
    }>;
  };
}

export interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  created_at: string;
  likes: number;
  liked?: boolean;
  author_role?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

type NotificationType = 'new_comment' | 'post_like' | 'comment_like';

interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  related_id: string;
  read: boolean;
  created_at: string;
  actor_name: string;
  actor_avatar: string;
}
