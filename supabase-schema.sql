-- =====================================================
-- ELEVEN VIEWS PLATFORM - DATABASE SCHEMA
-- Billion Dollar Infrastructure for Media + A&R Hub
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users & Team Members
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'member', -- admin, producer, artist, ar_manager, client
    department VARCHAR(100),
    title VARCHAR(100),
    phone VARCHAR(50),
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artists / Roster
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    stage_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    genre VARCHAR(100),
    sub_genres TEXT[],
    bio TEXT,
    profile_image_url TEXT,
    cover_image_url TEXT,
    social_links JSONB DEFAULT '{}',
    streaming_links JSONB DEFAULT '{}', -- spotify, apple music, etc
    contract_status VARCHAR(50) DEFAULT 'prospect', -- prospect, signed, released
    contract_start DATE,
    contract_end DATE,
    manager_id UUID REFERENCES users(id),
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MEDIA & ASSETS
-- =====================================================

-- Media Assets (Videos, Photos, Audio)
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    media_type VARCHAR(50) NOT NULL, -- video, photo, audio, document
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    waveform_data JSONB, -- for audio visualization
    file_size BIGINT, -- in bytes
    duration INTEGER, -- in seconds (for audio/video)
    width INTEGER, -- for images/video
    height INTEGER,
    format VARCHAR(50), -- mp4, mp3, jpg, etc
    codec VARCHAR(50),
    bitrate INTEGER,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    folder_id UUID,
    project_id UUID,
    uploaded_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    storage_provider VARCHAR(50) DEFAULT 'supabase', -- supabase, cloudflare_r2, s3
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Folders (Organization)
CREATE TABLE media_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES media_folders(id),
    project_id UUID,
    color VARCHAR(20),
    icon VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- A&R HUB - DEMO SUBMISSIONS
-- =====================================================

-- Demo Submissions
CREATE TABLE demos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    artist_email VARCHAR(255),
    artist_phone VARCHAR(50),
    artist_social JSONB DEFAULT '{}',
    genre VARCHAR(100),
    sub_genre VARCHAR(100),
    description TEXT,

    -- Audio file
    audio_url TEXT NOT NULL,
    audio_duration INTEGER, -- seconds
    waveform_data JSONB,

    -- Submission metadata
    submission_source VARCHAR(100), -- website, email, referral, event
    referral_source VARCHAR(255),

    -- Review workflow
    status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, approved, rejected, signed
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    assigned_to UUID REFERENCES users(id),

    -- Ratings (1-10 scale)
    rating_overall DECIMAL(3,1),
    rating_production DECIMAL(3,1),
    rating_vocals DECIMAL(3,1),
    rating_lyrics DECIMAL(3,1),
    rating_commercial DECIMAL(3,1),

    -- Notes
    internal_notes TEXT,
    feedback_to_artist TEXT,

    -- Tracking
    listened_count INTEGER DEFAULT 0,
    last_listened_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo Comments (Team Discussion)
