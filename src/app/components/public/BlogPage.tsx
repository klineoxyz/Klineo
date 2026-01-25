import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Clock, User, TrendingUp, Search, BookOpen, Lightbulb, BarChart3 } from "lucide-react";
import { useState } from "react";

interface BlogPageProps {
  onNavigate: (view: string) => void;
}

const blogPosts = [
  {
    id: 1,
    title: "5 Risk Management Strategies Every Copy Trader Should Know",
    excerpt: "Learn how to protect your capital and maximize long-term profitability with these essential risk management techniques tailored for copy trading.",
    author: "Sarah Mitchell",
    date: "Jan 20, 2026",
    readTime: "8 min",
    category: "Risk Management",
    image: "risk-management",
    featured: true
  },
  {
    id: 2,
    title: "How to Evaluate Master Traders: Beyond the Win Rate",
    excerpt: "Win rate isn't everything. Discover the key metrics that truly matter when selecting which traders to copy on KLINEO.",
    author: "Alex Kim",
    date: "Jan 18, 2026",
    readTime: "6 min",
    category: "Education",
    image: "evaluation"
  },
  {
    id: 3,
    title: "Platform Update: New Real-Time Monitoring Dashboard",
    excerpt: "We've launched an enhanced copy trading monitoring dashboard with live P&L tracking, execution analytics, and performance attribution.",
    author: "KLINEO Team",
    date: "Jan 15, 2026",
    readTime: "4 min",
    category: "Product Updates",
    image: "product"
  },
  {
    id: 4,
    title: "The Psychology of Copy Trading: Avoiding Common Pitfalls",
    excerpt: "Copy trading doesn't eliminate emotional challenges. Learn how to maintain discipline and avoid the psychological traps that hurt returns.",
    author: "James Chen",
    date: "Jan 12, 2026",
    readTime: "10 min",
    category: "Psychology",
    image: "psychology"
  },
  {
    id: 5,
    title: "Understanding Slippage in Copy Trading Execution",
    excerpt: "Why your results differ from the Master Trader's, and what KLINEO does to minimize execution delays and slippage.",
    author: "Sarah Mitchell",
    date: "Jan 10, 2026",
    readTime: "7 min",
    category: "Technical",
    image: "technical"
  },
  {
    id: 6,
    title: "Diversification in Copy Trading: How Many Traders to Follow",
    excerpt: "Is copying one trader too risky? Are 20 traders too many? Find the optimal diversification strategy for your portfolio size.",
    author: "Alex Kim",
    date: "Jan 8, 2026",
    readTime: "9 min",
    category: "Strategy",
    image: "strategy"
  },
  {
    id: 7,
    title: "Tax Implications of Copy Trading: What You Need to Know",
    excerpt: "Copy trading generates taxable events. Learn how to track your trades and stay compliant with cryptocurrency tax regulations.",
    author: "Guest: Tax Advisor",
    date: "Jan 5, 2026",
    readTime: "12 min",
    category: "Legal & Tax",
    image: "tax"
  },
  {
    id: 8,
    title: "Analyzing Drawdowns: When to Stop Copying a Trader",
    excerpt: "Every successful trader experiences drawdowns. Here's how to distinguish between normal variance and a strategy breakdown.",
    author: "James Chen",
    date: "Jan 3, 2026",
    readTime: "8 min",
    category: "Risk Management",
    image: "drawdown"
  },
  {
    id: 9,
    title: "Case Study: $10K to $47K in 6 Months with Copy Trading",
    excerpt: "Deep dive into a real KLINEO user's journey, including the traders copied, risk settings, and lessons learned along the way.",
    author: "Community Contributor",
    date: "Dec 28, 2025",
    readTime: "15 min",
    category: "Case Study",
    image: "case-study"
  }
];

const categories = [
  { name: "All Posts", icon: BookOpen },
  { name: "Risk Management", icon: TrendingUp },
  { name: "Education", icon: Lightbulb },
  { name: "Strategy", icon: BarChart3 },
  { name: "Product Updates", icon: BookOpen },
  { name: "Psychology", icon: User },
  { name: "Technical", icon: BookOpen }
];

export function BlogPage({ onNavigate }: BlogPageProps) {
  const [selectedCategory, setSelectedCategory] = useState("All Posts");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === "All Posts" || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPost = blogPosts.find(p => p.featured);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => onNavigate("landing")}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <BookOpen className="size-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">KLINEO Blog</h1>
                  <p className="text-xs text-muted-foreground">Trading insights, platform updates, and education</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="border-b border-border bg-secondary/10">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2 rounded border text-sm flex items-center gap-2 transition ${
                    selectedCategory === cat.name
                      ? 'bg-primary text-background border-primary'
                      : 'bg-card border-border hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="size-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Featured Post */}
        {featuredPost && selectedCategory === "All Posts" && !searchQuery && (
          <Card className="p-8 mb-12 bg-gradient-to-br from-secondary/30 to-background">
            <Badge className="mb-4 bg-primary text-background">Featured</Badge>
            <h2 className="text-2xl font-bold mb-4">{featuredPost.title}</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {featuredPost.excerpt}
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <User className="size-4" />
                {featuredPost.author}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                {featuredPost.readTime} read
              </div>
              <Badge variant="outline">{featuredPost.category}</Badge>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              Read Article
            </Button>
          </Card>
        )}

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="p-6 flex flex-col hover:border-primary/50 transition cursor-pointer">
              <Badge variant="outline" className="mb-3 w-fit">{post.category}</Badge>
              <h3 className="font-semibold mb-3 line-clamp-2">{post.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <User className="size-3" />
                  {post.author}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-3" />
                  {post.readTime}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{post.date}</p>
            </Card>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="size-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No articles found matching your search.</p>
          </div>
        )}

        {/* Newsletter CTA */}
        <Card className="mt-12 p-8 text-center bg-gradient-to-br from-secondary/20 to-background">
          <h3 className="text-xl font-bold mb-2">Never Miss an Update</h3>
          <p className="text-muted-foreground mb-6">
            Subscribe to our newsletter for weekly trading insights and platform updates.
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <Input placeholder="your.email@example.com" />
            <Button className="bg-primary hover:bg-primary/90">Subscribe</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
