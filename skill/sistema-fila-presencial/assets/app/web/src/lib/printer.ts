// Utilitário de Impressão Térmica de Senha para 58mm / 80mm

export interface TicketPrintData {
  clinicName?: string;
  logoUrl?: string | null;
  footer?: string;
  widthMm?: number;
  ticket: string;
  serviceName: string;
  tutorName: string;
  petName?: string | null;
  priority: string;
  arrivedAt?: string;
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Converte a configuração salva em /config nas opções do cupom. */
export function opcoesTicket(cfg: {
  clinic_name: string;
  logo_url: string | null;
  ticket_show_logo: boolean;
  ticket_footer: string;
  ticket_width_mm: string;
}): Pick<TicketPrintData, 'clinicName' | 'logoUrl' | 'footer' | 'widthMm'> {
  return {
    clinicName: cfg.clinic_name,
    logoUrl: cfg.ticket_show_logo && cfg.logo_url ? new URL(cfg.logo_url, window.location.origin).href : null,
    footer: cfg.ticket_footer,
    widthMm: Number(cfg.ticket_width_mm) || 58,
  };
}

/**
 * Dispara a impressão do cupom térmico da senha
 */
export function imprimirSenhaTermica(data: TicketPrintData): void {
  if (import.meta.env.MODE === 'demo') return; // demonstração: sem impressora, não abre a janela de impressão
  const clinic = esc(data.clinicName || 'CLÍNICA VETERINÁRIA');
  const width = data.widthMm || 58;
  const now = data.arrivedAt ? new Date(data.arrivedAt) : new Date();
  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  const timeFormatted = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Senha ${esc(data.ticket)}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 10px;
            font-family: 'Courier New', Courier, monospace;
            width: ${width}mm;
            color: #000;
            background: #fff;
            text-align: center;
          }
          .header {
            font-size: 13px;
            font-weight: bold;
            border-bottom: 1px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .meta {
            font-size: 11px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
          }
          .ticket-box {
            border: 2px solid #000;
            padding: 8px 4px;
            margin: 10px 0;
          }
          .ticket-label {
            font-size: 10px;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .ticket-number {
            font-size: 38px;
            font-weight: 900;
            line-height: 1;
            margin-top: 4px;
          }
          .details {
            font-size: 11px;
            text-align: left;
            margin: 10px 0;
            line-height: 1.4;
          }
          .details div {
            margin-bottom: 3px;
          }
          .logo {
            display: block;
            max-width: 100%;
            max-height: 18mm;
            margin: 0 auto 6px;
            filter: grayscale(1) contrast(1.4);
          }
          .footer {
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 6px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        ${data.logoUrl ? `<img class="logo" src="${esc(data.logoUrl)}" alt="">` : ''}
        <div class="header">${clinic}</div>
        <div class="meta">
          <span>${dateFormatted}</span>
          <span>${timeFormatted}</span>
        </div>
        
        <div class="ticket-box">
          <div class="ticket-label">Sua Senha</div>
          <div class="ticket-number">${esc(data.ticket)}</div>
        </div>

        <div class="details">
          <div><strong>Serviço:</strong> ${esc(data.serviceName)}</div>
          <div><strong>Tutor:</strong> ${esc(data.tutorName)}</div>
          ${data.petName ? `<div><strong>Pet:</strong> ${esc(data.petName)}</div>` : ''}
          <div><strong>Prioridade:</strong> ${esc(data.priority)}</div>
        </div>

        <div class="footer">
          ${esc(data.footer || 'Acompanhe pelo telão da sala de espera.')}
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=350,height=500');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Se o popup for bloqueado, usa um iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }
}
