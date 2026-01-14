import React, { useState, useEffect, useRef } from 'react';
import { Mail, Send, Eye, Sparkles, FileText, Users, BarChart3, Plus, Trash2, Copy, Check, RefreshCw, Zap, Globe, Download, BookOpen, Loader2, ExternalLink, Image, Edit3, Wand2, Camera, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { AI_MODELS, AI_ENDPOINTS, getGoogleAIKey } from '../services/aiConfig';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
}

interface EmailRecord {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'opened' | 'clicked' | 'bounced';
  sentAt: string;
  openedAt?: string;
}

interface ScrapedData {
  company: {
    name: string;
    domain: string;
    industry: string;
    description: string;
    tagline?: string;
  };
  contact: {
    emails: string[];
    phones: string[];
    addresses: string[];
    socialLinks: string[];
  };
  media: {
    images: { src: string; alt: string; width?: number; height?: number }[];
    logos: string[];
    heroImages: string[];
  };
  content: {
    headings: { level: number; text: string }[];
    services: string[];
    products: string[];
    ctas: string[];
  };
  intelligence: {
    strengths: string[];
    opportunities: string[];
    competitors: string[];
    news: { title: string; snippet: string; age?: string }[];
    reviews: { source: string; snippet: string }[];
  };
}

interface EmailBuilderModuleProps {
  user?: {
    name: string;
    email?: string;
  };
}

// API Endpoints
const N8N_WEBHOOK_URL = 'https://n8n.srv1167160.hstgr.cloud/webhook/send-email';
const N8N_CLAUDE_WEBHOOK = 'https://n8n.srv1167160.hstgr.cloud/webhook/claude-playbook';
const SCRAPER_API_URL = 'https://scraper.elevenviews.io/api';
const GEMINI_API_KEY = getGoogleAIKey();

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: '1',
    name: 'Welcome Email',
    subject: 'Welcome to Eleven Views!',
    body: `Hi there,

Welcome to Eleven Views! We're thrilled to have you join our community of forward-thinking brands ready to dominate their markets.

Your journey to brand dominance starts here. We've prepared everything you need to get started.

Best regards,
The Eleven Views Team`,
    fromName: 'Eleven Views',
    fromEmail: 'contact@elevenviews.io'
  },
  {
    id: '2',
    name: 'Growth Opportunity',
    subject: 'Strategic Growth Opportunity for Your Brand',
    body: `Hi there,

I've been researching brands in your space, and yours caught my attention. You've built something real — but I think you're leaving significant growth on the table.

After analyzing your brand, I identified 3 immediate opportunities that could transform your market position within 90 days.

Would you be open to a quick call to discuss?

Best regards,
Lance Reid Jr.
Founder & Chief Strategist`,
    fromName: 'Lance Reid Jr.',
    fromEmail: 'lance@elevenviews.io'
  },
  {
    id: '3',
    name: 'Follow-up',
    subject: 'Quick follow-up on our conversation',
    body: `Hi there,

Just wanted to follow up on our previous conversation. I hope you had a chance to review the materials I sent over.

Let me know if you have any questions or if you'd like to schedule a call to discuss next steps.

Looking forward to hearing from you!

Best regards,
Eleven Views Team`,
    fromName: 'Eleven Views',
    fromEmail: 'contact@elevenviews.io'
  }
];

const SENDERS = [
  { id: 'lance', name: 'Lance Reid Jr.', email: 'lance@elevenviews.io', title: 'Founder & Chief Strategist' },
  { id: 'ahmed', name: 'Ahmed Jibril', email: 'ahmed@elevenviews.io', title: 'Growth Director' },
  { id: 'aaron', name: 'Aaron Ellis', email: 'aaron@elevenviews.io', title: 'Partner' },
  { id: 'contact', name: 'Eleven Views Team', email: 'contact@elevenviews.io', title: 'Strategic Partnerships' }
];

