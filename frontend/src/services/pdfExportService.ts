import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  title: string;
  subtitle?: string;
  plantelNombre?: string;
  periodoNombre?: string;
  generadoPor?: string;
}

/**
 * Exporta un elemento HTML a un documento PDF institucional con encabezado y pie de página en cada hoja.
 */
export async function exportElementToPDF(
  element: HTMLElement,
  options: PDFExportOptions
): Promise<void> {
  const {
    filename = 'Reporte_SSC.pdf',
    title,
    plantelNombre = 'CONALEP Plantel Puebla I',
    periodoNombre = 'Semestre A-2026',
    generadoPor = 'Personal Autorizado',
  } = options;

  // Renderizar el elemento HTML en un canvas de alta resolución
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const marginTop = 26; // Espacio reservado para el encabezado institucional
  const marginBottom = 18; // Espacio reservado para el pie de página
  const contentWidth = pdfWidth - 20; // Márgenes laterales de 10mm
  const contentHeightPerPage = pdfHeight - marginTop - marginBottom;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  let page = 1;

  const totalPages = Math.ceil(imgHeight / contentHeightPerPage) || 1;
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Función para agregar encabezado institucional estandarizado
  const addHeader = (pdfDoc: jsPDF) => {
    // Franja superior verde institucional CONALEP
    pdfDoc.setFillColor(0, 73, 47); // #00492f
    pdfDoc.rect(0, 0, pdfWidth, 5, 'F');

    // Logo / Texto del Plantel
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setFontSize(10);
    pdfDoc.setTextColor(0, 73, 47);
    pdfDoc.text(plantelNombre.toUpperCase(), 10, 11);

    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(8);
    pdfDoc.setTextColor(100, 116, 139);
    pdfDoc.text(`${title} | ${periodoNombre}`, 10, 16);

    // Fecha a la derecha
    pdfDoc.text(`Emisión: ${fechaHoy}`, pdfWidth - 10, 11, { align: 'right' });
    pdfDoc.text(`Emisor: ${generadoPor}`, pdfWidth - 10, 16, { align: 'right' });

    // Línea divisora
    pdfDoc.setDrawColor(226, 232, 240);
    pdfDoc.setLineWidth(0.4);
    pdfDoc.line(10, 20, pdfWidth - 10, 20);
  };

  // Función para agregar pie de página estandarizado
  const addFooter = (pdfDoc: jsPDF, pageNum: number, total: number) => {
    const footerY = pdfHeight - 8;

    // Línea divisora del footer
    pdfDoc.setDrawColor(226, 232, 240);
    pdfDoc.setLineWidth(0.4);
    pdfDoc.line(10, footerY - 4, pdfWidth - 10, footerY - 4);

    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(7.5);
    pdfDoc.setTextColor(148, 163, 184);

    // Leyenda institucional
    pdfDoc.text(
      'Documento Oficial Institucional • Sistema Conductual CONALEP (SSC) • Uso Confidencial',
      10,
      footerY
    );

    // Paginación
    pdfDoc.text(`Página ${pageNum} de ${total}`, pdfWidth - 10, footerY, {
      align: 'right',
    });
  };

  // Dibujar primera página
  addHeader(pdf);

  // Recortar la imagen en páginas si excede el tamaño de una hoja A4
  while (heightLeft > 0) {
    if (page > 1) {
      pdf.addPage();
      addHeader(pdf);
    }

    // Dibujar porción del contenido renderizado
    pdf.addImage(
      imgData,
      'JPEG',
      10,
      marginTop - position,
      imgWidth,
      imgHeight
    );

    addFooter(pdf, page, totalPages);

    heightLeft -= contentHeightPerPage;
    position += contentHeightPerPage;
    page++;
  }

  // Guardar archivo PDF con el nombre indicado
  pdf.save(filename);
}
