import { ProjectSnag, Project } from '../../../store/projectsStore';
import { getSnagStatusColor, getSnagStatusLabel } from '../../units/snagStatus';
import { makeUnitCode } from '../../units/unitCode';
import { makeSnagRef } from '../../units/snagRef';

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatSnagLocation(snag: ProjectSnag, project: Project, building?: any): string {
    const unitCode = makeUnitCode(snag.floor, snag.flat, project, building, snag.areaType);
    const hasUnitCode = !!unitCode;
    const isUnitType = snag.areaType === 'unit' && snag.flat !== undefined && snag.flat !== null;

    if (hasUnitCode && isUnitType) {
        let loc = `Unit ${unitCode}`;
        if (snag.room && snag.room.trim()) {
            loc += ` · ${snag.room.trim()}`;
        }
        return loc;
    } else {
        const parts: string[] = [];
        if (building && (building.name || building.code)) {
            parts.push(building.name || building.code);
        }
        if (snag.floor !== undefined && snag.floor !== null) {
            parts.push(`Floor ${snag.floor}`);
        }
        if (snag.room && snag.room.trim()) {
            parts.push(snag.room.trim());
        }
        return parts.length ? parts.join(' · ') : '—';
    }
}

export interface SnagReportOptions {
    format: 'detailed' | 'summary';
    filterSummary?: string;
    snagsPerPage?: 1 | 2 | 3 | 4;
}

