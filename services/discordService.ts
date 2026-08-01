// Discord Webhook Service for Eleven Views
// Sends notifications to Discord for key events

import { proxyPost, SERVER_ROUTES } from './serverProxy';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
  thumbnail?: { url: string };
}

interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

// Eleven Views brand color in decimal
const BRAND_GOLD = 0xC9A962;
const BRAND_SUCCESS = 0x10B981;
const BRAND_INFO = 0x3B82F6;
const BRAND_WARNING = 0xF59E0B;

class DiscordService {
  // Posts through the backend, which holds the webhook URL. A Discord webhook
  // URL is itself the credential — anyone holding it can post to the channel —
  // so it must never appear in browser-delivered JS.
  private async send(message: DiscordMessage): Promise<boolean> {
    const result = await proxyPost(SERVER_ROUTES.notifyDiscord, {
      username: 'Eleven Views',
      avatar_url: 'https://elevenviews.io/assets/icons/favicon.png',
      ...message,
    });

    if (!result.success) {
      console.error('Discord notification failed:', result.error);
      return false;
    }

    return true;
  }

  // New project inquiry notification
  async notifyNewProject(data: {
    name: string;
    email: string;
    company: string;
    industry?: string;
    location?: string;
    projectTypes?: string[];
  }): Promise<boolean> {
    return this.send({
      embeds: [{
        title: 'New Project Inquiry',
        description: `A new project request has been submitted.`,
        color: BRAND_GOLD,
        fields: [
          { name: 'Contact', value: data.name, inline: true },
          { name: 'Email', value: data.email, inline: true },
          { name: 'Company', value: data.company || 'Not specified', inline: true },
          { name: 'Industry', value: data.industry || 'Not specified', inline: true },
          { name: 'Location', value: data.location || 'Global', inline: true },
          { name: 'Project Types', value: data.projectTypes?.join(', ') || 'Not specified', inline: false },
        ],
        footer: { text: 'Eleven Views Portal' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // New user registration
  async notifyNewUser(data: {
    name: string;
    email: string;
    role: string;
    company?: string;
  }): Promise<boolean> {
    return this.send({
      embeds: [{
        title: 'New User Registration',
        description: `${data.name} has joined the Eleven Views portal.`,
        color: BRAND_SUCCESS,
        fields: [
          { name: 'Name', value: data.name, inline: true },
          { name: 'Email', value: data.email, inline: true },
          { name: 'Role', value: data.role, inline: true },
          { name: 'Company', value: data.company || 'Not specified', inline: true },
        ],
        footer: { text: 'Eleven Views Portal' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Production status update
  async notifyProductionUpdate(data: {
    projectName: string;
    status: string;
    updatedBy?: string;
    notes?: string;
  }): Promise<boolean> {
    return this.send({
      embeds: [{
        title: 'Production Update',
        description: `**${data.projectName}** status changed to **${data.status}**`,
        color: BRAND_INFO,
        fields: [
          { name: 'Project', value: data.projectName, inline: true },
          { name: 'New Status', value: data.status, inline: true },
          { name: 'Updated By', value: data.updatedBy || 'System', inline: true },
          ...(data.notes ? [{ name: 'Notes', value: data.notes, inline: false }] : []),
        ],
        footer: { text: 'Eleven Views Portal' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // New client added
  async notifyNewClient(data: {
    clientName: string;
    industry?: string;
    addedBy?: string;
  }): Promise<boolean> {
    return this.send({
      embeds: [{
        title: 'New Client Added',
        description: `A new client has been added to the system.`,
        color: BRAND_GOLD,
        fields: [
          { name: 'Client', value: data.clientName, inline: true },
          { name: 'Industry', value: data.industry || 'Not specified', inline: true },
          { name: 'Added By', value: data.addedBy || 'System', inline: true },
        ],
        footer: { text: 'Eleven Views Portal' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Campaign launched
  async notifyCampaignLaunch(data: {
    campaignName: string;
    client?: string;
    startDate?: string;
  }): Promise<boolean> {
    return this.send({
      embeds: [{
        title: 'Campaign Launched',
        description: `A new campaign is now live!`,
        color: BRAND_SUCCESS,
        fields: [
          { name: 'Campaign', value: data.campaignName, inline: true },
          { name: 'Client', value: data.client || 'Internal', inline: true },
          { name: 'Start Date', value: data.startDate || 'Today', inline: true },
        ],
        footer: { text: 'Eleven Views Portal' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Demo submission from A&R Hub
  async notifyDemoSubmission(data: {
    artistName: string;
    trackTitle: string;
    genre?: string;
    email?: string;
  }): Promise<boolean> {
    return this.send({
      embeds: [{
        title: 'New Demo Submission',
        description: `A new demo has been submitted for review.`,
        color: BRAND_WARNING,
        fields: [
          { name: 'Artist', value: data.artistName, inline: true },
          { name: 'Track', value: data.trackTitle, inline: true },
          { name: 'Genre', value: data.genre || 'Not specified', inline: true },
          { name: 'Contact', value: data.email || 'Not provided', inline: true },
        ],
        footer: { text: 'Eleven Views A&R Hub' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Generic notification
  async notify(title: string, message: string, color: number = BRAND_GOLD): Promise<boolean> {
    return this.send({
      embeds: [{
        title,
        description: message,
        color,
        footer: { text: 'Eleven Views' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Simple text message
  async sendMessage(content: string): Promise<boolean> {
    return this.send({ content });
  }
}

export const discordService = new DiscordService();
export default discordService;
