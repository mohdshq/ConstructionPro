import { Report, Project } from '../../../store/projectsStore';

/**
 * Generates the Daily Progress Report HTML.
 * Extracted from the monolithic [reportId].tsx for maintainability.
 */
export function generateDailyReportHTML(
    data: any,
    report: Report,
    project: Project,
): string {
    const dateStr = new Date(report.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const rawLogos = data.logos || [];
    const logos = rawLogos.filter((l: string) => l && typeof l === 'string' && l.length > 100 && l.startsWith('data:image') && !l.includes('undefined') && !l.includes('null'));
    const leftLogos = logos.length <= 2 ? logos.slice(0, 1) : logos.slice(0, 2);
    const rightLogos = logos.length === 2 ? logos.slice(1, 2) : (logos.length === 3 ? logos.slice(2, 3) : logos.slice(2, 4));

    const sumCount = (arr: any[]) => (arr || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
    const sumTotal = (arr: any[]) => (arr || []).reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);

    const renderTableRows = (arr: any[], columns: (row: any, i: number) => string) => {
        const dataToRender = arr && arr.length > 0 ? arr : [];
        if (dataToRender.length === 0) {
            return `<tr><td colspan="10" class="text-center" style="padding: 10px;">No entries</td></tr>`;
        }
        return dataToRender.map((row, i) => `<tr>${columns(row, i)}</tr>`).join('');
    };

    const renderPhotos = () => {
        if (!data.photos || data.photos.length === 0) return '';
        return `
            <div style="page-break-inside: avoid; margin-top: 20px;">
                <h2 style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-top:0;">Photographic Evidence</h2>
                <div class="photo-grid">
                    ${data.photos.filter((p: any) => { const u = typeof p === 'string' ? p : p.uri; return u && typeof u === 'string' && u.length > 100 && !u.includes('undefined'); }).map((photo: any) => {
            const uri = typeof photo === 'string' ? photo : photo.uri;
            const caption = typeof photo === 'string' ? '' : (photo.caption || '');
            return `
                            <div class="photo-wrapper">
                                <div class="photo-item" style="background-image: url('${uri}'); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>
                                ${caption ? `<div class="photo-caption">${caption}</div>` : ''}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    };

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=yes" />
                <style>
                    html, body { margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; background-color: #FFFFFF !important; }
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; font-size: 10px; color: #000; }
                    .layout { width: 100%; max-width: 1200px; margin: 0 auto; display: block; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: center; }
                    th { background-color: #E2E8F0; font-weight: bold; font-size: 11px; }
                    .blue-hdr { background-color: #B2CCFF; color: #000; font-weight: bold; }
                    .text-left { text-align: left; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }

                    .header-container { display: flex; align-items: center; justify-content: space-between; border: 2px solid #000; padding: 10px; margin-bottom: 15px; background: #FFF; position: relative; }
                    .logo-container { flex: 1; display: flex; gap: 15px; align-items: center; justify-content: flex-start; }
                    .logo-container.right { justify-content: flex-end; }
                    .header-title-container { flex: 0 0 auto; display: flex; justify-content: center; z-index: 10; }
                    .header-title { font-size: 18px; font-weight: 900; color: #2563EB; background: #EFF6FF; padding: 5px 20px; border-radius: 4px; border: 1px solid #BFDBFE; text-transform: uppercase; }
                    .header-logo { height: 60px; width: 100px; background-size: contain; background-repeat: no-repeat; background-position: center; }

                    .section-container { margin-bottom: 15px; }

                    .progress-bar-container { width: 100%; background-color: #E2E8F0; border-radius: 2px; overflow: hidden; height: 14px; position: relative; }
                    .progress-bar-fill { height: 100%; background-color: #3B82F6; }
                    .progress-text { position: absolute; width: 100%; text-align: center; top: 0; left: 0; font-size: 10px; color: #000; line-height: 14px; font-weight: bold; }

                    .photo-grid { display: block; }
                    .photo-wrapper { width: calc(33.333% - 15px); display: inline-block; vertical-align: top; page-break-inside: avoid; margin-bottom: 15px; margin-right: 10px; }
                    .photo-item { width: 100%; aspect-ratio: 4/3; border: 1px solid #ccc; background-color: #f8fafc; display: block; }
                    .photo-caption { font-size: 11px; text-align: center; margin-top: 6px; font-weight: 500; color: #334155; word-wrap: break-word; }

                    @media print {
                        @page { margin: 10mm; }
                        html, body { height: auto; overflow: visible !important; }
                        .layout { display: block; width: 100%; height: auto; overflow: visible !important; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                    }
                </style>
            </head>
            <body>
                <div class="layout">
                    <!-- Header -->
                    <div class="header-container">
                        <div class="logo-container">
                            ${leftLogos.length > 0 ? leftLogos.map((url: string) => `<div class="header-logo" style="background-image: url('${url}'); background-size: contain; background-repeat: no-repeat; "></div>`).join('') : '<div style="font-weight:bold; font-size: 16px;">MAIN CONTRACTOR</div>'}
                        </div>
                        <div class="header-title-container">
                            <div class="header-title">DAILY PROGRESS REPORT</div>
                        </div>
                        <div class="logo-container right">
                            ${rightLogos.length > 0 ? rightLogos.map((url: string) => `<div class="header-logo" style="background-image: url('${url}'); background-size: contain; background-repeat: no-repeat; "></div>`).join('') : ''}
                        </div>
                    </div>

                    <!-- Meta -->
                    <table>
                        <tr>
                            <td class="text-left font-bold" style="width:15%;">PROJECT:</td>
                            <td class="text-left font-bold" style="width:55%; font-size:14px;">${project.name} - ${project.location || ''}</td>
                            <td class="font-bold blue-hdr" style="width:10%;">Date:</td>
                            <td class="font-bold" style="width:20%;">${dateStr}</td>
                        </tr>
                    </table>

                    <!-- Summary Row -->
                    <table>
                        <tr>
                            <th class="blue-hdr" colspan="2">CONTRACTUAL DATES</th>
                            <th class="blue-hdr" colspan="2">MANPOWER SUMMARY</th>
                            <th class="blue-hdr" colspan="2">WEATHER CONDITIONS</th>
                        </tr>
                        <tr>
                            <td class="text-left">Commencement Date:</td>
                            <td class="font-bold">${data.commencementDate || 'TBA'}</td>
                            <td class="text-left">Main Contractor</td>
                            <td class="font-bold">${data.manpowerMainContractor || ''}</td>
                            <td class="text-left">Humidity</td>
                            <td class="font-bold">${data.climateHumidity || ''}</td>
                        </tr>
                        <tr>
                            <td class="text-left">Completion Date:</td>
                            <td class="font-bold">${data.completionDate || 'TBA'}</td>
                            <td class="text-left">Subcontractors</td>
                            <td class="font-bold">${data.manpowerSubcontractors || ''}</td>
                            <td class="text-left">Visibility</td>
                            <td class="font-bold">${data.climateVisibility || ''}</td>
                        </tr>
                        <tr>
                            <td class="text-left">Anticipated Completion:</td>
                            <td class="font-bold">${data.anticipatedCompletionDate || 'TBA'}</td>
                            <td class="text-left">Others (Night)</td>
                            <td class="font-bold">${data.manpowerOthers || ''}</td>
                            <td class="text-left">Temperature</td>
                            <td class="font-bold">${data.climateTemp || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="2"></td>
                            <td class="text-left font-bold">TOTAL MANPOWER</td>
                            <td class="font-bold">${data.manpowerTotal || ''}</td>
                            <td class="text-left">Wind Speed</td>
                            <td class="font-bold">${data.climateWindSpeed || ''}</td>
                        </tr>
                    </table>

                    ${(!data.hiddenSections?.includes('mcStaff') || !data.hiddenSections?.includes('subconStaff') || !data.hiddenSections?.includes('equip')) ? `
                    <table style="width: 100%; border: none; margin-bottom: 15px; page-break-inside: auto;">
                        <tr style="vertical-align: top; page-break-inside: avoid; border: none;">
                            ${!data.hiddenSections?.includes('mcStaff') ? `
                            <td style="width: 33.33%; padding: 0 5px 0 0; border: none;">
                                <div class="section-container" style="margin-bottom: 0;">
                                    <table style="margin-bottom: 0;">
                                        <thead><tr><th class="blue-hdr" colspan="3">1. MAIN CONTRACTOR STAFF</th></tr><tr><th>Sr.No.</th><th>Role / Description</th><th>Nos.</th></tr></thead>
                                        <tbody>
                                            ${renderTableRows(data.mainContractorStaff, (row, i) => `<td style="width:10%">${i + 1}</td><td class="text-left">${row.description || ''}</td><td style="width:20%">${row.count || ''}</td>`)}
                                            <tr><th colspan="2" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL</th><th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.mainContractorStaff) || '0'}</th></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>` : ''}
                            ${!data.hiddenSections?.includes('subconStaff') ? `
                            <td style="width: 33.33%; padding: 0 5px; border: none;">
                                <div class="section-container" style="margin-bottom: 0;">
                                    <table style="margin-bottom: 0;">
                                        <thead><tr><th class="blue-hdr" colspan="2">2. SUBCONTRACTOR'S STAFF</th></tr><tr><th>Company / Name</th><th>Nos</th></tr></thead>
                                        <tbody>
                                            ${renderTableRows(data.subcontractorStaff, (row) => `<td class="text-left">${row.name || ''}</td><td style="width:25%">${row.count || ''}</td>`)}
                                            <tr><th class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL</th><th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.subcontractorStaff) || '0'}</th></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>` : ''}
                            ${!data.hiddenSections?.includes('equip') ? `
                            <td style="width: 33.33%; padding: 0 0 0 5px; border: none;">
                                <div class="section-container" style="margin-bottom: 0;">
                                    <table style="margin-bottom: 0;">
                                        <thead><tr><th class="blue-hdr" colspan="2">3. EQUIPMENT & VEHICLES</th></tr><tr><th>Description</th><th>Nos.</th></tr></thead>
                                        <tbody>
                                            ${renderTableRows(data.equipment, (row) => `<td class="text-left">${row.description || ''}</td><td style="width:25%">${row.count || ''}</td>`)}
                                            <tr><th class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL</th><th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.equipment) || '0'}</th></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>` : ''}
                        </tr>
                    </table>` : ''}

                    ${!data.hiddenSections?.includes('labor') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;"><tr><th class="blue-hdr" colspan="5">4. MAIN CONTRACTOR LABOR</th></tr><tr><th>S.NO</th><th>TRADES</th><th>IN HOUSE</th><th>SUPPLY</th><th>TOTAL</th></tr></thead>
                            <tbody>
                                ${renderTableRows(data.mainContractorLabor, (row, i) => `<td style="width:5%">${i + 1}</td><td class="text-left" style="width:45%">${row.trade || ''}</td><td style="width:15%">${row.inHouse || ''}</td><td style="width:15%">${row.supply || ''}</td><td class="font-bold" style="width:20%; background-color: #F8FAFC;">${row.total || ''}</td>`)}
                                <tr><th colspan="4" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL MAIN CONTRACTOR LABOR</th><th class="font-bold" style="background-color: #F1F5F9;">${sumTotal(data.mainContractorLabor) || '0'}</th></tr>
                            </tbody>
                        </table>
                    </div>` : ''}

                    ${!data.hiddenSections?.includes('subconLabor') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;"><tr><th class="blue-hdr" colspan="3">5. SUBCONTRACTOR LABOR</th></tr><tr><th>S.NO</th><th>SUBCON NAME</th><th>NOS.</th></tr></thead>
                            <tbody>
                                ${renderTableRows(data.subcontractorLabor, (row, i) => `<td style="width:10%">${i + 1}</td><td class="text-left" style="width:60%">${row.name || ''}</td><td style="width:30%">${row.count || ''}</td>`)}
                                <tr><th colspan="2" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL SUBCON LABOR</th><th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.subcontractorLabor) || '0'}</th></tr>
                            </tbody>
                        </table>
                    </div>` : ''}

                    ${!data.hiddenSections?.includes('nightShift') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;"><tr><th class="blue-hdr" colspan="3">6. NIGHT SHIFT</th></tr><tr><th>S.NO</th><th>Trade</th><th>NOS.</th></tr></thead>
                            <tbody>
                                ${renderTableRows(data.nightShift, (row, i) => `<td style="width:15%">${i + 1}</td><td class="text-left">${row.trade || ''}</td><td style="width:25%">${row.count || ''}</td>`)}
                                <tr><th colspan="2" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL NIGHT SHIFT</th><th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.nightShift) || '0'}</th></tr>
                            </tbody>
                        </table>
                    </div>` : ''}

                    ${!data.hiddenSections?.includes('activities') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;">
                                <tr><th class="blue-hdr" colspan="8">7. ON-GOING ACTIVITIES & PROGRESS</th></tr>
                                <tr><th style="width:5%">S.No</th><th class="text-left" style="width:35%">Activity Description</th><th style="width:8%">UOM</th><th style="width:10%">Total Qty</th><th style="width:10%">Prev Qty</th><th style="width:10%">Today Qty</th><th style="width:10%">Balance Qty</th><th style="width:12%">Progress indicator (%)</th></tr>
                            </thead>
                            <tbody>
                                ${renderTableRows(data.activitiesProgress, (row, i) => {
        const t = Number(row.totalQty) || 0;
        const p = Number(row.prevQty) || 0;
        const today = Number(row.todayQty) || 0;
        const cum = p + today;
        const bal = t > 0 ? Math.max(0, t - cum) : 0;
        const pct = t > 0 ? Math.min(100, Math.round((cum / t) * 100)) : 0;
        return `<td>${i + 1}</td><td class="text-left">${row.activityName || ''}</td><td>${row.uom || ''}</td><td>${row.totalQty || ''}</td><td>${row.prevQty || ''}</td><td class="font-bold">${row.todayQty || ''}</td><td>${row.totalQty ? bal : ''}</td><td>${row.totalQty ? `<div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${pct}%;"></div><div class="progress-text">${pct}%</div></div>` : ''}</td>`;
    })}
                            </tbody>
                        </table>
                    </div>` : ''}

                    ${!data.hiddenSections?.includes('concerns') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;">
                                <tr><th class="blue-hdr" colspan="4">8. AREAS OF CONCERN / ISSUES</th></tr>
                                <tr><th style="width:5%">S.No</th><th class="text-left" style="width:25%">Location / Building No</th><th class="text-left" style="width:40%">Description of Concern</th><th class="text-left" style="width:30%">Corrective Action Required</th></tr>
                            </thead>
                            <tbody>
                                ${renderTableRows(data.areasOfConcern, (row, i) => `<td>${i + 1}</td><td class="text-left" style="white-space: pre-wrap;">${row.location || ''}</td><td class="text-left" style="color:red; white-space: pre-wrap;">${row.concern || ''}</td><td class="text-left" style="color:blue; white-space: pre-wrap;">${row.action || ''}</td>`)}
                            </tbody>
                        </table>
                    </div>` : ''}

                    <!-- Author Sign Off -->
                    <div style="margin-top: 25px; margin-bottom: 25px; text-align: right; margin-right: 50px;">
                        <strong>Prepared By:</strong> <br />
                        <span style="font-size: 16px; font-style: italic;">${report.author}</span>
                    </div>

                    ${renderPhotos()}
                </div>
            </body>
        </html>
    `;
}