export function generateSnagReportHTML(
    snags: ProjectSnag[],
    project: Project,
    options: SnagReportOptions
): string {
    const perPage = options.snagsPerPage ?? 1;
    const densityClass = perPage >= 3 ? `snags-compact snags-per-${perPage}` : '';
    const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const isEmbeddableImage = (l: any) => l && typeof l === 'string' && l.length > 100 && l.startsWith('data:image') && !l.includes('undefined') && !l.includes('null');

    // S9 will move photos off base64 to local URIs / storage paths; this gate must not silently drop non-base64 sources.
    const isRenderablePhoto = (p: any): boolean => {
        if (!p || typeof p !== 'string') return false;
        const trimmed = p.trim();
        if (!trimmed || trimmed.includes('undefined') || trimmed.includes('null')) return false;
        return (
            trimmed.startsWith('data:image') ||
            trimmed.startsWith('http://') ||
            trimmed.startsWith('https://') ||
            trimmed.startsWith('file://')
        );
    };

    const empLogo = isEmbeddableImage(project.employerLogo) ? project.employerLogo : null;
    const consLogo = isEmbeddableImage(project.consultantLogo) ? project.consultantLogo : null;
    const contLogos = Array.isArray(project.contractorLogos) ? project.contractorLogos.filter(isEmbeddableImage) : [];

    const hasProjectLogos = empLogo || consLogo || contLogos.length > 0;
    const fallbackHeaderLabel = escapeHtml(
        (project.client && project.client.trim()) ||
        (project.name && project.name.trim()) ||
        'MAIN CONTRACTOR'
    );

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
                    <div style="font-weight:bold; font-size: 14px; color: #1E3A5F;">${fallbackHeaderLabel}</div>
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
        <div class="summary">
            <div class="section-heading">SUMMARY</div>
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <div class="stat-row">
                    <div class="stat-card" style="border-top: 3px solid #1E3A5F;">
                        <div class="stat-num" style="color: #1E3A5F;">${totalCount}</div>
                        <div class="stat-label">Total Snags</div>
                    </div>
                    <div class="stat-card" style="border-top: 3px solid #D97706;">
                        <div class="stat-num" style="color: #D97706;">${openCount}</div>
                        <div class="stat-label">Open</div>
                    </div>
                    <div class="stat-card" style="border-top: 3px solid #2563EB;">
                        <div class="stat-num" style="color: #2563EB;">${inProgressCount}</div>
                        <div class="stat-label">In Progress</div>
                    </div>
                    <div class="stat-card" style="border-top: 3px solid #059669;">
                        <div class="stat-num" style="color: #059669;">${closedCount}</div>
                        <div class="stat-label">Closed</div>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="stat-card" style="border-top: 3px solid #EF4444;">
                        <div class="stat-num" style="color: #EF4444;">${criticalCount}</div>
                        <div class="stat-label">Critical</div>
                    </div>
                    <div class="stat-card" style="border-top: 3px solid #F97316;">
                        <div class="stat-num" style="color: #F97316;">${majorCount}</div>
                        <div class="stat-label">Major</div>
                    </div>
                    <div class="stat-card" style="border-top: 3px solid #EAB308;">
                        <div class="stat-num" style="color: #EAB308;">${minorCount}</div>
                        <div class="stat-label">Minor</div>
                    </div>
                    <div class="stat-card" style="border-top: 3px solid #64748B;">
                        <div class="stat-num" style="color: #64748B;">${cosmeticCount}</div>
                        <div class="stat-label">Cosmetic</div>
                    </div>
                </div>
            </div>
        </div>
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

    const renderSnagCard = (snag: ProjectSnag, building: any) => {
        const ref = makeSnagRef(snag.legacyCode || makeUnitCode(snag.floor, snag.flat, project, building, snag.areaType), snag.seq);
        const ctxPhoto = snag.photos && snag.photos[0] && isRenderablePhoto(snag.photos[0]) ? snag.photos[0] : null;
        const detPhoto = snag.photos && snag.photos[1] && isRenderablePhoto(snag.photos[1]) ? snag.photos[1] : null;
        const snagDateStr = snag.createdAt ? new Date(snag.createdAt).toLocaleDateString('en-GB') : '-';
        
        return `
            <div class="snag-block snag-sev-${snag.severity} ${densityClass}">
                <div class="snag-details">
                    <div class="snag-header">
                        <div class="snag-ref">${ref}</div>
                        <div class="snag-badges">
                            <span class="badge badge-sev-${snag.severity}">${snag.severity.toUpperCase()}</span>
                            <span class="badge" style="background-color: ${getSnagStatusColor(snag.status)}20; color: ${getSnagStatusColor(snag.status)}; border: 1px solid ${getSnagStatusColor(snag.status)};">${getSnagStatusLabel(snag.status)}</span>
                        </div>
                    </div>
                    <div class="snag-loc">${formatSnagLocation(snag, project, building)}</div>
                    <div class="snag-desc">${snag.description || 'No description provided.'}</div>
                    <div class="snag-meta">
                        ${snag.trade ? `<span><strong>Trade:</strong> ${snag.trade}</span>` : ''}
                        <span><strong>Date:</strong> ${snagDateStr}</span>
                    </div>
                </div>
                
                <div class="snag-photos">
                    ${ctxPhoto ? `<div class="snag-photo"><img src="${ctxPhoto}" /><div class="photo-caption">Context</div></div>` : `<div class="snag-photo no-photo">No Context Photo</div>`}
                    ${detPhoto ? `<div class="snag-photo"><img src="${detPhoto}" /><div class="photo-caption">Detail</div></div>` : `<div class="snag-photo no-photo">No Detail Photo</div>`}
                </div>
            </div>
        `;
    };

    if (options.format === 'summary') {
        sortedBuildings.forEach(bId => {
            const floorMap = grouped.get(bId)!;
            const building = Array.isArray(project.buildings) ? project.buildings.find(b => b.id === bId) : undefined;
            const bName = building ? `${building.code}${building.name ? ` - ${building.name}` : ''}` : (bId === 'unassigned' ? 'Unassigned Building' : bId);
            
            bodyHTML += `<div class="section-heading" style="margin-top: 30px; font-size: 16px;">BUILDING: ${bName}</div>`;
            
            // Sort floors properly
            const floors = Array.from(floorMap.keys()).sort((a, b) => a - b);
            
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
                floorSnags.sort((a, b) => {
                    const flatA = a.flat || 0;
                    const flatB = b.flat || 0;
                    if (flatA !== flatB) return flatA - flatB;
                    return a.seq - b.seq;
                });
                
                floorSnags.forEach(snag => {
                    const ref = makeSnagRef(snag.legacyCode || makeUnitCode(snag.floor, snag.flat, project, building, snag.areaType), snag.seq);
                    const loc = formatSnagLocation(snag, project, building);
                    const desc = snag.description || '-';
                    const trade = snag.trade || '-';
                    const snagDateStr = snag.createdAt ? new Date(snag.createdAt).toLocaleDateString('en-GB') : '-';
                    
                    bodyHTML += `<tr>
                        <td class="text-left font-bold" style="white-space: nowrap;">${ref}</td>
                        <td class="text-left">${loc}</td>
                        <td class="text-left" style="white-space: pre-wrap;">${desc}</td>
                        <td class="text-center"><span class="badge badge-sev-${snag.severity}" style="font-size: 9px;">${snag.severity.toUpperCase()}</span></td>
                        <td class="text-left">${trade}</td>
                        <td class="text-center"><span class="badge" style="background-color: ${getSnagStatusColor(snag.status)}20; color: ${getSnagStatusColor(snag.status)}; border: 1px solid ${getSnagStatusColor(snag.status)}; font-size: 9px;">${getSnagStatusLabel(snag.status)}</span></td>
                        <td class="text-center" style="white-space: nowrap;">${snagDateStr}</td>
                    </tr>`;
                });
            });
            bodyHTML += `</tbody></table>`;
        });
    } else {
        // Detailed format: Deterministic pagination chunking
        interface PageChunk {
            buildingName: string;
            building: any;
            floorName: string;
            isFirstChunkOfBuilding: boolean;
            isContinuation: boolean;
            snags: ProjectSnag[];
        }

        const pageChunks: PageChunk[] = [];

        sortedBuildings.forEach(bId => {
            const floorMap = grouped.get(bId)!;
            const building = Array.isArray(project.buildings) ? project.buildings.find(b => b.id === bId) : undefined;
            const bName = building ? `${building.code}${building.name ? ` - ${building.name}` : ''}` : (bId === 'unassigned' ? 'Unassigned Building' : bId);
            const floors = Array.from(floorMap.keys()).sort((a, b) => a - b);

            let isFirstChunkOfThisBuilding = true;

            floors.forEach(fl => {
                const flName = fl === -999 ? 'Unassigned Floor' : `Floor ${fl}`;
                const floorSnags = floorMap.get(fl)!;
                floorSnags.sort((a, b) => {
                    const flatA = a.flat || 0;
                    const flatB = b.flat || 0;
                    if (flatA !== flatB) return flatA - flatB;
                    return a.seq - b.seq;
                });

                for (let i = 0; i < floorSnags.length; i += perPage) {
                    const chunkSnags = floorSnags.slice(i, i + perPage);
                    const isContinuation = i > 0;
                    pageChunks.push({
                        buildingName: bName,
                        building,
                        floorName: flName,
                        isFirstChunkOfBuilding: isFirstChunkOfThisBuilding,
                        isContinuation,
                        snags: chunkSnags
                    });
                    isFirstChunkOfThisBuilding = false;
                }
            });
        });

        pageChunks.forEach((chunk, index) => {
            const isLastPage = index === pageChunks.length - 1;
            const isSingleSnag = chunk.snags.length === 1;
            const pageClasses = ['snag-page'];
            if (isSingleSnag) pageClasses.push('snag-page-single');
            if (isLastPage) pageClasses.push('last-page');
            const pageClass = pageClasses.join(' ');

            let pageContent = '';

            if (chunk.isFirstChunkOfBuilding) {
                pageContent += `<div class="section-heading" style="margin-top: 10px; font-size: 16px; page-break-after: avoid;">BUILDING: ${chunk.buildingName}</div>`;
            }

            const headingText = chunk.isContinuation ? `${chunk.floorName} (cont.)` : chunk.floorName;
            pageContent += `<div class="floor-heading" style="font-weight: bold; font-size: 14px; margin-top: 10px; margin-bottom: 10px; color: #334155; border-bottom: 1px solid #CBD5E1; padding-bottom: 5px; page-break-after: avoid;">${headingText}</div>`;

            chunk.snags.forEach(snag => {
                pageContent += renderSnagCard(snag, chunk.building);
            });

            bodyHTML += `<div class="${pageClass}">${pageContent}</div>`;
        });
    }

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

                    .stat-row { display: flex; gap: 10px; margin-bottom: 10px; page-break-inside: avoid; }
                    .stat-card { flex: 1; background-color: #FFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; text-align: center; }
                    .stat-num { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
                    .stat-label { font-size: 10px; text-transform: uppercase; color: #64748B; }

                    .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px; margin-bottom: 20px; background: #FFF; position: relative; }
                    .logo-container { flex: 1; display: flex; gap: 15px; align-items: center; justify-content: flex-start; }
                    .logo-container.right { justify-content: flex-end; }
                    .header-title-container { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; text-align: center; }
                    .header-title { font-size: 18px; font-weight: 900; color: #2563EB; text-transform: uppercase; margin-bottom: 4px; }
                    .header-meta-strip { font-size: 11px; color: #64748B; font-weight: 500; }
                    .header-logo { height: 50px; width: 100px; background-size: contain; background-repeat: no-repeat; background-position: center; }

                    .summary { page-break-inside: avoid; }
                    ${options.format !== 'summary' ? '.summary { page-break-after: always; }' : ''}

                    .section-heading { font-size: 14px; font-weight: bold; color: #1E3A5F; margin: 25px 0 10px 0; padding-left: 8px; border-left: 4px solid #2563EB; text-transform: uppercase; page-break-after: avoid; }
                    .floor-heading { page-break-after: avoid; }

                    .snag-page { page-break-after: always; }
                    .snag-page:last-of-type, .snag-page.last-page { page-break-after: auto; }
                    .snag-page.snag-page-single { page-break-inside: avoid; }

                    .snag-block { margin-bottom: 12px; padding: 16px; border: 1px solid #E2E8F0; border-radius: 6px; background-color: #FAFAF9; max-height: 900px; overflow: hidden; box-sizing: border-box; }
                    .snag-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; page-break-inside: avoid; }
                    .snag-ref { font-size: 16px; font-weight: bold; color: #0F172A; }
                    .snag-badges { display: flex; gap: 8px; }
                    .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block; text-align: center; }
                    .badge-sev-critical { background-color: #FEE2E2; color: #EF4444; border: 1px solid #EF4444; }
                    .badge-sev-major { background-color: #FFEDD5; color: #F97316; border: 1px solid #F97316; }
                    .badge-sev-minor { background-color: #FEF9C3; color: #EAB308; border: 1px solid #EAB308; }
                    .badge-sev-cosmetic { background-color: #F1F5F9; color: #64748B; border: 1px solid #64748B; }
                    
                    .snag-meta { font-size: 11px; color: #475569; margin-bottom: 12px; display: flex; gap: 15px; }
                    .snag-desc { font-size: 13px; font-weight: normal; color: #1E293B; margin-bottom: 10px; line-height: 1.5; white-space: pre-wrap; }
                    .snag-loc { font-size: 11px; color: #64748B; margin-bottom: 8px; }
                    .snag-sev-critical { border-left: 4px solid #EF4444; }
                    .snag-sev-major { border-left: 4px solid #F97316; }
                    .snag-sev-minor { border-left: 4px solid #EAB308; }
                    .snag-sev-cosmetic { border-left: 4px solid #64748B; }
                    
                    .snag-photos { display: flex; gap: 15px; }
                    .snag-photo { flex: 1; border: 1px solid #CBD5E1; background-color: #F8FAFC; border-radius: 4px; overflow: hidden; page-break-inside: avoid; }
                    ${perPage < 3 ? `
                    .snag-photo img { width: 100%; height: ${perPage === 1 ? '320px' : '130px'}; object-fit: contain; background-color: #FFF; display: block; }
                    .no-photo { display: flex; align-items: center; justify-content: center; height: ${perPage === 1 ? '320px' : '130px'}; color: #94A3B8; font-style: italic; font-size: 12px; page-break-inside: avoid; }
                    ` : `
                    .snag-photo img { object-fit: cover; background-color: #FFF; display: block; }
                    .no-photo { display: flex; align-items: center; justify-content: center; color: #94A3B8; font-style: italic; font-size: 12px; page-break-inside: avoid; }
                    `}
                    .photo-caption { font-size: 10px; text-align: center; padding: 6px; background-color: #F1F5F9; color: #475569; border-top: 1px solid #CBD5E1; font-weight: bold; }

                    .snag-block.snags-compact { display: flex; gap: 12px; align-items: flex-start; box-sizing: border-box; padding: 10px; max-height: none; overflow: visible; }
                    .snag-block.snags-compact .snag-details { flex: 1; min-width: 0; }
                    .snag-block.snags-compact .snag-photos { flex-direction: column; gap: 6px; flex: 0 0 auto; }
                    .snag-block.snags-per-3 .snag-photo, .snag-block.snags-per-3 .no-photo { width: 130px; }
                    .snag-block.snags-per-3 .snag-photo img { width: 130px; height: 130px; object-fit: cover; }
                    .snag-block.snags-per-3 .no-photo { height: 130px; }
                    .snag-block.snags-per-4 .snag-photo, .snag-block.snags-per-4 .no-photo { width: 100px; }
                    .snag-block.snags-per-4 .snag-photo img { width: 100px; height: 100px; object-fit: cover; }
                    .snag-block.snags-per-4 .no-photo { height: 100px; }

                    @media print {
                        @page { margin: 10mm; }
                        html, body { height: auto; overflow: visible !important; }
                        .layout { display: block; width: 100%; height: auto; overflow: visible !important; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        ${options.format !== 'summary' ? '.summary { page-break-after: always; }' : ''}
                        .snag-page { page-break-after: always; }
                        .snag-page:last-of-type, .snag-page.last-page { page-break-after: auto; }
                        .snag-page.snag-page-single { page-break-inside: avoid; }
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
