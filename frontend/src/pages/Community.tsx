import { useState } from "react";
import { motion } from "framer-motion";
import { Hash, MessageCircle, Send, ThumbsUp, TrendingUp } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";

type Post = {
  id: number;
  author: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
};

const initialPosts: Post[] = [
  {
    id: 1,
    author: "Sarah M.",
    avatar: "SM",
    time: "2h ago",
    content: "Completed a 30-day meditation challenge. Stress levels have improved significantly this month.",
    likes: 24,
    comments: 8,
  },
  {
    id: 2,
    author: "David K.",
    avatar: "DK",
    time: "5h ago",
    content: "Has anyone tried the AI meal planner? It suggested a great high-protein breakfast.",
    likes: 15,
    comments: 12,
  },
  {
    id: 3,
    author: "Emily R.",
    avatar: "ER",
    time: "1d ago",
    content: "AQI alerts helped me skip outdoor runs at peak pollution time. Very useful feature.",
    likes: 42,
    comments: 5,
  },
];

const trendingTopics = [
  { tag: "MindfulMornings", posts: 1240 },
  { tag: "HealthyEating", posts: 890 },
  { tag: "FitnessGoals", posts: 756 },
  { tag: "SleepBetter", posts: 623 },
  { tag: "AIHealth", posts: 512 },
] as const;

const Community = () => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [newPost, setNewPost] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const submitPost = () => {
    if (!newPost.trim()) return;

    setPosts((prev) => [
      {
        id: Date.now(),
        author: "You",
        avatar: "YO",
        time: "Just now",
        content: newPost.trim(),
        likes: 0,
        comments: 0,
      },
      ...prev,
    ]);
    setNewPost("");
  };

  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout title="Community" subtitle="Share your journey, connect with others, and stay motivated.">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <article className="glass-card rounded-3xl border-border/50 p-4">
            <textarea
              value={newPost}
              onChange={(event) => setNewPost(event.target.value)}
              placeholder="Share your health journey..."
              className="h-24 w-full resize-none rounded-2xl border border-border/60 bg-card/55 p-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
            />
            <div className="mt-3 flex justify-end">
              <Button type="button" className="h-10 rounded-xl bg-primary px-4 text-primary-foreground" onClick={submitPost}>
                <Send className="h-4 w-4" />
                Post
              </Button>
            </div>
          </article>

          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-card rounded-3xl border-border/50 p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {post.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.time}</p>
                </div>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-foreground">{post.content}</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
                    liked.has(post.id) ? "text-health-rose" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  {post.likes + (liked.has(post.id) ? 1 : 0)}
                </button>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments}
                </span>
              </div>
            </motion.article>
          ))}
        </div>

        <aside className="glass-card h-fit rounded-3xl border-border/50 p-5 lg:sticky lg:top-24">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Topics
          </h2>
          <div className="space-y-2">
            {trendingTopics.map((topic) => (
              <div key={topic.tag} className="flex items-center justify-between rounded-xl bg-card/45 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{topic.tag}</span>
                </div>
                <span className="text-xs text-muted-foreground">{topic.posts} posts</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </AppLayout>
  );
};

export default Community;
