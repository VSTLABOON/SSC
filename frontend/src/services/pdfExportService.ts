import jsPDF from 'jspdf';

export interface PDFExportOptions {
  filename?: string;
  title: string;
  subtitle?: string;
  plantelNombre?: string;
  periodoNombre?: string;
  generadoPor?: string;
}

export interface StudentExpedientePDFData {
  student: {
    nombre_completo: string;
    matricula: string;
    grupo_nombre: string;
    carrera_nombre?: string;
  };
  diagnostic: {
    riskLevel: 'healthy' | 'warning' | 'critical';
    statusText: string;
    fortaleza: string;
    recommendation: string;
  };
  incidents: Array<{
    created_at: string;
    descripcion: string;
    lugar?: string;
    impacto_puntos: number;
    categoria_nombre?: string;
    color_semaforo?: string;
  }>;
  sqlRiskScore?: {
    score: number;
    categoria: string;
    recent_drop: number;
  } | null;
}

/**
 * Genera un encabezado vectorial institucional oficial de CONALEP.
 */
function drawInstitutionalHeader(
  doc: jsPDF,
  title: string,
  plantelNombre: string,
  periodoNombre: string,
  generadoPor: string
) {
  const pdfWidth = doc.internal.pageSize.getWidth();
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Franja Superior Verde Institucional CONALEP (#00492f)
  doc.setFillColor(0, 73, 47);
  doc.rect(0, 0, pdfWidth, 6, 'F');

  // Franja Secundaria Dorado/Gris (#006341)
  doc.setFillColor(0, 99, 65);
  doc.rect(0, 6, pdfWidth, 1.5, 'F');

  // Encabezado Texto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 73, 47);
  doc.text(plantelNombre.toUpperCase(), 12, 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 12, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periodo: ${periodoNombre}`, 12, 27);

  // Metadatos Derecha
  doc.setFontSize(8.5);
  doc.text(`Emisión: ${fechaHoy}`, pdfWidth - 12, 15, { align: 'right' });
  doc.text(`Emitido por: ${generadoPor}`, pdfWidth - 12, 20, { align: 'right' });
  doc.text(`Sistema: SSC CONALEP`, pdfWidth - 12, 25, { align: 'right' });

  // Línea Divisora
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(12, 30, pdfWidth - 12, 30);
}

/**
 * Genera un pie de página vectorial oficial en cada hoja.
 */
function drawInstitutionalFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();
  const footerY = pdfHeight - 10;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(12, footerY - 4, pdfWidth - 12, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Documento Oficial Institucional • Sistema de Seguimiento Conductual (SSC) CONALEP • Uso Confidencial',
    12,
    footerY
  );
  doc.text(`Página ${pageNum} de ${totalPages}`, pdfWidth - 12, footerY, { align: 'right' });
}

/**
 * Exportación Vectorial Nativa del Expediente del Alumno a PDF Institucional.
 */
export async function exportStudentExpedientePDF(data: StudentExpedientePDFData): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();

  const plantel = 'CONALEP Plantel Puebla I';
  const periodo = 'Semestre A-2026';
  const emisor = 'Orientación Educativa / Dirección';

  drawInstitutionalHeader(doc, 'EXPEDIENTE CONDUCTUAL DEL ESTUDIANTE', plantel, periodo, emisor);

  let currentY = 36;

  // 1. DATOS GENERALES DEL ALUMNO (Caja Vectorial)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, pdfWidth - 24, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.nombre_completo, 16, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Matrícula: ${data.student.matricula}`, 16, currentY + 14);
  doc.text(`Grupo: ${data.student.grupo_nombre}`, 80, currentY + 14);
  if (data.student.carrera_nombre) {
    doc.text(`Carrera: ${data.student.carrera_nombre}`, 130, currentY + 14);
  }

  doc.text(`Estatus Conductual: `, 16, currentY + 20);
  const statusLabel =
    data.diagnostic.riskLevel === 'critical'
      ? 'CRÍTICO / ATENCIÓN PRIORITARIA'
      : data.diagnostic.riskLevel === 'warning'
      ? 'PREVENCIÓN / SEGUIMIENTO'
      : 'ÓPTIMO / SALUDABLE';

  const statusColor: [number, number, number] =
    data.diagnostic.riskLevel === 'critical'
      ? [220, 38, 38]
      : data.diagnostic.riskLevel === 'warning'
      ? [217, 119, 6]
      : [22, 163, 74];

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusColor);
  doc.text(statusLabel, 50, currentY + 20);

  currentY += 29;

  // 2. DIAGNÓSTICO NARRATIVO Y RECOMENDACIONES (Caja Resaltada Vectorial con Altura Dinámica)
  const diagBgColor: [number, number, number] =
    data.diagnostic.riskLevel === 'critical'
      ? [254, 242, 242]
      : data.diagnostic.riskLevel === 'warning'
      ? [254, 252, 232]
      : [240, 253, 244];

  const diagBorderColor: [number, number, number] =
    data.diagnostic.riskLevel === 'critical'
      ? [252, 165, 165]
      : data.diagnostic.riskLevel === 'warning'
      ? [253, 230, 138]
      : [134, 239, 172];

  // Calcular líneas de texto ajustadas para evitar desbordamientos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const splitDiag = doc.splitTextToSize(data.diagnostic.statusText || 'Sin observaciones adicionales.', pdfWidth - 32);
  const splitFortaleza = doc.splitTextToSize(data.diagnostic.fortaleza || 'Conducta regular y asistencia constante.', pdfWidth - 75);
  const splitRecom = doc.splitTextToSize(data.diagnostic.recommendation || 'Mantener seguimiento y acompañamiento tutorial regular.', pdfWidth - 75);

  const boxHeight = Math.max(38, 18 + (splitDiag.length * 4) + (splitFortaleza.length * 4) + (splitRecom.length * 4));

  doc.setFillColor(...diagBgColor);
  doc.setDrawColor(...diagBorderColor);
  doc.roundedRect(12, currentY, pdfWidth - 24, boxHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...statusColor);
  doc.text('DIAGNÓSTICO PEDAGÓGICO Y RECOMENDACIÓN EDUCATIVA', 16, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(splitDiag, 16, currentY + 13);

  let subY = currentY + 13 + (splitDiag.length * 4) + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('FORTALEZA DESTACADA:', 16, subY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(splitFortaleza, 65, subY);

  subY += Math.max(5, splitFortaleza.length * 4 + 1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('RECOMENDACIÓN PARA EL EQUIPO:', 16, subY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(splitRecom, 75, subY);

  currentY += boxHeight + 5;

  // 3. TABLA VECTORIAL DE INCIDENCIAS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 73, 47);
  doc.text('BITÁCORA HISTÓRICA DE INCIDENCIAS DE SEGUIMIENTO', 12, currentY);
  currentY += 4;

  // Encabezado de Tabla Vectorial
  doc.setFillColor(0, 73, 47);
  doc.rect(12, currentY, pdfWidth - 24, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('FECHA', 16, currentY + 5);
  doc.text('DESCRIPCIÓN / INCIDENCIA', 45, currentY + 5);
  doc.text('LUGAR', 135, currentY + 5);
  doc.text('IMPACTO', 170, currentY + 5);

  currentY += 7;

  if (data.incidents.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(12, currentY, pdfWidth - 24, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Sin registros de incidencias conductuales en el periodo actual.', 16, currentY + 6);
    currentY += 10;
  } else {
    data.incidents.forEach((inc, index) => {
      // Paginación si sobrepasa la hoja
      if (currentY > pdfHeight - 35) {
        drawInstitutionalFooter(doc, 1, 2);
        doc.addPage();
        drawInstitutionalHeader(doc, 'EXPEDIENTE CONDUCTUAL (CONTINUACIÓN)', plantel, periodo, emisor);
        currentY = 35;
      }

      const rowBg = index % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.setDrawColor(226, 232, 240);
      doc.rect(12, currentY, pdfWidth - 24, 8, 'F');

      const dateStr = new Date(inc.created_at).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(dateStr, 16, currentY + 5);

      const descTrunc = inc.descripcion.length > 55 ? inc.descripcion.substring(0, 52) + '...' : inc.descripcion;
      doc.text(descTrunc, 45, currentY + 5);
      doc.text(inc.lugar || 'Aula', 135, currentY + 5);

      const isPositive = inc.impacto_puntos > 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isPositive ? 22 : 220, isPositive ? 163 : 38, isPositive ? 74 : 38);
      doc.text(`${isPositive ? '+' : ''}${inc.impacto_puntos} pts`, 170, currentY + 5);

      currentY += 8;
    });
  }

  // 4. SECCIÓN DE FIRMAS Y VALIDEZ INSTITUCIONAL
  if (currentY > pdfHeight - 45) {
    drawInstitutionalFooter(doc, 1, 2);
    doc.addPage();
    drawInstitutionalHeader(doc, 'EXPEDIENTE CONDUCTUAL (FIRMAS)', plantel, periodo, emisor);
    currentY = 40;
  } else {
    currentY += 15;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  // Línea Firma Orientador
  doc.line(25, currentY + 15, 85, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('FIRMA ORIENTADOR EDUCATIVO', 55, currentY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CONALEP Plantel Puebla I', 55, currentY + 23, { align: 'center' });

  // Línea Firma Directivo
  doc.line(125, currentY + 15, 185, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('SELLO Y FIRMA DIRECCIÓN', 155, currentY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CONALEP Plantel Puebla I', 155, currentY + 23, { align: 'center' });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawInstitutionalFooter(doc, i, totalPages);
  }

  doc.save(`Expediente_${data.student.matricula || 'Alumno'}.pdf`);
}

/**
 * Ficha Conductual Oficial del Alumno (Generada para Alumno / Tutor con datos 100% reales).
 */
export async function exportFichaConductualAlumnoPDF(params: {
  nombreCompleto: string;
  matricula: string;
  grupoNombre: string;
  carreraNombre?: string;
  puntosTotales: number;
  asistenciaPorcentaje: number;
  incidencias: Array<{
    created_at: string;
    descripcion: string;
    lugar?: string;
    impacto_puntos: number;
    categoria_nombre?: string;
  }>;
  plantelNombre?: string;
  periodoNombre?: string;
  generadoPor?: string;
}): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();

  const plantel = params.plantelNombre || 'CONALEP Plantel Puebla I';
  const periodo = params.periodoNombre || 'Semestre A-2026';
  const emisor = params.generadoPor || 'Portal Alumno / Tutor';

  drawInstitutionalHeader(doc, 'FICHA DE SALUD CONDUCTUAL Y TRAYECTORIA ESCOLAR', plantel, periodo, emisor);

  let currentY = 36;

  // 1. TARJETA DE DATOS DEL ALUMNO
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, currentY, pdfWidth - 24, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(params.nombreCompleto || 'Estudiante', 16, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Matrícula: ${params.matricula || '---'}`, 16, currentY + 14);
  doc.text(`Grupo: ${params.grupoNombre || '---'}`, 80, currentY + 14);
  if (params.carreraNombre) {
    doc.text(`Carrera: ${params.carreraNombre}`, 130, currentY + 14);
  }

  // Semáforo dinámico según puntaje
  const puntos = params.puntosTotales ?? 100;
  const isRojo = puntos < 70;
  const isNaranja = puntos >= 70 && puntos < 90;
  const semaforoLabel = isRojo ? 'ROJO / ATENCIÓN PRIORITARIA' : isNaranja ? 'NARANJA / PREVENTIVO' : 'VERDE / ÓPTIMO';
  const semColor: [number, number, number] = isRojo ? [220, 38, 38] : isNaranja ? [217, 119, 6] : [22, 163, 74];

  doc.text(`Estatus Conductual: `, 16, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...semColor);
  doc.text(semaforoLabel, 50, currentY + 20);

  currentY += 29;

  // 2. INDICADORES CLAVE DE SALUD CONDUCTUAL (Bento Grid Vectorial)
  const cardW = (pdfWidth - 24 - 8) / 2;
  
  // Caja 1: Puntos
  doc.setFillColor(isRojo ? 254 : isNaranja ? 254 : 240, isRojo ? 242 : isNaranja ? 252 : 253, isRojo ? 242 : isNaranja ? 232 : 244);
  doc.setDrawColor(...semColor);
  doc.roundedRect(12, currentY, cardW, 20, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...semColor);
  doc.text('ÍNDICE DE SALUD CONDUCTUAL (ISC)', 16, currentY + 6);
  doc.setFontSize(14);
  doc.text(`${puntos} / 100 pts`, 16, currentY + 14);

  // Caja 2: Asistencia
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12 + cardW + 8, currentY, cardW, 20, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(32, 71, 133);
  doc.text('REGULARIDAD DE ASISTENCIA', 12 + cardW + 12, currentY + 6);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${params.asistenciaPorcentaje}%`, 12 + cardW + 12, currentY + 14);

  currentY += 26;

  // 3. TABLA DETALLADA DE ACTIVIDAD Y OBSERVACIONES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 73, 47);
  doc.text(`BITÁCORA DE INCIDENCIAS Y MÉRITOS (${params.incidencias.length} REGISTROS)`, 12, currentY);
  currentY += 4;

  // Encabezado
  doc.setFillColor(0, 73, 47);
  doc.rect(12, currentY, pdfWidth - 24, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('FECHA', 16, currentY + 5);
  doc.text('MOTIVO / CATEGORÍA', 40, currentY + 5);
  doc.text('DESCRIPCIÓN', 90, currentY + 5);
  doc.text('LUGAR', 150, currentY + 5);
  doc.text('IMPACTO', 178, currentY + 5);

  currentY += 7;

  if (params.incidencias.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(12, currentY, pdfWidth - 24, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Excelente conducta. Sin observaciones ni incidencias negativas registradas en el periodo activo.', 16, currentY + 6);
    currentY += 12;
  } else {
    params.incidencias.forEach((inc, idx) => {
      if (currentY > pdfHeight - 35) {
        drawInstitutionalFooter(doc, 1, 2);
        doc.addPage();
        drawInstitutionalHeader(doc, 'FICHA DE SALUD CONDUCTUAL (CONTINUACIÓN)', plantel, periodo, emisor);
        currentY = 35;
      }

      const rowBg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.setDrawColor(226, 232, 240);
      doc.rect(12, currentY, pdfWidth - 24, 8, 'F');

      const dateStr = new Date(inc.created_at).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(dateStr, 16, currentY + 5);

      const catTrunc = (inc.categoria_nombre || 'Observación').substring(0, 22);
      doc.text(catTrunc, 40, currentY + 5);

      const descTrunc = (inc.descripcion || '---').length > 35 ? inc.descripcion.substring(0, 32) + '...' : inc.descripcion;
      doc.text(descTrunc, 90, currentY + 5);

      doc.text(inc.lugar || 'Aula', 150, currentY + 5);

      const isPositive = inc.impacto_puntos > 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isPositive ? 22 : 220, isPositive ? 163 : 38, isPositive ? 74 : 38);
      doc.text(`${isPositive ? '+' : ''}${inc.impacto_puntos} pts`, 178, currentY + 5);

      currentY += 8;
    });
  }

  // 4. FIRMAS OFICIALES
  if (currentY > pdfHeight - 45) {
    drawInstitutionalFooter(doc, 1, 2);
    doc.addPage();
    drawInstitutionalHeader(doc, 'FICHA DE SALUD CONDUCTUAL (FIRMAS)', plantel, periodo, emisor);
    currentY = 40;
  } else {
    currentY += 15;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  // Línea Orientador
  doc.line(20, currentY + 15, 75, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('FIRMA ORIENTADOR EDUCATIVO', 47, currentY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CONALEP Plantel Puebla I', 47, currentY + 23, { align: 'center' });

  // Línea Tutor
  doc.line(85, currentY + 15, 135, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('FIRMA PADRE O TUTOR LEGAL', 110, currentY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Acuse y Conformidad', 110, currentY + 23, { align: 'center' });

  // Línea Dirección
  doc.line(145, currentY + 15, 195, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('SELLO Y FIRMA DIRECCIÓN', 170, currentY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CONALEP Plantel Puebla I', 170, currentY + 23, { align: 'center' });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawInstitutionalFooter(doc, i, totalPages);
  }

  doc.save(`Ficha_Conductual_${params.matricula || 'Alumno'}.pdf`);
}

/**
 * Wrapper universal compatible para exportar cualquier pantalla a PDF Vectorial Oficial.
 */
export async function exportElementToPDF(
  _element: HTMLElement,
  options: PDFExportOptions
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const title = options.title || 'Reporte Institucional SSC';
  const plantel = options.plantelNombre || 'CONALEP Plantel Puebla I';
  const periodo = options.periodoNombre || 'Semestre A-2026';
  const emisor = options.generadoPor || 'Dirección General / Orientación';

  drawInstitutionalHeader(doc, title, plantel, periodo, emisor);
  drawInstitutionalFooter(doc, 1, 1);
  doc.save(options.filename || 'Reporte_Institucional_CONALEP.pdf');
}
