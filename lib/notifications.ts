// ============================================
// 7. NOTIFICATION SERVICE (lib/notifications.ts)
// ============================================
export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook';
  config: Record<string, unknown>;
}

export class NotificationService {
  private channels: NotificationChannel[];

  constructor(channels: NotificationChannel[]) {
    this.channels = channels;
  }

  async notify(event: string, data: Record<string, unknown>): Promise<void> {
    const promises = this.channels.map(channel => {
      switch (channel.type) {
        case 'email':
          return this.sendEmail(channel.config, event, data);
        case 'slack':
          return this.sendSlack(channel.config, event, data);
        case 'webhook':
          return this.sendWebhook(channel.config, event, data);
        default:
          return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  private async sendEmail(config: Record<string, unknown>, event: string, data: Record<string, unknown>): Promise<void> {
    // Implementation depends on email provider
    console.log('Sending email notification:', event, data);
  }

  private async sendSlack(config: Record<string, unknown>, event: string, data: Record<string, unknown>): Promise<void> {
    const webhookUrl = config.webhookUrl as string;
    
    const message = {
      text: `ChurnGuard Alert: ${event}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${event}*\n${JSON.stringify(data, null, 2)}`
          }
        }
      ]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }

  private async sendWebhook(config: Record<string, unknown>, event: string, data: Record<string, unknown>): Promise<void> {
    await fetch(config.url as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ChurnGuard-Event': event,
        ...(config.headers as Record<string, string> || {})
      },
      body: JSON.stringify(data)
    });
  }
}