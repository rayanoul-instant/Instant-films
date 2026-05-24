import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Clock, Film, Send, Reply } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiscussion, useComments, useCreateComment, useLikeDiscussion } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/types/database';

function CommentItem({ 
  comment, 
  discussionId, 
  depth = 0 
}: { 
  comment: Comment; 
  discussionId: string; 
  depth?: number;
}) {
  const { user } = useAuth();
  const createComment = useCreateComment();
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    
    try {
      await createComment.mutateAsync({
        discussionId,
        content: replyContent,
        parentId: comment.id,
      });
      setReplyContent('');
      setShowReply(false);
      toast.success('Reply posted');
    } catch {
      toast.error('Failed to post reply');
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 pl-4 border-l border-border' : ''}`}>
      <div className="flex gap-3 mb-4">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {comment.profile?.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {comment.profile?.username || 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {comment.content}
          </p>
          
          {user && depth < 2 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}
          
          {showReply && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 flex gap-2"
            >
              <Textarea
                placeholder="Your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="bg-secondary border-border text-sm min-h-[60px]"
              />
              <Button
                size="icon"
                onClick={handleReply}
                disabled={createComment.isPending}
                className="btn-cinema h-auto"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              discussionId={discussionId} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscussionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: discussion, isLoading } = useDiscussion(id!);
  const { data: comments } = useComments(id!);
  const createComment = useCreateComment();
  const likeDiscussion = useLikeDiscussion();

  const [newComment, setNewComment] = useState('');

  const handleComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please write a comment');
      return;
    }
    
    try {
      await createComment.mutateAsync({
        discussionId: id!,
        content: newComment,
      });
      setNewComment('');
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleLike = () => {
    if (!user) {
      toast.error('Sign in to like this discussion');
      return;
    }
    likeDiscussion.mutate(id!);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container px-4 py-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-32 w-full mb-8" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    );
  }

  if (!discussion) {
    return (
      <Layout>
        <div className="container px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Discussion not found</h1>
          <Link to="/discussions">
            <Button>Back to discussions</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container px-4 py-8 max-w-4xl">
        <Link 
          to="/discussions" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to discussions
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cinema-card p-6 md:p-8 mb-8"
        >
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/20 text-primary">
                {discussion.profile?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
                {discussion.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="text-primary">
                  @{discussion.profile?.username || 'user'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                </span>
                {discussion.film && (
                  <Link to={`/films/${discussion.film.slug}`}>
                    <Badge variant="outline" className="border-border hover:border-primary">
                      <Film className="w-3 h-3 mr-1" />
                      {discussion.film.title}
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap mb-6">
            {discussion.content}
          </p>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button
              onClick={handleLike}
              className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors"
            >
              <Heart className="w-5 h-5" />
              <span>{discussion.likes_count} likes</span>
            </button>
          </div>
        </motion.article>

        <section>
          <h2 className="font-display text-xl font-semibold mb-6">
            Comments ({comments?.length || 0})
          </h2>

          {user ? (
            <div className="flex gap-3 mb-8">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-secondary border-border min-h-[80px]"
                />
                <Button
                  onClick={handleComment}
                  disabled={createComment.isPending}
                  className="btn-cinema h-auto"
                >
                  <span><Send className="w-4 h-4" /></span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card/50 border border-border rounded-xl p-4 mb-8 text-center">
              <p className="text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
                {' '}to comment
              </p>
            </div>
          )}

          {comments && comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  discussionId={id!} 
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No comments yet. Be the first!
            </p>
          )}
        </section>
      </div>
    </Layout>
  );
}
