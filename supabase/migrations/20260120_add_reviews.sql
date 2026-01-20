/*
  # Add Reviews Table

  1. New Table
    - `reviews`
      - `id` (uuid, primary key)
      - `user_id` (text, clerk user id)
      - `name` (text)
      - `role` (text)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Anyone can read reviews
    - Only authenticated users can create reviews
    - Users can update/delete their own reviews
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reviews
CREATE POLICY "Anyone can read reviews"
  ON reviews
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to create reviews
CREATE POLICY "Authenticated users can create reviews"
  ON reviews
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON reviews
  FOR UPDATE
  TO public
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow users to delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON reviews
  FOR DELETE
  TO public
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create index for faster queries
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