CREATE TABLE demo_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demo_id UUID REFERENCES demos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    comment TEXT NOT NULL,
    timestamp_seconds INTEGER, -- Comment at specific point in track
    is_internal BOOLEAN DEFAULT true, -- Internal vs shareable with artist
    parent_id UUID REFERENCES demo_comments(id), -- For threaded replies
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo Tags (for filtering/search)
CREATE TABLE demo_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demo_id UUID REFERENCES demos(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PRODUCTION PROJECTS
-- =====================================================

-- Projects (Video/Photo Shoots, Campaigns)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    project_type VARCHAR(50), -- video_production, photo_shoot, music_video, campaign, brand_content
    status VARCHAR(50) DEFAULT 'planning', -- planning, pre_production, production, post_production, delivered, archived

    -- Client info
    client_id UUID,
    client_name VARCHAR(255),
    client_contact VARCHAR(255),

    -- Location
    location VARCHAR(255),
    location_details JSONB, -- coordinates, venue, permits

    -- Timeline
    start_date DATE,
    end_date DATE,
    deadline DATE,

    -- Budget
    budget DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Team
    producer_id UUID REFERENCES users(id),
    director_id UUID REFERENCES users(id),
    team_members UUID[],

    -- Deliverables
    deliverables JSONB DEFAULT '[]',

    -- Files
    brief_url TEXT,
    contract_url TEXT,

    -- Metadata
    tags TEXT[],
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Tasks
CREATE TABLE project_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, review, done
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MUSIC RELEASES
-- =====================================================

-- Music Releases (Albums, Singles, EPs)
CREATE TABLE releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    artist_id UUID REFERENCES artists(id),
    release_type VARCHAR(50), -- single, ep, album, mixtape
    cover_art_url TEXT,
    release_date DATE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, released

    -- Distribution
    upc_code VARCHAR(50),
    isrc_codes JSONB,
    distributor VARCHAR(100),

    -- Streaming links
    spotify_url TEXT,
    apple_music_url TEXT,
    youtube_url TEXT,
    soundcloud_url TEXT,
    other_links JSONB DEFAULT '{}',

    -- Stats
    total_streams BIGINT DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,

    -- Metadata
    genre VARCHAR(100),
    description TEXT,
    credits JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks
CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    track_number INTEGER,
    duration INTEGER, -- seconds
    audio_url TEXT,
    preview_url TEXT, -- 30 sec preview
    waveform_data JSONB,

    -- Metadata
    isrc_code VARCHAR(50),
    bpm INTEGER,
    key VARCHAR(10),
    explicit BOOLEAN DEFAULT false,
    lyrics TEXT,
    credits JSONB DEFAULT '{}',

    -- Stats
    play_count BIGINT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CLIENTS & CAMPAIGNS
-- =====================================================

-- Clients (Brands)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    industry VARCHAR(100),
    logo_url TEXT,
    website VARCHAR(500),

    -- Contact
    primary_contact VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,

    -- Relationship
    status VARCHAR(50) DEFAULT 'active', -- prospect, active, inactive, churned
    tier VARCHAR(20), -- bronze, silver, gold, platinum
    account_manager_id UUID REFERENCES users(id),

    -- Financials
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',

    -- Notes
    notes TEXT,
    tags TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    client_id UUID REFERENCES clients(id),
    project_id UUID REFERENCES projects(id),

    -- Campaign details
    objective TEXT,
    target_audience TEXT,
    platforms TEXT[], -- instagram, youtube, tiktok, etc

    -- Timeline
    start_date DATE,
    end_date DATE,

    -- Budget
    budget DECIMAL(12,2),
    spent DECIMAL(12,2) DEFAULT 0,

    -- Performance
    impressions BIGINT DEFAULT 0,
    reach BIGINT DEFAULT 0,
    engagement BIGINT DEFAULT 0,
    conversions INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'planning',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACTIVITY & NOTIFICATIONS
-- =====================================================

-- Activity Feed
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- created, updated, commented, uploaded, played, etc
    entity_type VARCHAR(50), -- demo, project, media, release, etc
    entity_id UUID,
    entity_title VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50), -- demo_assigned, comment_mention, project_update, etc
    title VARCHAR(255),
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAYLISTS & COLLECTIONS
-- =====================================================

-- Playlists (for internal curation)
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist Tracks
CREATE TABLE playlist_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    track_id UUID, -- Can reference tracks or demos
    track_type VARCHAR(20), -- release_track, demo
    position INTEGER,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_media_assets_type ON media_assets(media_type);
CREATE INDEX idx_media_assets_project ON media_assets(project_id);
CREATE INDEX idx_media_assets_tags ON media_assets USING GIN(tags);

CREATE INDEX idx_demos_status ON demos(status);
CREATE INDEX idx_demos_assigned ON demos(assigned_to);
CREATE INDEX idx_demos_genre ON demos(genre);
CREATE INDEX idx_demos_submitted ON demos(submitted_at DESC);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client ON projects(client_id);

CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Team members can view all demos
CREATE POLICY "Team can view demos" ON demos
    FOR SELECT USING (true);

-- Only assigned users or admins can update demos
CREATE POLICY "Assigned users can update demos" ON demos
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- =====================================================

-- Create these buckets in Supabase Storage:
-- 1. media-assets (public) - videos, photos
-- 2. audio-files (private) - demos, tracks
-- 3. avatars (public) - user/artist images
-- 4. documents (private) - contracts, briefs
-- 5. covers (public) - release artwork

COMMENT ON TABLE demos IS 'A&R Hub - Song demo submissions for review';
COMMENT ON TABLE media_assets IS 'Large media storage - videos, photos, audio files';
COMMENT ON TABLE releases IS 'Music releases - albums, singles, EPs';
COMMENT ON TABLE projects IS 'Production projects - video shoots, campaigns';
