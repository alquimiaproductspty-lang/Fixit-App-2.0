declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    enableLinks?: boolean;
    html2canvas?: Record<string, any>;
    jsPDF?: {
      unit?: string;
      format?: string | [number, number];
      orientation?: 'portrait' | 'landscape';
    };
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
  }

  interface Html2PdfWorker {
    from(element: HTMLElement | string): Html2PdfWorker;
    set(options: Html2PdfOptions): Html2PdfWorker;
    save(filename?: string): Promise<void>;
    output(type: 'blob' | 'datauristring' | 'arraybuffer'): Promise<any>;
    outputPdf(type: 'blob' | 'datauristring' | 'arraybuffer'): Promise<any>;
  }

  function html2pdf(element?: HTMLElement | string, options?: Html2PdfOptions): Html2PdfWorker;
  export default html2pdf;
}

