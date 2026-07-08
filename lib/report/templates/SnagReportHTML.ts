import { ProjectSnag, Project } from '../../../store/projectsStore';
import { getSnagStatusColor, getSnagStatusLabel } from '../../units/snagStatus';
import { makeUnitCode } from '../../units/unitCode';
import { makeSnagRef } from '../../units/snagRef';

export interface SnagReportOptions {
    format: 'detailed' | 'summary';
    filterSummary?: string;
}

export function generateSnagReportHTML(
    snags: ProjectSnag[],
    project: Project,
    options: SnagReportOptions
): string {
    const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const validateLogo = (l: any) => l && typeof l === 'string' && l.length > 100 && l.startsWith('data:image') && !l.includes('undefined') && !l.includes('null');

    const empLogo = validateLogo(project.employerLogo) ? project.employerLogo : null;
    const consLogo = validateLogo(project.consultantLogo) ? project.consultantLogo : null;
    const contLogos = Array.isArray(project.contractorLogos) ? project.contractorLogos.filter(validateLogo) : [];

    const hasProjectLogos = empLogo || consLogo || contLogos.length > 0;

    let headerHTML = '';

    if (hasProjectLogos) {
        let rightLogosHtml = '';
        if (consLogo) {
            rightLogosHtml += `<div style="text-align: center;"><div class="header-logo" style="background-image: url('${consLogo}');"></div><div style="font-size: 8px; margin-top: 2px;">CONSULTANT</div></div>`;
        }
        contLogos.slice(0, 2).forEach((url: string) => {
            rightLogosHtml += `<div style="text-align: center;"><div class="header-logo" style="background-image: url('${url}');"></div><div style="font-size: 8px; margin-top: 2px;">CONTRACTOR</div></div>`;
        });

        headerHTML = `
            <div class="header-container">
                <div class="logo-container">
                    ${empLogo ? `<div style="text-align: center;"><div class="header-logo" style="background-image: url('${empLogo}');"></div><div style="font-size: 8px; margin-top: 2px; color: #64748B;">EMPLOYER</div></div>` : ''}
                </div>
                <div class="header-title-container">
                    <div class="header-title">SNAG REPORT</div>
                    <div class="header-meta-strip">${project.name}${project.location ? ` - ${project.location}` : ''} &nbsp;|&nbsp; ${dateStr}</div>
                    ${options.filterSummary ? `<div class="header-meta-strip" style="margin-top:4px; font-weight:normal;">${options.filterSummary}</div>` : ''}
                </div>
                <div class="logo-container right">
                    ${rightLogosHtml}
                </div>
            </div>
        `;
    } else {
        headerHTML = `
            <div class="header-container">
                <div class="logo-container">
                    <div style="font-weight:bold; font-size: 14px; color: #1E3A5F;">MAIN CONTRACTOR</div>
                </div>
                <div class="header-title-container">
                    <div class="header-title">SNAG REPORT</div>
                    <div class="header-meta-strip">${project.name}${project.location ? ` - ${project.location}` : ''} &nbsp;|&nbsp; ${dateStr}</div>
                    ${options.filterSummary ? `<div class="header-meta-strip" style="margin-top:4px; font-weight:normal;">${options.filterSummary}</div>` : ''}
                </div>
                <div class="logo-container right">
                </div>
            </div>
        `;
    }

    // Summary block
    const totalCount = snags.length;
    const openCount = snags.filter(s => s.status === 'open').length;
    const inProgressCount = snags.filter(s => s.status === 'in_progress').length;
    const closedCount = snags.filter(s => s.status === 'closed').length;

    const criticalCount = snags.filter(s => s.severity === 'critical').length;
    const majorCount = snags.filter(s => s.severity === 'major').length;
    const minorCount = snags.filter(s => s.severity === 'minor').length;
    const cosmeticCount = snags.filter(s => s.severity === 'cosmetic').length;

    let summaryHTML = `
        <div class="section-heading">SUMMARY</div>
        <table style="width: 100%; border: none; margin-bottom: 20px;">
            <tr>
                <td style="border: none; padding: 0 10px; width: 33%;">
                    <div style="font-size: 12px; color: #64748B;">Total Snags</div>
                    <div style="font-size: 24px; font-weight: bold; color: #1E3A5F;">${totalCount}</div>
                </td>
                <td style="border: none; padding: 0 10px; width: 33%;">
                    <div style="font-size: 12px; color: #64748B;">By Status</div>
                    <div style="font-size: 12px;">
                        <span style="color: ${getSnagStatusColor('open')};">Open: <b>${openCount}</b></span> &nbsp;
                        <span style="color: ${getSnagStatusColor('in_progress')};">In Progress: <b>${inProgressCount}</b></span> &nbsp;
                        <span style="color: ${getSnagStatusColor('closed')};">Closed: <b>${closedCount}</b></span>
                    </div>
                </td>
                <td style="border: none; padding: 0 10px; width: 33%;">
                    <div style="font-size: 12px; color: #64748B;">By Severity</div>
                    <div style="font-size: 12px;">
                        <span style="color: #EF4444;">Critical: <b>${criticalCount}</b></span> &nbsp;
                        <span style="color: #F97316;">Major: <b>${majorCount}</b></span> &nbsp;
                        <span style="color: #EAB308;">Minor: <b>${minorCount}</b></span> &nbsp;
                        <span style="color: #64748B;">Cosmetic: <b>${cosmeticCount}</b></span>
                    </div>
                </td>
            </tr>
        </table>
    `;

    // Grouping
    const grouped = new Map<string, Map<number, ProjectSnag[]>>();
    snags.forEach(s => {
        const bId = s.buildingId || 'unassigned';
        if (!grouped.has(bId)) grouped.set(bId, new Map());
        const fl = s.floor ?? -999;
        if (!grouped.get(bId)!.has(fl)) grouped.get(bId)!.set(fl, []);
        grouped.get(bId)!.get(fl)!.push(s);
    });

    let bodyHTML = '';
    
    // Sort buildings (unassigned last)
    const sortedBuildings = Array.from(grouped.keys()).sort((a, b) => {
        if (a === 'unassigned') return 1;
        if (b === 'unassigned') return -1;
        return a.localeCompare(b);
    });

    sortedBuildings.forEach(bId => {
        const floorMap = grouped.get(bId)!;
        const building = project.buildings?.find(b => b.id === bId);
        const bName = building ? `${building.code}${building.name ? ` - ${building.name}` : ''}` : (bId === 'unassigned' ? 'Unassigned Building' : bId);
        
        bodyHTML += `<div class="section-heading" style="margin-top: 30px; font-size: 16px;">BUILDING: ${bName}</div>`;
        
        // Sort floors properly
        const floors = Array.from(floorMap.keys()).sort((a, b) => a - b);
        
        if (options.format === 'summary') {
            bodyHTML += `<table style="width: 100%; border: none; margin-bottom: 20px;">`;
            bodyHTML += `<thead><tr>
                <th class="blue-hdr text-left" style="width:12%">Ref</th>
                <th class="blue-hdr text-left" style="width:15%">Location</th>
                <th class="blue-hdr text-left" style="width:33%">Description</th>
                <th class="blue-hdr text-center" style="width:10%">Severity</th>
                <th class="blue-hdr text-left" style="width:10%">Trade</th>
                <th class="blue-hdr text-center" style="width:10%">Status</th>
                <th class="blue-hdr text-center" style="width:10%">Date</th>
            </tr></thead><tbody>`;
            
            floors.forEach(fl => {
                const flName = fl === -999 ? 'Unassigned Floor' : `Floor ${fl}`;
                bodyHTML += `<tr style="background-color: #E2E8F0;"><td colspan="7" class="text-left font-bold" style="padding: 6px 8px; color: #1E3A5F; font-size: 12px;">${flName}</td></tr>`;
                
                const floorSnags = floorMap.get(fl)!;
                floorSnags.sort((a, b) => a.seq - b.seq);
                
                floorSnags.forEach(snag => {
                    const ref = makeSnagRef(snag.legacyCode || makeUnitCode(snag.floor, snag.flat, project, building), snag.seq);
                    const loc = snag.areaType ? snag.areaType.toUpperCase() : '-';
                    const desc = snag.description || '-';
                    const trade = snag.trade || '-';
                    const dateStr = snag.createdAt ? new Date(snag.createdAt).toLocaleDateString('en-GB') : '-';
                    
                    bodyHTML += `<tr>
                        <td class="text-left font-bold" style="white-space: nowrap;">${ref}</td>
                        <td class="text-left">${loc}</td>
                        <td class="text-left" style="white-space: pre-wrap;">${desc}</td>
                        <td class="text-center"><span class="badge badge-sev-${snag.severity}" style="font-size: 9px;">${snag.severity.toUpperCase()}</span></td>
                        <td class="text-left">${trade}</td>
                        <td class="text-center"><span class="badge" style="background-color: ${getSnagStatusColor(snag.status)}20; color: ${getSnagStatusColor(snag.status)}; border: 1px solid ${getSnagStatusColor(snag.status)}; font-size: 9px;">${getSnagStatusLabel(snag.status)}</span></td>
                        <td class="text-center" style="white-space: nowrap;">${dateStr}</td>
                    </tr>`;
                });
            });
            bodyHTML += `</tbody></table>`;
        } else {
            floors.forEach(fl => {
                const flName = fl === -999 ? 'Unassigned Floor' : `Floor ${fl}`;
                bodyHTML += `<div style="font-weight: bold; font-size: 14px; margin-top: 15px; margin-bottom: 10px; color: #334155; border-bottom: 1px solid #CBD5E1; padding-bottom: 5px;">${flName}</div>`;
                
                const floorSnags = floorMap.get(fl)!;
                floorSnags.sort((a, b) => a.seq - b.seq);
                
                floorSnags.forEach(snag => {
                    const ref = makeSnagRef(snag.legacyCode || makeUnitCode(snag.floor, snag.flat, project, building), snag.seq);
                    const ctxPhoto = snag.photos && snag.photos[0] && validateLogo(snag.photos[0]) ? snag.photos[0] : null;
                    const detPhoto = snag.photos && snag.photos[1] && validateLogo(snag.photos[1]) ? snag.photos[1] : null;
                    const dateStr = snag.createdAt ? new Date(snag.createdAt).toLocaleDateString('en-GB') : '-';
                    
                    bodyHTML += `
                        <div class="snag-block">
                            <div class="snag-header">
                                <div class="snag-ref">${ref}</div>
                                <div class="snag-badges">
                                    <span class="badge badge-sev-${snag.severity}">${snag.severity.toUpperCase()}</span>
                                    <span class="badge" style="background-color: ${getSnagStatusColor(snag.status)}20; color: ${getSnagStatusColor(snag.status)}; border: 1px solid ${getSnagStatusColor(snag.status)};">${getSnagStatusLabel(snag.status)}</span>
                                </div>
                            </div>
                            <div class="snag-desc">${snag.description || 'No description provided.'}</div>
                            <div class="snag-meta">
                                ${snag.trade ? `<span><strong>Trade:</strong> ${snag.trade}</span>` : ''}
                                ${snag.areaType ? `<span><strong>Area:</strong> ${snag.areaType.toUpperCase()}</span>` : ''}
                                <span><strong>Date:</strong> ${dateStr}</span>
                            </div>
                            
                            <div class="snag-photos">
                                ${ctxPhoto ? `<div class="snag-photo"><img src="${ctxPhoto}" /><div class="photo-caption">Context</div></div>` : `<div class="snag-photo no-photo">No Context Photo</div>`}
                                ${detPhoto ? `<div class="snag-photo"><img src="${detPhoto}" /><div class="photo-caption">Detail</div></div>` : `<div class="snag-photo no-photo">No Detail Photo</div>`}
                            </div>
                        </div>
                    `;
                });
            });
        }
    });

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
                    tbody tr:nth-child(even) { background-color: #F8FAFC; }
                    th, td { border: 1px solid #E2E8F0; padding: 8px; text-align: center; }
                    th { background-color: #1E3A5F; color: #FFF; font-weight: bold; font-size: 11px; border-color: #1E3A5F; }
                    .blue-hdr { background-color: #1E3A5F; color: #FFF; font-weight: bold; text-transform: uppercase; border: 1px solid #1E3A5F; }
                    .text-left { text-align: left; }
                    .text-center { text-align: center; }

                    .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px; margin-bottom: 20px; background: #FFF; position: relative; }
                    .logo-container { flex: 1; display: flex; gap: 15px; align-items: center; justify-content: flex-start; }
                    .logo-container.right { justify-content: flex-end; }
                    .header-title-container { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; text-align: center; }
                    .header-title { font-size: 18px; font-weight: 900; color: #2563EB; text-transform: uppercase; margin-bottom: 4px; }
                    .header-meta-strip { font-size: 11px; color: #64748B; font-weight: 500; }
                    .header-logo { height: 50px; width: 100px; background-size: contain; background-repeat: no-repeat; background-position: center; }

                    .section-heading { font-size: 14px; font-weight: bold; color: #1E3A5F; margin: 25px 0 10px 0; padding-left: 8px; border-left: 4px solid #2563EB; text-transform: uppercase; page-break-after: avoid; }
                    
                    .snag-block { margin-bottom: 20px; padding: 15px; border: 1px solid #E2E8F0; border-radius: 6px; page-break-inside: avoid; background-color: #FAFAF9; }
                    .snag-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
                    .snag-ref { font-size: 16px; font-weight: bold; color: #0F172A; }
                    .snag-badges { display: flex; gap: 8px; }
                    .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block; text-align: center; }
                    .badge-sev-critical { background-color: #FEE2E2; color: #EF4444; border: 1px solid #EF4444; }
                    .badge-sev-major { background-color: #FFEDD5; color: #F97316; border: 1px solid #F97316; }
                    .badge-sev-minor { background-color: #FEF9C3; color: #EAB308; border: 1px solid #EAB308; }
                    .badge-sev-cosmetic { background-color: #F1F5F9; color: #64748B; border: 1px solid #64748B; }
                    
                    .snag-meta { font-size: 11px; color: #475569; margin-bottom: 12px; display: flex; gap: 15px; }
                    .snag-desc { font-size: 12px; color: #1E293B; margin-bottom: 10px; line-height: 1.4; white-space: pre-wrap; font-weight: bold; }
                    
                    .snag-photos { display: flex; gap: 15px; }
                    .snag-photo { flex: 1; border: 1px solid #CBD5E1; background-color: #F8FAFC; border-radius: 4px; overflow: hidden; }
                    .snag-photo img { width: 100%; height: 200px; object-fit: contain; background-color: #FFF; display: block; }
                    .photo-caption { font-size: 10px; text-align: center; padding: 6px; background-color: #F1F5F9; color: #475569; border-top: 1px solid #CBD5E1; font-weight: bold; }
                    .no-photo { display: flex; align-items: center; justify-content: center; height: 200px; color: #94A3B8; font-style: italic; font-size: 12px; }

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
                    ${headerHTML}

                    <!-- Summary -->
                    ${summaryHTML}

                    <!-- Body -->
                    ${bodyHTML}
                </div>
            </body>
        </html>
    `;
}