const EmailBuilderModule: React.FC<EmailBuilderModuleProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'sent' | 'analytics' | 'playbook'>('compose');
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);

  // Playbook state
  const [playbookUrl, setPlaybookUrl] = useState('');
  const [playbookGenerating, setPlaybookGenerating] = useState(false);
  const [playbookProgress, setPlaybookProgress] = useState('');
  const [playbookStep, setPlaybookStep] = useState(0);
  const [generatedPlaybook, setGeneratedPlaybook] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Revision state
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [revisionLoading, setRevisionLoading] = useState(false);

  // Composer state
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedSender, setSelectedSender] = useState(SENDERS[0]);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Email revision state
  const [emailRevisionMode, setEmailRevisionMode] = useState(false);
  const [emailRevisionPrompt, setEmailRevisionPrompt] = useState('');

  // Analytics state
  const [stats, setStats] = useState({
    totalSent: 0,
    opened: 0,
    clicked: 0,
    bounced: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('eleven-views-sent-emails');
    if (saved) {
      const emails = JSON.parse(saved);
      setSentEmails(emails);
      updateStats(emails);
    }
  }, []);

  const updateStats = (emails: EmailRecord[]) => {
    setStats({
      totalSent: emails.length,
      opened: emails.filter(e => e.status === 'opened' || e.status === 'clicked').length,
      clicked: emails.filter(e => e.status === 'clicked').length,
      bounced: emails.filter(e => e.status === 'bounced').length
    });
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setBody(template.body);
    const sender = SENDERS.find(s => s.email === template.fromEmail) || SENDERS[0];
    setSelectedSender(sender);
  };

  const handleSend = async () => {
    if (!recipient || !subject || !body) {
      alert('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      const trackingId = `rl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const emailHtml = generateEmailHtml(subject, body, selectedSender);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          from: selectedSender.email,
          fromName: selectedSender.name,
          subject: subject,
          html: emailHtml,
          trackingId: trackingId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const emailRecord: EmailRecord = {
        id: trackingId,
        to: recipient,
        subject: subject,
        status: 'sent',
        sentAt: new Date().toISOString()
      };

      const updatedEmails = [emailRecord, ...sentEmails];
      setSentEmails(updatedEmails);
      localStorage.setItem('eleven-views-sent-emails', JSON.stringify(updatedEmails));
      updateStats(updatedEmails);

      setRecipient('');
      setSubject('');
      setBody('');
      setSelectedTemplate(null);

      alert('Email sent successfully!');
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const generateEmailHtml = (subject: string, body: string, sender: typeof SENDERS[0]) => {
    const formattedBody = body.replace(/\n/g, '<br>');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f1410; color: #e8e8e8;">
  <div style="height: 4px; background: linear-gradient(90deg, #F5D547 0%, #D4B83A 50%, #4A7C4E 100%);"></div>
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 24px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: rgba(245, 213, 71, 0.15); border: 1px solid rgba(245, 213, 71, 0.3); padding: 8px 20px; border-radius: 100px;">
        <span style="color: #F5D547; font-size: 12px; font-weight: 600; letter-spacing: 2px;">ELEVEN VIEWS</span>
      </div>
    </div>
    <div style="background: #141a16; border: 1px solid rgba(245, 213, 71, 0.2); border-radius: 16px; padding: 32px;">
      <p style="color: #e8e8e8; font-size: 16px; line-height: 1.8; margin: 0;">${formattedBody}</p>
    </div>
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(245, 213, 71, 0.1); text-align: center;">
      <p style="color: #888; font-size: 12px; margin: 0;">${sender.name} | ${sender.title}</p>
      <p style="color: #666; font-size: 11px; margin: 8px 0 0 0;">Eleven Views | elevenviews.io</p>
    </div>
  </div>
</body>
</html>`;
  };

  // ============================================
  // SCRAPING FUNCTIONS
  // ============================================

  const scrapeWebsite = async (url: string): Promise<ScrapedData | null> => {
    try {
      setPlaybookProgress('Scraping website data...');
      setPlaybookStep(1);

      // Call scraper API for media and basic data
      const scrapeResponse = await fetch(`${SCRAPER_API_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          includeImages: true,
          includeVideos: false,
          minWidth: 200,
          minHeight: 200
        })
      });

      let mediaData = null;
      if (scrapeResponse.ok) {
        mediaData = await scrapeResponse.json();
      }

      setPlaybookProgress('Gathering business intelligence...');
      setPlaybookStep(2);

      // Extract domain and company name
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const domain = urlObj.hostname.replace('www.', '');
      const companyName = domain.split('.')[0];
      const displayName = companyName.charAt(0).toUpperCase() + companyName.slice(1);

      // Call intelligence dossier API
      let dossierData = null;
      try {
        const dossierResponse = await fetch(`${SCRAPER_API_URL}/intelligence/dossier/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: displayName,
            domain: domain
          })
        });
        if (dossierResponse.ok) {
          dossierData = await dossierResponse.json();
        }
      } catch (e) {
        console.log('Dossier API not available, using AI fallback');
      }

      // Combine scraped data
      const combinedData: ScrapedData = {
        company: {
          name: displayName,
          domain: domain,
          industry: dossierData?.industry || 'Business Services',
          description: dossierData?.description || mediaData?.meta?.description || '',
          tagline: mediaData?.tagline || ''
        },
        contact: {
          emails: dossierData?.contact?.emails || mediaData?.emails || [],
          phones: dossierData?.contact?.phones || mediaData?.phones || [],
          addresses: dossierData?.contact?.addresses || [],
          socialLinks: dossierData?.contact?.socialLinks || []
        },
        media: {
          images: mediaData?.images?.map((img: any) => ({
            src: img.src || img.url,
            alt: img.alt || '',
            width: img.width,
            height: img.height
          })) || [],
          logos: mediaData?.logos || [],
          heroImages: mediaData?.heroImages || mediaData?.images?.slice(0, 3).map((img: any) => img.src || img.url) || []
        },
        content: {
          headings: dossierData?.headings || [],
          services: dossierData?.services || [],
          products: dossierData?.products || [],
          ctas: dossierData?.ctas || []
        },
        intelligence: {
          strengths: dossierData?.strengths || [],
          opportunities: dossierData?.opportunities || [],
          competitors: dossierData?.competitors || [],
          news: dossierData?.news || [],
          reviews: dossierData?.reviews || []
        }
      };

      return combinedData;
    } catch (error) {
      console.error('Scraping error:', error);
      return null;
    }
  };

  // ============================================
  // CLAUDE AI PLAYBOOK GENERATION (via n8n)
  // ============================================

  const generatePlaybookWithClaude = async (data: ScrapedData, images: string[]): Promise<string | null> => {
    try {
      setPlaybookProgress('Generating playbook with Claude AI...');
      setPlaybookStep(3);

      // Try n8n Claude webhook first for consistent results
      try {
        const claudeResponse = await fetch(N8N_CLAUDE_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: data.company,
            intelligence: data.intelligence,
            services: data.content.services,
            images: images,
            type: 'playbook'
          })
        });

        if (claudeResponse.ok) {
          const claudeData = await claudeResponse.json();
          if (claudeData.playbook) {
            return claudeData.playbook;
          }
        }
      } catch (e) {
        console.log('Claude webhook not available, using Gemini fallback');
      }

      // Fallback to Gemini for playbook generation
      setPlaybookProgress('Analyzing with AI...');

      const prompt = `You are a strategic consultant creating a comprehensive business playbook for ${data.company.name}.

Company Information:
- Industry: ${data.company.industry}
- Description: ${data.company.description}
- Services: ${data.content.services.join(', ')}

Intelligence Data:
- Strengths: ${data.intelligence.strengths.join(', ')}
- Opportunities: ${data.intelligence.opportunities.join(', ')}
- Competitors: ${data.intelligence.competitors.join(', ')}

Generate a detailed JSON analysis with:
{
  "executiveSummary": "2-3 paragraph executive summary",
  "strengths": [{"title": "...", "description": "...", "metric": "..."}],
  "opportunities": [{"title": "...", "description": "...", "window": "..."}],
  "competitiveAdvantages": ["advantage 1", "advantage 2", "advantage 3"],
  "targetAudience": {"primary": "...", "secondary": "...", "psychographics": "..."},
  "growthStrategy": {
    "phase1": {"title": "...", "actions": ["..."], "timeline": "Days 1-30"},
    "phase2": {"title": "...", "actions": ["..."], "timeline": "Days 31-60"},
    "phase3": {"title": "...", "actions": ["..."], "timeline": "Days 61-90"}
  },
  "kpis": [{"metric": "...", "target": "...", "current": "..."}],
  "quickWins": ["win 1", "win 2", "win 3"],
  "infrastructure": ["tech 1", "tech 2", "tech 3"],
  "nextSteps": ["step 1", "step 2", "step 3"]
}

Only respond with valid JSON, no markdown or explanation.`;

      const response = await fetch(
        `${AI_ENDPOINTS.gemini}/${AI_MODELS.text.default}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const aiData = await response.json();
      const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let analysis;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse AI response');
      }

      // Generate comprehensive playbook HTML
      setPlaybookProgress('Building playbook document...');
      setPlaybookStep(4);

      return generateComprehensivePlaybookHtml(data, analysis, images);
    } catch (error) {
      console.error('Playbook generation error:', error);
      return null;
    }
  };

  // ============================================
  // COMPREHENSIVE PLAYBOOK HTML (Day Hill Dome Style)
  // ============================================

  const generateComprehensivePlaybookHtml = (data: ScrapedData, analysis: any, images: string[]): string => {
    const ai = analysis || {};
    const heroImage = images[0] || '';
    const galleryImages = images.slice(1, 5);

    const strengths = ai.strengths || data.intelligence.strengths.map((s: string) => ({ title: s, description: '', metric: '' }));
    const opportunities = ai.opportunities || data.intelligence.opportunities.map((o: string) => ({ title: o, description: '', window: 'Q1-Q2' }));
    const quickWins = ai.quickWins || ['Website optimization', 'SEO enhancement', 'Social media activation'];
    const kpis = ai.kpis || [
      { metric: 'Traffic Growth', target: '+180%', current: 'Baseline' },
      { metric: 'Lead Generation', target: '+150%', current: 'Baseline' },
      { metric: 'Conversion Rate', target: '2.3x', current: 'Baseline' }
    ];

    const growthStrategy = ai.growthStrategy || {
      phase1: { title: 'Foundation', actions: ['Brand audit', 'Competitor analysis', 'Strategy alignment'], timeline: 'Days 1-30' },
      phase2: { title: 'Build', actions: ['Website optimization', 'Content creation', 'Marketing systems'], timeline: 'Days 31-60' },
      phase3: { title: 'Scale', actions: ['Campaign launch', 'Performance optimization', 'Growth acceleration'], timeline: 'Days 61-90' }
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strategic Playbook - ${data.company.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --color-bg-dark: #0a1420;
            --color-bg-section: #0d1a2a;
            --color-bg-card: #112233;
            --color-border: rgba(74, 159, 212, 0.2);
            --color-accent: #4a9fd4;
            --color-accent-light: #6bb8e8;
            --color-gold: #F5D547;
            --color-text: #e8eef3;
            --color-text-muted: #8fa4bc;
            --color-success: #4ade80;
        }

        body {
            font-family: 'Montserrat', system-ui, sans-serif;
            background: var(--color-bg-dark);
            color: var(--color-text);
            line-height: 1.6;
            overflow-x: hidden;
        }

        .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

        /* Header Bar */
        .header-bar {
            height: 4px;
            background: linear-gradient(90deg, #4a9fd4 0%, #2d6da8 50%, #153050 100%);
        }

        /* Hero Section */
        .hero {
            position: relative;
            min-height: 500px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 80px 24px;
            background: linear-gradient(180deg, var(--color-bg-dark) 0%, var(--color-bg-section) 100%);
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: url('${heroImage}') center/cover no-repeat;
            opacity: 0.15;
            filter: blur(2px);
        }

        .hero-content { position: relative; z-index: 2; }

        .hero-badge {
            display: inline-block;
            background: rgba(74, 159, 212, 0.15);
            border: 1px solid var(--color-border);
            padding: 8px 20px;
            border-radius: 100px;
            color: var(--color-accent);
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 24px;
        }

        .hero-title {
            font-family: 'Orbitron', sans-serif;
            font-size: clamp(32px, 5vw, 52px);
            font-weight: 700;
            color: #fff;
            margin-bottom: 16px;
            text-shadow: 0 0 40px rgba(74, 159, 212, 0.3);
        }

        .hero-title .highlight { color: var(--color-accent); }

        .hero-subtitle {
            font-size: 18px;
            color: var(--color-text-muted);
            max-width: 600px;
            margin: 0 auto;
        }

        .hero-meta {
            margin-top: 32px;
            display: flex;
            gap: 24px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .hero-meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--color-text-muted);
            font-size: 13px;
        }

        .hero-meta-item .dot {
            width: 8px;
            height: 8px;
            background: var(--color-accent);
            border-radius: 50%;
        }

        /* Navigation */
        .nav {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(10, 20, 32, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--color-border);
            padding: 16px 0;
        }

        .nav-inner {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding: 4px;
            -webkit-overflow-scrolling: touch;
        }

        .nav-item {
            flex-shrink: 0;
            padding: 10px 16px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 8px;
            color: var(--color-text-muted);
            font-family: 'Rajdhani', sans-serif;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
        }

        .nav-item:hover, .nav-item.active {
            background: rgba(74, 159, 212, 0.1);
            border-color: var(--color-border);
            color: var(--color-accent);
        }

        /* Sections */
        .section {
            padding: 80px 0;
            border-bottom: 1px solid var(--color-border);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 40px;
        }

        .section-number {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, var(--color-accent), #2d6da8);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Orbitron', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: #fff;
            box-shadow: 0 0 30px rgba(74, 159, 212, 0.3);
        }

        .section-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            font-weight: 600;
            color: #fff;
        }

        /* Cards */
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        .card {
            background: var(--color-bg-card);
            border: 1px solid var(--color-border);
            border-radius: 16px;
            padding: 28px;
            transition: all 0.3s ease;
        }

        .card:hover {
            border-color: var(--color-accent);
            box-shadow: 0 0 40px rgba(74, 159, 212, 0.15);
            transform: translateY(-4px);
        }

        .card-accent {
            border-left: 4px solid var(--color-accent);
        }

        .card-title {
            font-family: 'Rajdhani', sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 12px;
        }

        .card-text {
            color: var(--color-text-muted);
            font-size: 14px;
            line-height: 1.7;
        }

        .card-metric {
            display: inline-block;
            margin-top: 16px;
            padding: 6px 14px;
            background: rgba(74, 222, 128, 0.1);
            border: 1px solid rgba(74, 222, 128, 0.3);
            border-radius: 100px;
            color: var(--color-success);
            font-family: 'Orbitron', sans-serif;
            font-size: 13px;
            font-weight: 600;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }

        .stat-box {
            background: linear-gradient(135deg, rgba(74, 159, 212, 0.1), rgba(45, 109, 168, 0.05));
            border: 1px solid var(--color-border);
            border-radius: 16px;
            padding: 32px;
            text-align: center;
        }

        .stat-value {
            font-family: 'Orbitron', sans-serif;
            font-size: 42px;
            font-weight: 700;
            color: var(--color-accent);
            text-shadow: 0 0 30px rgba(74, 159, 212, 0.4);
        }

        .stat-label {
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 8px;
        }

        /* Timeline */
        .timeline {
            position: relative;
            padding-left: 40px;
        }

        .timeline::before {
            content: '';
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(180deg, var(--color-accent), var(--color-bg-dark));
        }

        .timeline-item {
            position: relative;
            padding: 24px 0;
        }

        .timeline-dot {
            position: absolute;
            left: -33px;
            top: 32px;
            width: 16px;
            height: 16px;
            background: var(--color-accent);
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(74, 159, 212, 0.5);
        }

        .timeline-phase {
            font-family: 'Rajdhani', sans-serif;
            font-size: 11px;
            font-weight: 700;
            color: var(--color-accent);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }

        .timeline-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 20px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 12px;
        }

        .timeline-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .timeline-action {
            padding: 6px 14px;
            background: rgba(74, 159, 212, 0.1);
            border: 1px solid var(--color-border);
            border-radius: 100px;
            color: var(--color-text-muted);
            font-size: 12px;
        }

        /* Image Gallery */
        .gallery {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 40px 0;
        }

        .gallery-item {
            aspect-ratio: 16/10;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--color-border);
        }

        .gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }

        .gallery-item:hover img {
            transform: scale(1.1);
        }

        /* CTA Box */
        .cta-box {
            background: linear-gradient(135deg, rgba(74, 159, 212, 0.15), rgba(45, 109, 168, 0.1));
            border: 1px solid var(--color-accent);
            border-radius: 24px;
            padding: 48px;
            text-align: center;
            margin: 60px 0;
            position: relative;
            overflow: hidden;
        }

        .cta-box::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(74, 159, 212, 0.1) 0%, transparent 70%);
            animation: pulse 4s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }

        .cta-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 16px;
            position: relative;
        }

        .cta-text {
            color: var(--color-text-muted);
            font-size: 16px;
            margin-bottom: 32px;
            position: relative;
        }

        .cta-button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, var(--color-accent), #2d6da8);
            border: none;
            border-radius: 12px;
            color: #fff;
            font-family: 'Rajdhani', sans-serif;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            box-shadow: 0 0 30px rgba(74, 159, 212, 0.4);
        }

        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 0 50px rgba(74, 159, 212, 0.6);
        }

        /* Footer */
        .footer {
            padding: 60px 0;
            text-align: center;
            background: var(--color-bg-section);
        }

        .footer-brand {
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            font-weight: 700;
            color: var(--color-accent);
            letter-spacing: 4px;
            margin-bottom: 16px;
        }

        .footer-text {
            color: var(--color-text-muted);
            font-size: 13px;
        }

        .footer-text a {
            color: var(--color-accent);
            text-decoration: none;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .gallery { grid-template-columns: repeat(2, 1fr); }
            .hero { min-height: 400px; padding: 60px 24px; }
            .section { padding: 60px 0; }
            .card-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header-bar"></div>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <div class="hero-badge">Strategic Playbook</div>
            <h1 class="hero-title">Growth Strategy for <span class="highlight">${data.company.name}</span></h1>
            <p class="hero-subtitle">${ai.executiveSummary?.substring(0, 150) || 'Maximizing what\'s working. Unlocking what\'s possible.'}</p>
            <div class="hero-meta">
                <div class="hero-meta-item"><span class="dot"></span> ${data.company.industry}</div>
                <div class="hero-meta-item"><span class="dot"></span> ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                <div class="hero-meta-item"><span class="dot"></span> 90-Day Roadmap</div>
            </div>
        </div>
    </section>

    <!-- Navigation -->
    <nav class="nav">
        <div class="container">
            <div class="nav-inner">
                <a href="#overview" class="nav-item active">01 Overview</a>
                <a href="#strengths" class="nav-item">02 Strengths</a>
                <a href="#opportunities" class="nav-item">03 Opportunities</a>
                <a href="#strategy" class="nav-item">04 Strategy</a>
                <a href="#growth" class="nav-item">05 Growth</a>
                <a href="#infrastructure" class="nav-item">06 Infrastructure</a>
                <a href="#kpis" class="nav-item">07 KPIs</a>
                <a href="#next-steps" class="nav-item">08 Next Steps</a>
            </div>
        </div>
    </nav>

    <!-- Section 1: Overview -->
    <section id="overview" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">01</div>
                <h2 class="section-title">Company Overview</h2>
            </div>

            <div class="card card-accent" style="margin-bottom: 24px;">
                <p style="color: var(--color-text); font-size: 16px; line-height: 1.8;">
                    ${ai.executiveSummary || `${data.company.name} operates in the ${data.company.industry} sector with significant untapped growth potential. This strategic playbook outlines a comprehensive 90-day roadmap to accelerate market penetration, optimize operations, and establish category leadership.`}
                </p>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">90</div>
                    <div class="stat-label">Day Roadmap</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${data.content.services.length || 5}+</div>
                    <div class="stat-label">Growth Levers</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${data.intelligence.opportunities.length || 6}</div>
                    <div class="stat-label">Opportunities</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">3x</div>
                    <div class="stat-label">ROI Target</div>
                </div>
            </div>

            ${galleryImages.length > 0 ? `
            <div class="gallery">
                ${galleryImages.map(img => `<div class="gallery-item"><img src="${img}" alt="Company image" loading="lazy"></div>`).join('')}
            </div>
            ` : ''}
        </div>
    </section>

    <!-- Section 2: Strengths -->
    <section id="strengths" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">02</div>
                <h2 class="section-title">Core Strengths</h2>
            </div>

            <div class="card-grid">
                ${(Array.isArray(strengths) ? strengths : data.intelligence.strengths.map((s: string) => ({ title: s, description: '' }))).slice(0, 6).map((strength: any, i: number) => `
                <div class="card">
                    <div class="card-title">${typeof strength === 'string' ? strength : strength.title}</div>
                    <p class="card-text">${typeof strength === 'string' ? '' : strength.description || 'A key competitive advantage that positions the company for sustained growth.'}</p>
                    ${strength.metric ? `<span class="card-metric">${strength.metric}</span>` : ''}
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Section 3: Market Opportunities -->
    <section id="opportunities" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">03</div>
                <h2 class="section-title">Market Opportunities</h2>
            </div>

            <div class="card-grid">
                ${(Array.isArray(opportunities) ? opportunities : data.intelligence.opportunities.map((o: string) => ({ title: o, description: '', window: 'Q1-Q2' }))).slice(0, 6).map((opp: any, i: number) => `
                <div class="card">
                    <div class="card-title">${typeof opp === 'string' ? opp : opp.title}</div>
                    <p class="card-text">${typeof opp === 'string' ? '' : opp.description || 'Strategic opportunity for market expansion and revenue growth.'}</p>
                    <span class="card-metric" style="background: rgba(74, 159, 212, 0.1); border-color: rgba(74, 159, 212, 0.3); color: var(--color-accent);">${opp.window || 'Optimal Window: Q1-Q2'}</span>
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Section 4: Growth Strategy -->
    <section id="strategy" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">04</div>
                <h2 class="section-title">90-Day Growth Strategy</h2>
            </div>

            <div class="timeline">
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-phase">${growthStrategy.phase1?.timeline || 'Days 1-30'}</div>
                    <div class="timeline-title">${growthStrategy.phase1?.title || 'Foundation'}</div>
                    <div class="timeline-actions">
                        ${(growthStrategy.phase1?.actions || ['Brand audit', 'Strategy alignment', 'Competitor analysis']).map((action: string) => `<span class="timeline-action">${action}</span>`).join('')}
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-phase">${growthStrategy.phase2?.timeline || 'Days 31-60'}</div>
                    <div class="timeline-title">${growthStrategy.phase2?.title || 'Build'}</div>
                    <div class="timeline-actions">
                        ${(growthStrategy.phase2?.actions || ['Website optimization', 'Content creation', 'Marketing systems']).map((action: string) => `<span class="timeline-action">${action}</span>`).join('')}
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-phase">${growthStrategy.phase3?.timeline || 'Days 61-90'}</div>
                    <div class="timeline-title">${growthStrategy.phase3?.title || 'Scale'}</div>
                    <div class="timeline-actions">
                        ${(growthStrategy.phase3?.actions || ['Campaign launch', 'Performance optimization', 'Growth acceleration']).map((action: string) => `<span class="timeline-action">${action}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Section 5: Compound Growth -->
    <section id="growth" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">05</div>
                <h2 class="section-title">Quick Wins & Compound Growth</h2>
            </div>

            <div class="stats-grid">
                ${quickWins.slice(0, 4).map((win: string, i: number) => `
                <div class="stat-box">
                    <div class="stat-value" style="font-size: 24px; color: var(--color-success);">✓</div>
                    <div class="stat-label" style="font-size: 14px; letter-spacing: 0; text-transform: none; color: var(--color-text);">${win}</div>
                </div>
                `).join('')}
            </div>

            <div class="card" style="margin-top: 32px;">
                <div class="card-title">The Compound Effect</div>
                <p class="card-text">Each phase builds upon the previous, creating exponential growth momentum. Early quick wins generate data and insights that inform larger strategic moves, while establishing proof points that build stakeholder confidence.</p>
            </div>
        </div>
    </section>

    <!-- Section 6: Infrastructure -->
    <section id="infrastructure" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">06</div>
                <h2 class="section-title">Backend Infrastructure</h2>
            </div>

            <div class="card-grid">
                <div class="card">
                    <div class="card-title">AI-Powered Analytics</div>
                    <p class="card-text">Advanced machine learning models for predictive insights, customer behavior analysis, and automated optimization.</p>
                </div>
                <div class="card">
                    <div class="card-title">Marketing Automation</div>
                    <p class="card-text">Integrated workflow automation for email campaigns, lead nurturing, and multi-channel orchestration.</p>
                </div>
                <div class="card">
                    <div class="card-title">Data Intelligence</div>
                    <p class="card-text">Unified data platform connecting CRM, analytics, and business intelligence for real-time decision making.</p>
                </div>
                <div class="card">
                    <div class="card-title">Scalable Architecture</div>
                    <p class="card-text">Cloud-native infrastructure designed for growth, with enterprise-grade security and 99.9% uptime.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Section 7: KPIs -->
    <section id="kpis" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">07</div>
                <h2 class="section-title">Success Metrics</h2>
            </div>

            <div class="stats-grid">
                ${kpis.slice(0, 4).map((kpi: any) => `
                <div class="stat-box">
                    <div class="stat-value">${kpi.target}</div>
                    <div class="stat-label">${kpi.metric}</div>
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Section 8: Next Steps -->
    <section id="next-steps" class="section">
        <div class="container">
            <div class="section-header">
                <div class="section-number">08</div>
                <h2 class="section-title">Next Steps</h2>
            </div>

            <div class="card-grid">
                ${(ai.nextSteps || ['Schedule strategy call', 'Review competitive analysis', 'Approve 90-day roadmap']).slice(0, 3).map((step: string, i: number) => `
                <div class="card">
                    <div class="card-title">Step ${i + 1}</div>
                    <p class="card-text">${step}</p>
                </div>
                `).join('')}
            </div>

            <div class="cta-box">
                <h3 class="cta-title">Ready to Transform ${data.company.name}?</h3>
                <p class="cta-text">Eleven Views can implement this entire strategy for you.</p>
                <a href="https://elevenviews.io/contact" class="cta-button">Schedule Strategy Call</a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-brand">ELEVEN VIEWS</div>
            <p class="footer-text">
                Prepared exclusively for ${data.company.name} | <a href="https://elevenviews.io">elevenviews.io</a>
            </p>
            <p class="footer-text" style="margin-top: 8px;">
                © ${new Date().getFullYear()} Eleven Views. Confidential.
            </p>
        </div>
    </footer>

    <div class="header-bar"></div>

    <script>
        // Smooth scrolling
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Active section tracking
        const sections = document.querySelectorAll('.section');
        const navItems = document.querySelectorAll('.nav-item');

        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (scrollY >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });

            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href') === '#' + current) {
                    item.classList.add('active');
                }
            });
        });
    </script>
