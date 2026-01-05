-- Blog System for SEO and Content Marketing
-- Creates tables for blog posts, categories, and related SEO fields

-- 1. Blog Categories Table
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

-- 2. Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL, -- Full HTML/Markdown content
  featured_image_url TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  
  -- SEO Fields
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image_url TEXT,
  
  -- Status and Publishing
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  
  -- Analytics and Engagement
  view_count INTEGER NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_published_at CHECK (
    (status = 'published' AND published_at IS NOT NULL) OR 
    (status != 'published')
  )
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Full-text search index for blog posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON blog_posts USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
);

-- 3. Blog Tags Table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- 4. Blog Post Tags Junction Table
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON blog_post_tags(tag_id);

-- Enable RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_categories (public read)
CREATE POLICY "Blog categories are viewable by everyone"
  ON blog_categories FOR SELECT
  USING (true);

-- RLS Policies for blog_posts (public can view published posts)
CREATE POLICY "Published blog posts are viewable by everyone"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can view all blog posts"
  ON blog_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert blog posts"
  ON blog_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update blog posts"
  ON blog_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete blog posts"
  ON blog_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for blog_tags (public read)
CREATE POLICY "Blog tags are viewable by everyone"
  ON blog_tags FOR SELECT
  USING (true);

-- RLS Policies for blog_post_tags (public read for published posts)
CREATE POLICY "Blog post tags are viewable for published posts"
  ON blog_post_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_tags.post_id
      AND blog_posts.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Insert default categories
INSERT INTO blog_categories (name, slug, description) VALUES
  ('Car Rental Tips', 'car-rental-tips', 'Tips and guides for renting cars'),
  ('Travel Guides', 'travel-guides', 'Travel guides and destination information'),
  ('Vehicle Maintenance', 'vehicle-maintenance', 'Tips for maintaining your rental vehicle'),
  ('Dealer Resources', 'dealer-resources', 'Resources and guides for dealers'),
  ('Platform Updates', 'platform-updates', 'Updates and announcements about Carsera'),
  ('Industry News', 'industry-news', 'Latest news from the car rental industry')
ON CONFLICT (slug) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Function to calculate reading time (rough estimate: 200 words per minute)
CREATE OR REPLACE FUNCTION calculate_reading_time(content_text TEXT)
RETURNS INTEGER AS $$
DECLARE
  word_count INTEGER;
BEGIN
  -- Remove HTML tags and count words
  word_count := array_length(string_to_array(regexp_replace(content_text, '<[^>]+>', '', 'g'), ' '), 1);
  -- Calculate reading time (200 words per minute)
  RETURN GREATEST(1, CEIL(word_count::NUMERIC / 200));
END;
$$ LANGUAGE plpgsql IMMUTABLE;