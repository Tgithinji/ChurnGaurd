// ============================================
// 5. EMAIL TEMPLATE RENDERER (lib/template-renderer.ts)
// ============================================
export interface TemplateVariables {
  name: string;
  product_name: string;
  amount: string;
  payment_update_link: string;
  company_name?: string;
  support_email?: string;
}

export class EmailTemplateRenderer {
  private subject: string;
  private body: string;

  constructor(subject: string, body: string) {
    this.subject = subject;
    this.body = body;
  }

  render(variables: TemplateVariables): { subject: string; body: string } {
    let renderedSubject = this.subject;
    let renderedBody = this.body;

    // Replace all variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      renderedSubject = renderedSubject.replace(new RegExp(placeholder, 'g'), value);
      renderedBody = renderedBody.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
      subject: renderedSubject,
      body: renderedBody
    };
  }

  // Convert plain text to HTML with basic formatting
  toHTML(plainText: string): string {
    return plainText
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }
}