</body>
</html>`;
  };

  // ============================================
  // AI REVISION FUNCTIONS (Google AI)
  // ============================================

  const reviseWithAI = async (content: string, prompt: string, type: 'playbook' | 'email'): Promise<string> => {
    try {
      const systemPrompt = type === 'playbook'
        ? `You are an expert strategic consultant revising a business playbook. Apply the user's requested changes while maintaining the professional tone and structure.`
        : `You are an expert copywriter revising a business email. Apply the user's requested changes while maintaining persuasive, professional language.`;

      const response = await fetch(
        `${AI_ENDPOINTS.gemini}/${AI_MODELS.text.default}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}

Current content:
${content}

User's revision request: ${prompt}

Provide the revised content. For playbooks, output complete HTML. For emails, output plain text.`
              }]
            }]
          })
        }
      );

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || content;
    } catch (error) {
      console.error('Revision error:', error);
      return content;
    }
  };

  const handlePlaybookRevision = async () => {
    if (!revisionPrompt.trim() || !generatedPlaybook) return;

    setRevisionLoading(true);
    try {
      const revisedPlaybook = await reviseWithAI(generatedPlaybook, revisionPrompt, 'playbook');
      setGeneratedPlaybook(revisedPlaybook);
      setRevisionPrompt('');
      setRevisionMode(false);
    } catch (error) {
      console.error('Revision error:', error);
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleEmailRevision = async () => {
    if (!emailRevisionPrompt.trim() || !body) return;

    setAiGenerating(true);
    try {
      const revisedBody = await reviseWithAI(body, emailRevisionPrompt, 'email');
      setBody(revisedBody);
      setEmailRevisionPrompt('');
      setEmailRevisionMode(false);
    } catch (error) {
      console.error('Email revision error:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  // ============================================
  // AI EMAIL GENERATION
  // ============================================

  const handleAIGenerate = async () => {
    if (!recipient) {
      alert('Please enter a recipient email first');
      return;
    }

    setAiGenerating(true);
    try {
      const domain = recipient.split('@')[1] || 'your company';
      const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

      // Use Gemini for smarter email generation
      const prompt = `Generate a personalized cold outreach email for a company called "${companyName}" (domain: ${domain}).

The email should be from ${selectedSender.name}, ${selectedSender.title} at Eleven Views, a strategic marketing agency.

Requirements:
- Professional but warm tone
- Focus on value proposition
- Include 2-3 specific opportunities we could help with
- End with a clear call to action
- Keep it under 200 words

Format:
Subject: [subject line]
---
[email body]`;

      const response = await fetch(
        `${AI_ENDPOINTS.gemini}/${AI_MODELS.text.default}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse subject and body
      const lines = text.split('\n');
      let foundSubject = '';
      let foundBody = '';
      let inBody = false;

      for (const line of lines) {
        if (line.toLowerCase().startsWith('subject:')) {
          foundSubject = line.replace(/^subject:\s*/i, '').trim();
        } else if (line.trim() === '---') {
          inBody = true;
        } else if (inBody) {
          foundBody += line + '\n';
        }
      }

      if (foundSubject) setSubject(foundSubject);
      if (foundBody.trim()) setBody(foundBody.trim());

      if (!foundSubject && !foundBody.trim()) {
        // Fallback if parsing fails
        setSubject(`Strategic Growth Opportunity for ${companyName}`);
        setBody(text);
      }

    } catch (error) {
      console.error('AI generation error:', error);
      // Simple fallback
      const domain = recipient.split('@')[1] || 'your company';
      const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      setSubject(`Strategic Growth Opportunity for ${companyName}`);
      setBody(`Hi there,

I've been researching brands in your space, and ${companyName} caught my attention. You've built something real — but I think you're leaving significant growth on the table.

After analyzing ${companyName}, I identified 3 immediate opportunities that could transform your market position within 90 days.

Would you be open to a quick call to discuss?

Best regards,
${selectedSender.name}
${selectedSender.title}`);
    } finally {
      setAiGenerating(false);
    }
  };

  // ============================================
  // PLAYBOOK GENERATION HANDLER
  // ============================================

  const handleGeneratePlaybook = async () => {
    if (!playbookUrl) return;

    setPlaybookGenerating(true);
    setPlaybookProgress('Initializing...');
    setPlaybookStep(0);
    setGeneratedPlaybook(null);
    setScrapedData(null);
    setSelectedImages([]);

    try {
      let url = playbookUrl;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      // Step 1 & 2: Scrape website data
      const data = await scrapeWebsite(url);

      if (!data) {
        // Create fallback data from URL
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        const companyName = domain.split('.')[0];
        const displayName = companyName.charAt(0).toUpperCase() + companyName.slice(1);

        const fallbackData: ScrapedData = {
          company: { name: displayName, domain, industry: 'Business Services', description: '' },
          contact: { emails: [], phones: [], addresses: [], socialLinks: [] },
          media: { images: [], logos: [], heroImages: [] },
          content: { headings: [], services: [], products: [], ctas: [] },
          intelligence: { strengths: [], opportunities: [], competitors: [], news: [], reviews: [] }
        };

        setScrapedData(fallbackData);

        // Generate playbook with fallback data
        const playbook = await generatePlaybookWithClaude(fallbackData, []);
        if (playbook) {
          setGeneratedPlaybook(playbook);
        }
      } else {
        setScrapedData(data);

        // Auto-select best images for playbook
        const bestImages = data.media.heroImages.length > 0
          ? data.media.heroImages
          : data.media.images.slice(0, 5).map(img => img.src);
        setSelectedImages(bestImages);

        // Step 3 & 4: Generate playbook with AI
        const playbook = await generatePlaybookWithClaude(data, bestImages);
        if (playbook) {
          setGeneratedPlaybook(playbook);
        }
      }

      setPlaybookProgress('');

    } catch (error) {
      console.error('Playbook generation error:', error);
      setPlaybookProgress('Error generating playbook. Please try again.');
    } finally {
      setPlaybookGenerating(false);
    }
  };

  const handleDownloadPlaybook = () => {
    if (!generatedPlaybook) return;
    const blob = new Blob([generatedPlaybook], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playbook-${scrapedData?.company?.name || 'company'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenPlaybook = () => {
    if (!generatedPlaybook) return;
    const blob = new Blob([generatedPlaybook], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const toggleImageSelection = (src: string) => {
    setSelectedImages(prev =>
      prev.includes(src)
        ? prev.filter(s => s !== src)
        : [...prev, src]
    );
  };

  // Progress steps for UI
  const progressSteps = [
    { label: 'Initialize', icon: <Zap className="w-4 h-4" /> },
    { label: 'Scrape Data', icon: <Globe className="w-4 h-4" /> },
    { label: 'Intelligence', icon: <Search className="w-4 h-4" /> },
    { label: 'AI Analysis', icon: <Sparkles className="w-4 h-4" /> },
    { label: 'Build Playbook', icon: <BookOpen className="w-4 h-4" /> }
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-orbitron">Email Builder</h1>
          <p className="text-gray-400 mt-1">Create, send, and track personalized emails & playbooks</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Connected
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {[
          { id: 'compose', label: 'Compose', icon: <Mail className="w-4 h-4" /> },
          { id: 'playbook', label: 'Playbook', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
          { id: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" />, count: sentEmails.length },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-brand-gold text-black font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-black/20' : 'bg-brand-gold/20 text-brand-gold'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Composer */}
          <div className="space-y-4">
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-gold" />
                Compose Email
              </h3>

              {/* Sender Select */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">From</label>
                <select
                  value={selectedSender.id}
                  onChange={(e) => setSelectedSender(SENDERS.find(s => s.id === e.target.value) || SENDERS[0])}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50"
                >
                  {SENDERS.map(sender => (
                    <option key={sender.id} value={sender.id} className="bg-gray-900">
                      {sender.name} ({sender.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">To</label>
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="recipient@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Body</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEmailRevisionMode(!emailRevisionMode)}
                      disabled={!body}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                    >
                      <Edit3 className="w-3 h-3" />
                      Revise
                    </button>
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiGenerating}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      {aiGenerating ? 'Generating...' : 'AI Generate'}
                    </button>
                  </div>
                </div>

                {emailRevisionMode && (
                  <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <input
                      type="text"
                      value={emailRevisionPrompt}
                      onChange={(e) => setEmailRevisionPrompt(e.target.value)}
                      placeholder="e.g., Make it more casual, add urgency, focus on ROI..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && handleEmailRevision()}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleEmailRevision}
                        disabled={aiGenerating}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        Apply Revision
                      </button>
                      <button
                        onClick={() => setEmailRevisionMode(false)}
                        className="px-3 py-1 text-xs bg-white/10 text-gray-400 rounded-lg hover:bg-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email content here..."
                  rows={10}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !recipient || !subject || !body}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-gold text-black font-bold rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="glass p-4 rounded-2xl">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Templates</h4>
              <div className="flex flex-wrap gap-2">
                {templates.slice(0, 3).map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-brand-gold text-black'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-brand-gold" />
              Email Preview
            </h3>
            <div className="bg-[#0f1410] rounded-xl overflow-hidden border border-white/10">
              <div style={{ height: '4px', background: 'linear-gradient(90deg, #F5D547 0%, #D4B83A 50%, #4A7C4E 100%)' }}></div>
              <div className="p-6">
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-sm text-gray-400">From: <span className="text-white">{selectedSender.name} &lt;{selectedSender.email}&gt;</span></p>
                  <p className="text-sm text-gray-400">To: <span className="text-white">{recipient || 'recipient@company.com'}</span></p>
                  <p className="text-sm text-gray-400">Subject: <span className="text-white font-semibold">{subject || 'Email subject line'}</span></p>
                </div>
                <div className="text-center mb-6">
                  <span className="inline-block px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-full text-brand-gold text-xs font-semibold tracking-widest">
                    ELEVEN VIEWS
                  </span>
                </div>
                <div className="bg-[#141a16] border border-brand-gold/20 rounded-xl p-6">
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {body || 'Your email content will appear here...'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-brand-gold/10 text-center">
                  <p className="text-gray-500 text-xs">{selectedSender.name} | {selectedSender.title}</p>
                  <p className="text-gray-600 text-xs mt-1">Eleven Views | elevenviews.io</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playbook Tab */}
      {activeTab === 'playbook' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Playbook Generator */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-gold" />
                Strategic Playbook Generator
              </h3>
              <p className="text-gray-400 text-sm">
                Enter a company URL to generate a comprehensive strategic playbook with AI-powered analysis, scraped media, and growth recommendations.
              </p>

              {/* URL Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Company Website URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="url"
                      value={playbookUrl}
                      onChange={(e) => setPlaybookUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              {playbookGenerating && (
                <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
                    <p className="text-brand-gold font-medium">{playbookProgress}</p>
                  </div>
                  <div className="flex gap-2">
                    {progressSteps.map((step, i) => (
                      <div
                        key={i}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                          i <= playbookStep ? 'bg-brand-gold/20 text-brand-gold' : 'bg-white/5 text-gray-500'
                        }`}
                      >
                        {i < playbookStep ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : i === playbookStep ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        <span className="text-[10px] font-medium">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGeneratePlaybook}
                disabled={playbookGenerating || !playbookUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-gold text-black font-bold rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {playbookGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Strategic Playbook
                  </>
                )}
              </button>

              {/* Scraped Images Selection */}
              {scrapedData && scrapedData.media.images.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Scraped Media ({scrapedData.media.images.length})</p>
                    <span className="text-xs text-brand-gold">{selectedImages.length} selected</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {scrapedData.media.images.slice(0, 12).map((img, i) => (
                      <div
                        key={i}
                        onClick={() => toggleImageSelection(img.src)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                          selectedImages.includes(img.src)
                            ? 'border-brand-gold'
                            : 'border-transparent hover:border-white/30'
                        }`}
                      >
                        <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                        {selectedImages.includes(img.src) && (
                          <div className="absolute inset-0 bg-brand-gold/30 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Powered By</p>
                <div className="flex flex-wrap gap-2">
                  {['Apify Scraper', 'Brave Search', 'Claude AI', 'Google AI'].map((feature, i) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview / Generated Playbook */}
            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-brand-gold" />
                  Playbook Preview
                </h3>
                {generatedPlaybook && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRevisionMode(!revisionMode)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Revise
                    </button>
                    <button
                      onClick={handleDownloadPlaybook}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={handleOpenPlaybook}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-brand-gold/20 hover:bg-brand-gold/30 rounded-lg text-brand-gold transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </button>
                  </div>
                )}
              </div>

              {/* Revision Mode */}
              {revisionMode && generatedPlaybook && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-sm text-blue-400 mb-2">Revise with AI</p>
                  <textarea
                    value={revisionPrompt}
                    onChange={(e) => setRevisionPrompt(e.target.value)}
                    placeholder="e.g., Change the color scheme to gold/black, add more focus on digital marketing, update the KPIs..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handlePlaybookRevision}
                      disabled={revisionLoading || !revisionPrompt}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                    >
                      {revisionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Apply Changes
                    </button>
                    <button
                      onClick={() => setRevisionMode(false)}
                      className="px-4 py-2 text-sm bg-white/10 text-gray-400 rounded-lg hover:bg-white/20"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {generatedPlaybook ? (
                <div className="bg-[#0f1410] rounded-xl border border-white/10 h-[500px] overflow-hidden">
                  <iframe
                    srcDoc={generatedPlaybook}
                    className="w-full h-full"
                    title="Playbook Preview"
                  />
                </div>
              ) : (
                <div className="bg-[#0f1410] rounded-xl border border-white/10 h-[500px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">No Playbook Generated</h4>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">
                      Enter a company URL and click "Generate" to create a comprehensive strategic playbook with AI analysis and scraped media.
                    </p>
                  </div>
                </div>
              )}

              {/* Company Info Preview */}
              {scrapedData && (
                <div className="mt-4 p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Detected Company</p>
                  <p className="text-white font-semibold">{scrapedData.company.name}</p>
                  <p className="text-sm text-gray-400">{scrapedData.company.industry}</p>
                  {scrapedData.intelligence.strengths.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {scrapedData.intelligence.strengths.slice(0, 3).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Example Playbooks */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Example Playbooks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Day Hill Dome', url: 'https://dayhilldome.elevenviews.io/', industry: 'Sports & Entertainment' },
                { name: 'Local Business', url: '#', industry: 'Retail' },
                { name: 'SaaS Startup', url: '#', industry: 'Technology' }
              ].map((example, i) => (
                <div
                  key={i}
                  className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => example.url !== '#' && window.open(example.url, '_blank')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand-gold/10 rounded-lg">
                      <BookOpen className="w-4 h-4 text-brand-gold" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{example.name}</p>
                      <p className="text-xs text-gray-500">{example.industry}</p>
                    </div>
                  </div>
                  {example.url !== '#' && (
                    <p className="text-xs text-brand-gold flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View Live Example
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="glass p-5 rounded-2xl hover:border-brand-gold/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-gold/10 rounded-lg">
                  <FileText className="w-5 h-5 text-brand-gold" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleTemplateSelect(template)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Use template"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <h3 className="text-white font-semibold mb-1">{template.name}</h3>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.subject}</p>
              <p className="text-xs text-gray-500">From: {template.fromName}</p>
              <button
                onClick={() => {
                  handleTemplateSelect(template);
                  setActiveTab('compose');
                }}
                className="w-full mt-4 py-2 bg-white/5 hover:bg-brand-gold hover:text-black text-gray-400 rounded-lg text-sm font-medium transition-all"
              >
                Use Template
              </button>
            </div>
          ))}

          {/* Add Template Card */}
          <div className="glass p-5 rounded-2xl border-dashed border-2 border-white/10 hover:border-brand-gold/30 transition-all flex flex-col items-center justify-center min-h-[200px] cursor-pointer group">
            <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:bg-brand-gold/10 transition-colors">
              <Plus className="w-6 h-6 text-gray-500 group-hover:text-brand-gold" />
            </div>
            <p className="text-gray-500 group-hover:text-gray-300">Create Template</p>
          </div>
        </div>
      )}

      {/* Sent Tab */}
      {activeTab === 'sent' && (
        <div className="glass rounded-2xl overflow-hidden">
          {sentEmails.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No emails sent yet</h3>
              <p className="text-gray-500">Your sent emails will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent</th>
                </tr>
              </thead>
              <tbody>
                {sentEmails.map(email => (
                  <tr key={email.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{email.to}</td>
                    <td className="p-4 text-gray-400">{email.subject}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        email.status === 'sent' ? 'bg-blue-500/15 text-blue-400' :
                        email.status === 'opened' ? 'bg-brand-gold/15 text-brand-gold' :
                        email.status === 'clicked' ? 'bg-green-500/15 text-green-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {new Date(email.sentAt).toLocaleDateString()} {new Date(email.sentAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sent', value: stats.totalSent, icon: <Send className="w-5 h-5" />, color: 'blue' },
              { label: 'Opened', value: stats.opened, icon: <Eye className="w-5 h-5" />, color: 'gold', rate: stats.totalSent ? Math.round((stats.opened / stats.totalSent) * 100) : 0 },
              { label: 'Clicked', value: stats.clicked, icon: <Zap className="w-5 h-5" />, color: 'green', rate: stats.totalSent ? Math.round((stats.clicked / stats.totalSent) * 100) : 0 },
              { label: 'Bounced', value: stats.bounced, icon: <RefreshCw className="w-5 h-5" />, color: 'red', rate: stats.totalSent ? Math.round((stats.bounced / stats.totalSent) * 100) : 0 }
            ].map((stat, i) => (
              <div key={i} className="glass p-5 rounded-2xl">
                <div className={`p-2 rounded-lg inline-block mb-3 ${
                  stat.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                  stat.color === 'gold' ? 'bg-brand-gold/10 text-brand-gold' :
                  stat.color === 'green' ? 'bg-green-500/10 text-green-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-bold text-white font-orbitron">{stat.value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{stat.label}</p>
                {stat.rate !== undefined && (
                  <p className={`text-sm mt-2 ${
                    stat.color === 'red' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {stat.rate}% rate
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Performance Chart Placeholder */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Email Performance</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Live
                </span>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center border border-white/10 rounded-xl">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Send more emails to see performance data</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailBuilderModule;
