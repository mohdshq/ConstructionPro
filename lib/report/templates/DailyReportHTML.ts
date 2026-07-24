import { Report, Project } from '../../../store/projectsStore';
import { summaryByCompany, summaryByTrade, grandTotal, nightShiftTotal, rowTotal } from '../../reports/manpowerTotals';
import { getSectionLabel } from '../../report/dailySections';
import { delayMinutes, formatDuration, totalDelayMinutes } from '../../reports/delayDuration';

/**
 * Generates the Daily Progress Report HTML.
 * Extracted from the monolithic [reportId].tsx for maintainability.
 */
function sectionHeader(key: string): string {
    return `<div class="section-header"><span class="section-title">${getSectionLabel(key).toUpperCase()}</span></div>`;
}

export function generateDailyReportHTML(
    data: any,
    report: Report,
    project: Project,
): string {
    const dateStr = new Date(report.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const validateLogo = (l: any) => l && typeof l === 'string' && l.length > 100 && l.startsWith('data:image') && !l.includes('undefined') && !l.includes('null');

    const empLogo = validateLogo(project.employerLogo) ? project.employerLogo : null;
    const consLogo = validateLogo(project.consultantLogo) ? project.consultantLogo : null;
    const contLogos = Array.isArray(project.contractorLogos) ? project.contractorLogos.filter(validateLogo) : [];

    const hasProjectLogos = empLogo || consLogo || contLogos.length > 0;

    const rawLogos = data.logos || [];
    const reportLogos = rawLogos.filter(validateLogo);

    let headerHTML = '';

    if (reportLogos.length > 0) {
        const leftLogos = reportLogos.length <= 2 ? reportLogos.slice(0, 1) : reportLogos.slice(0, 2);
        const rightLogos = reportLogos.length === 2 ? reportLogos.slice(1, 2) : (reportLogos.length === 3 ? reportLogos.slice(2, 3) : reportLogos.slice(2, 4));

        headerHTML = `
            <div class="header-container">
                <div class="logo-container">
                    ${leftLogos.length > 0 ? leftLogos.map((url: string) => `<div class="header-logo" style="background-image: url('${url}');"></div>`).join('') : '<div style="font-weight:bold; font-size: 14px; color: #1E3A5F;">MAIN CONTRACTOR</div>'}
                </div>
                <div class="header-title-container">
                    <div class="header-title">DAILY PROGRESS REPORT</div>
                    <div class="header-meta-strip">${project.name}${project.location ? ` - ${project.location}` : ''} &nbsp;|&nbsp; ${dateStr}</div>
                </div>
                <div class="logo-container right">
                    ${rightLogos.length > 0 ? rightLogos.map((url: string) => `<div class="header-logo" style="background-image: url('${url}');"></div>`).join('') : ''}
                </div>
            </div>
        `;
    } else if (hasProjectLogos) {
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
                    <div class="header-title">DAILY PROGRESS REPORT</div>
                    <div class="header-meta-strip">${project.name}${project.location ? ` - ${project.location}` : ''} &nbsp;|&nbsp; ${dateStr}</div>
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
                    <div class="header-title">DAILY PROGRESS REPORT</div>
                    <div class="header-meta-strip">${project.name}${project.location ? ` - ${project.location}` : ''} &nbsp;|&nbsp; ${dateStr}</div>
                </div>
                <div class="logo-container right">
                </div>
            </div>
        `;
    }

    const isNewModel = Array.isArray(data.manpower) && data.manpower.length > 0;
    
    let mcTotalStr = data.manpowerMainContractor || '';
    let subconTotalStr = data.manpowerSubcontractors || '';
    let nightTotalStr = data.manpowerOthers || '';
    let grandTotalStr = data.manpowerTotal || '';

    if (isNewModel) {
        const compSummaries = summaryByCompany(data.manpower);
        const mcTotal = compSummaries.filter(c => c.isMainContractor).reduce((acc, c) => acc + c.total, 0);
        const subconTotal = compSummaries.filter(c => !c.isMainContractor).reduce((acc, c) => acc + c.total, 0);
        
        mcTotalStr = String(mcTotal);
        subconTotalStr = String(subconTotal);
        nightTotalStr = String(nightShiftTotal(data.manpower));
        grandTotalStr = String(grandTotal(data.manpower));
    }

    const renderNewManpowerSection = () => {
        if (!isNewModel || data.hiddenSections?.includes('manpower')) return '';

        const groups = new Map<string, any[]>();
        data.manpower.forEach((r: any) => {
            const c = r.company || 'Unassigned';
            if (!groups.has(c)) groups.set(c, []);
            groups.get(c)!.push(r);
        });

        let html = '<div class="section-container" style="page-break-inside: auto;">';
        
        // --- SUMMARY BAND ---
        const staffRows = data.manpower.filter((r: any) => r.category === 'staff');
        const staffSummaries = summaryByTrade(staffRows).filter(t => t.trade && t.trade.toLowerCase() !== 'unknown' && t.trade.trim() !== '');
        const hasStaff = staffSummaries.length > 0;

        const compSummaries = summaryByCompany(data.manpower);
        const hasCompany = compSummaries.length > 0;

        const laborRows = data.manpower.filter((r: any) => r.category !== 'staff');
        const laborSummaries = summaryByTrade(laborRows).filter(t => t.trade && t.trade.toLowerCase() !== 'unknown' && t.trade.trim() !== '');
        const hasLabor = laborSummaries.length > 0;

        const showCompany = !data.hiddenSections?.includes('manpowerByCompany') && hasCompany;
        const showTrade = !data.hiddenSections?.includes('manpowerByTrade') && hasLabor;
        const showStaff = !data.hiddenSections?.includes('manpowerByStaff') && hasStaff;

        let visibleCount = 0;
        if (showStaff) visibleCount++;
        if (showCompany) visibleCount++;
        if (showTrade) visibleCount++;

        if (visibleCount > 0) {
            html += `<div class="section-heading">MANPOWER SUMMARIES</div>`;
            html += `<table style="width: 100%; border: none; margin-bottom: 15px; page-break-inside: avoid;"><tr style="vertical-align: top; border: none; background: transparent;">`;
            
            const cellWidth = visibleCount === 3 ? '33.33%' : visibleCount === 2 ? '50%' : '100%';
            
            // 1. Staff Summary
            if (showStaff) {
                html += `<td style="width: ${cellWidth}; padding: 0 5px; border: none; background: transparent;">`;
                html += `<table style="margin-bottom: 0;"><thead><tr><th class="text-left" colspan="2">Summary of Staff</th></tr><tr><th class="text-left" style="width: 70%;">Role</th><th style="width: 30%;">Count</th></tr></thead><tbody>`;
                let sumStaff = 0;
                staffSummaries.forEach(ts => {
                    sumStaff += ts.count;
                    html += `<tr><td class="text-left">${ts.trade}</td><td class="font-bold">${ts.count}</td></tr>`;
                });
                html += `<tr class="total-row"><td class="text-left">TOTAL STAFF</td><td>${sumStaff}</td></tr>`;
                html += `</tbody></table>`;
                html += `</td>`;
            }

            // 2. Company Summary
            if (showCompany) {
                html += `<td style="width: ${cellWidth}; padding: 0 5px; border: none; background: transparent;">`;
                html += `<table style="margin-bottom: 0;"><thead><tr><th class="text-left" colspan="4">Summary by Company</th></tr><tr><th class="text-left" style="width: 40%;">Company</th><th style="width: 20%;">In-House</th><th style="width: 20%;">Supply</th><th style="width: 20%;">Total</th></tr></thead><tbody>`;
                compSummaries.forEach(cs => {
                    if (cs.isMainContractor) {
                        html += `<tr><td class="text-left">${cs.company} <span style="font-size:8px; color:#64748B;">(Main)</span></td><td>${cs.inHouse}</td><td>${cs.supply}</td><td class="font-bold">${cs.total}</td></tr>`;
                    } else {
                        html += `<tr><td class="text-left">${cs.company}</td><td colspan="2" class="text-center" style="color:#CBD5E1;">-</td><td class="font-bold">${cs.total}</td></tr>`;
                    }
                });
                html += `<tr class="total-row"><td colspan="3" class="text-left">GRAND TOTAL</td><td>${grandTotal(data.manpower)}</td></tr>`;
                html += `</tbody></table></td>`;
            }

            // 3. Trade Summary (Labor)
            if (showTrade) {
                html += `<td style="width: ${cellWidth}; padding: 0 5px; border: none; background: transparent;">`;
                html += `<table style="margin-bottom: 0;"><thead><tr><th class="text-left" colspan="2">Summary by Trade (Labor)</th></tr><tr><th class="text-left" style="width: 70%;">Trade</th><th style="width: 30%;">Count</th></tr></thead><tbody>`;
                let sumLabor = 0;
                laborSummaries.forEach(ts => {
                    sumLabor += ts.count;
                    html += `<tr><td class="text-left">${ts.trade}</td><td class="font-bold">${ts.count}</td></tr>`;
                });
                html += `<tr class="total-row"><td class="text-left">TOTAL LABOR</td><td>${sumLabor}</td></tr>`;
                html += `</tbody></table>`;
                html += `</td>`;
            }

            html += `</tr></table>`;
        }
        
        // --- DETAIL TABLES ---
        if (!data.hiddenSections?.includes('manpowerDetail')) {
            html += `<div class="section-heading">MANPOWER DETAILS</div>`;
            groups.forEach((rows, compName) => {
                const isMain = rows[0]?.isMainContractor;
                const staffRows = rows.filter(r => r.category === 'staff' && ((r.trade || '').trim() !== '' || rowTotal(r) > 0));
                const laborRows = rows.filter(r => r.category !== 'staff' && ((r.trade || '').trim() !== '' || rowTotal(r) > 0));
                
                let compTotal = 0;
                
                html += `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; margin-top: 15px; color: #1E3A5F; display: flex; align-items: center;">
                    <div style="flex:1; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">${compName} ${isMain ? '<span style="color:#64748B; font-weight:normal;">(Main Contractor)</span>' : ''}</div>
                </div>`;
                
                // Staff Table
                if (staffRows.length > 0) {
                    html += `<table style="margin-bottom: 10px;"><thead><tr><th class="text-left" colspan="3">Staff</th></tr>`;
                    html += `<tr><th class="text-left" style="width: 50%;">Role</th><th style="width: 25%;">Shift</th><th style="width: 25%;">Count</th></tr></thead><tbody>`;
                    let staffSubTotal = 0;
                    staffRows.forEach(r => {
                        const rt = rowTotal(r);
                        staffSubTotal += rt;
                        compTotal += rt;
                        html += `<tr><td class="text-left">${r.trade || ''}</td><td>${r.shift === 'night' ? 'Night' : 'Day'}</td><td class="font-bold">${rt}</td></tr>`;
                    });
                    html += `<tr class="total-row"><td colspan="2" class="text-left">Staff Subtotal</td><td>${staffSubTotal}</td></tr>`;
                    html += `</tbody></table>`;
                }

                // Labor Table
                if (laborRows.length > 0) {
                    html += `<table style="margin-bottom: 15px;"><thead><tr><th class="text-left" colspan="${isMain ? '5' : '3'}">Labor</th></tr>`;
                    if (isMain) {
                        html += `<tr><th class="text-left" style="width: 40%;">Trade</th><th style="width: 15%;">Shift</th><th style="width: 15%;">In-House</th><th style="width: 15%;">Supply</th><th style="width: 15%;">Total</th></tr></thead><tbody>`;
                    } else {
                        html += `<tr><th class="text-left" style="width: 50%;">Trade</th><th style="width: 25%;">Shift</th><th style="width: 25%;">Count</th></tr></thead><tbody>`;
                    }
                    let laborSubTotal = 0;
                    laborRows.forEach(r => {
                        const rt = rowTotal(r);
                        laborSubTotal += rt;
                        compTotal += rt;
                        if (isMain) {
                            html += `<tr><td class="text-left">${r.trade || ''}</td><td>${r.shift === 'night' ? 'Night' : 'Day'}</td><td>${r.inHouse || 0}</td><td>${r.supply || 0}</td><td class="font-bold">${rt}</td></tr>`;
                        } else {
                            html += `<tr><td class="text-left">${r.trade || ''}</td><td>${r.shift === 'night' ? 'Night' : 'Day'}</td><td class="font-bold">${rt}</td></tr>`;
                        }
                    });
                    html += `<tr class="total-row"><td colspan="${isMain ? '4' : '2'}" class="text-left">Labor Subtotal</td><td>${laborSubTotal}</td></tr>`;
                    html += `</tbody></table>`;
                }
                
                html += `<div style="text-align: right; margin-bottom: 20px;">
                    <span style="font-weight: bold; color: #1E3A5F; font-size: 11px;">Total for ${compName}:</span> 
                    <span style="background-color: #1E3A5F; color: #FFF; padding: 4px 10px; border-radius: 2px; font-weight: bold; font-size: 11px; margin-left: 5px;">${compTotal}</span>
                </div>`;
            });
        }

        html += `</div>`;
        return html;
    };

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
                <div class="section-heading">PHOTOGRAPHIC EVIDENCE</div>
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
                    tbody tr:nth-child(even) { background-color: #F8FAFC; }
                    th, td { border: 1px solid #E2E8F0; padding: 8px; text-align: center; }
                    th { background-color: #1E3A5F; color: #FFF; font-weight: bold; font-size: 11px; border-color: #1E3A5F; }
                    .blue-hdr { background-color: #1E3A5F; color: #FFF; font-weight: bold; text-transform: uppercase; border: 1px solid #1E3A5F; }
                    .text-left { text-align: left; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                    .total-row td, .total-row th { background-color: #EFF6FF !important; color: #1E3A5F !important; font-weight: bold; border-color: #BFDBFE !important; }

                    .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px; margin-bottom: 20px; background: #FFF; position: relative; }
                    .logo-container { flex: 1; display: flex; gap: 15px; align-items: center; justify-content: flex-start; }
                    .logo-container.right { justify-content: flex-end; }
                    .header-title-container { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; text-align: center; }
                    .header-title { font-size: 18px; font-weight: 900; color: #2563EB; text-transform: uppercase; margin-bottom: 4px; }
                    .header-meta-strip { font-size: 11px; color: #64748B; font-weight: 500; }
                    .header-logo { height: 50px; width: 100px; background-size: contain; background-repeat: no-repeat; background-position: center; }

                    .section-header { font-size: 14px; font-weight: bold; background-color: #1E3A5F; color: #FFF; margin: 25px 0 10px 0; padding: 8px; text-transform: uppercase; page-break-after: avoid; border: 1px solid #1E3A5F; }
                    .section-heading { font-size: 14px; font-weight: bold; color: #1E3A5F; margin: 25px 0 10px 0; padding-left: 8px; border-left: 4px solid #2563EB; text-transform: uppercase; page-break-after: avoid; }
                    .section-container { margin-bottom: 15px; page-break-inside: auto; }

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
                    ${headerHTML}


                    ${data.aiSummary && !data.hiddenSections?.includes('aiSummary') ? `
                    <!-- AI Executive Summary -->
                    <div style="page-break-inside: avoid; margin-bottom: 15px;">
                        <table>
                            <tr>
                                <th class="blue-hdr text-left" style="padding-left: 8px;">✨ AI EXECUTIVE SUMMARY</th>
                            </tr>
                            <tr>
                                <td class="text-left" style="padding: 10px; background-color: #F8FAFC;">
                                    ${data.aiSummary.split('\n').map((line: string) => line.trim() ? `<div style="margin-bottom: 4px;">${line}</div>` : '').join('')}
                                </td>
                            </tr>
                        </table>
                    </div>
                    ` : ''}

                    <!-- Summary Row -->
                    <div class="section-heading">PROJECT OVERVIEW</div>
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
                            <td class="font-bold">${mcTotalStr}</td>
                            <td class="text-left">Humidity</td>
                            <td class="font-bold">${data.climateHumidity || ''}</td>
                        </tr>
                        <tr>
                            <td class="text-left">Completion Date:</td>
                            <td class="font-bold">${data.completionDate || 'TBA'}</td>
                            <td class="text-left">Subcontractors</td>
                            <td class="font-bold">${subconTotalStr}</td>
                            <td class="text-left">Visibility</td>
                            <td class="font-bold">${data.climateVisibility || ''}</td>
                        </tr>
                        <tr>
                            <td class="text-left">Anticipated Completion:</td>
                            <td class="font-bold">${data.anticipatedCompletionDate || 'TBA'}</td>
                            <td class="text-left">Others (Night)</td>
                            <td class="font-bold">${nightTotalStr}</td>
                            <td class="text-left">Temperature</td>
                            <td class="font-bold">${data.climateTemp || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="2"></td>
                            <td class="text-left font-bold">TOTAL MANPOWER</td>
                            <td class="font-bold">${grandTotalStr}</td>
                            <td class="text-left">Wind Speed</td>
                            <td class="font-bold">${data.climateWindSpeed || ''}</td>
                        </tr>
                    </table>

                    ${sectionHeader('manpower')}
                    ${isNewModel ? renderNewManpowerSection() : `
                    ${(!data.hiddenSections?.includes('mcStaff') || !data.hiddenSections?.includes('subconStaff') || !data.hiddenSections?.includes('equip')) ? `
                    <table style="width: 100%; border: none; margin-bottom: 15px; page-break-inside: auto;">
                        <tr style="vertical-align: top; page-break-inside: avoid; border: none;">
                            ${!data.hiddenSections?.includes('mcStaff') ? `
                            <td style="width: 33.33%; padding: 0 5px 0 0; border: none; background: transparent;">
                                <div class="section-container" style="margin-bottom: 0;">
                                    <table style="margin-bottom: 0;">
                                        <thead><tr><th class="blue-hdr" colspan="3">MAIN CONTRACTOR STAFF</th></tr><tr><th>Sr.No.</th><th>Role / Description</th><th>Nos.</th></tr></thead>
                                        <tbody>
                                            ${renderTableRows(data.mainContractorStaff, (row, i) => `<td style="width:10%">${i + 1}</td><td class="text-left">${row.description || ''}</td><td style="width:20%">${row.count || ''}</td>`)}
                                            <tr class="total-row"><td colspan="2" class="text-left">TOTAL</td><td>${sumCount(data.mainContractorStaff) || '0'}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>` : ''}
                            ${!data.hiddenSections?.includes('subconStaff') ? `
                            <td style="width: 33.33%; padding: 0 5px; border: none; background: transparent;">
                                <div class="section-container" style="margin-bottom: 0;">
                                    <table style="margin-bottom: 0;">
                                        <thead><tr><th class="blue-hdr" colspan="2">SUBCONTRACTOR'S STAFF</th></tr><tr><th>Company / Name</th><th>Nos</th></tr></thead>
                                        <tbody>
                                            ${renderTableRows(data.subcontractorStaff, (row) => `<td class="text-left">${row.name || ''}</td><td style="width:25%">${row.count || ''}</td>`)}
                                            <tr class="total-row"><td class="text-left">TOTAL</td><td>${sumCount(data.subcontractorStaff) || '0'}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>` : ''}
                            ${!data.hiddenSections?.includes('equip') ? `
                            <td style="width: 33.33%; padding: 0 0 0 5px; border: none; background: transparent;">
                                ${sectionHeader('equipment')}
                                <div class="section-container" style="margin-bottom: 0;">
                                    <table style="margin-bottom: 0;">
                                        <thead><tr><th>Description</th><th>Nos.</th></tr></thead>
                                        <tbody>
                                            ${renderTableRows(data.equipment, (row) => `<td class="text-left">${row.description || ''}</td><td style="width:25%">${row.count || ''}</td>`)}
                                            <tr class="total-row"><td class="text-left">TOTAL</td><td>${sumCount(data.equipment) || '0'}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>` : ''}
                        </tr>
                    </table>` : ''}

                    ${!data.hiddenSections?.includes('labor') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;"><tr><th class="blue-hdr" colspan="5">MAIN CONTRACTOR LABOR</th></tr><tr><th>S.NO</th><th>TRADES</th><th>IN HOUSE</th><th>SUPPLY</th><th>TOTAL</th></tr></thead>
                            <tbody>
                                ${renderTableRows(data.mainContractorLabor, (row, i) => `<td style="width:5%">${i + 1}</td><td class="text-left" style="width:45%">${row.trade || ''}</td><td style="width:15%">${row.inHouse || ''}</td><td style="width:15%">${row.supply || ''}</td><td class="font-bold" style="width:20%;">${row.total || ''}</td>`)}
                                <tr class="total-row"><td colspan="4" class="text-left">TOTAL MAIN CONTRACTOR LABOR</td><td>${sumTotal(data.mainContractorLabor) || '0'}</td></tr>
                            </tbody>
                        </table>
                    </div>` : ''}

                    ${!data.hiddenSections?.includes('subconLabor') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;"><tr><th class="blue-hdr" colspan="3">SUBCONTRACTOR LABOR</th></tr><tr><th>S.NO</th><th>SUBCON NAME</th><th>NOS.</th></tr></thead>
                            <tbody>
                                ${renderTableRows(data.subcontractorLabor, (row, i) => `<td style="width:10%">${i + 1}</td><td class="text-left" style="width:60%">${row.name || ''}</td><td style="width:30%">${row.count || ''}</td>`)}
                                <tr class="total-row"><td colspan="2" class="text-left">TOTAL SUBCON LABOR</td><td>${sumCount(data.subcontractorLabor) || '0'}</td></tr>
                            </tbody>
                        </table>
                    </div>` : ''}

                    ${!data.hiddenSections?.includes('nightShift') ? `
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;"><tr><th class="blue-hdr" colspan="3">NIGHT SHIFT</th></tr><tr><th>S.NO</th><th>Trade</th><th>NOS.</th></tr></thead>
                            <tbody>
                                ${renderTableRows(data.nightShift, (row, i) => `<td style="width:15%">${i + 1}</td><td class="text-left">${row.trade || ''}</td><td style="width:25%">${row.count || ''}</td>`)}
                                <tr class="total-row"><td colspan="2" class="text-left">TOTAL NIGHT SHIFT</td><td>${sumCount(data.nightShift) || '0'}</td></tr>
                            </tbody>
                        </table>
                    </div>` : ''}
                    `}

                    ${!data.hiddenSections?.includes('activities') ? `
                    ${sectionHeader('activities')}
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;">
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
                    ${sectionHeader('concerns')}
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;">
                                <tr><th style="width:5%">S.No</th><th class="text-left" style="width:25%">Location / Building No</th><th class="text-left" style="width:40%">Description of Concern</th><th class="text-left" style="width:30%">Corrective Action Required</th></tr>
                            </thead>
                            <tbody>
                                ${renderTableRows(data.areasOfConcern, (row, i) => `<td>${i + 1}</td><td class="text-left" style="white-space: pre-wrap;">${row.location || ''}</td><td class="text-left" style="color:red; white-space: pre-wrap;">${row.concern || ''}</td><td class="text-left" style="color:blue; white-space: pre-wrap;">${row.action || ''}</td>`)}
                            </tbody>
                        </table>
                    </div>` : ''}

                    ${!data.hiddenSections?.includes('delays') && data.delays?.length ? `
                    ${sectionHeader('delays')}
                    <div class="section-container">
                        <table>
                            <thead style="display: table-header-group;">
                                <tr><th style="width:5%">S.No</th><th style="width:10%">Start</th><th style="width:10%">End</th><th style="width:10%">Duration</th><th class="text-left" style="width:20%">Cause</th><th class="text-left" style="width:30%">Description</th><th class="text-left" style="width:15%">Affected Activity</th></tr>
                            </thead>
                            <tbody>
                                ${renderTableRows(data.delays, (row, i) => `<td>${i + 1}</td><td>${row.startTime || ''}</td><td>${row.endTime || ''}</td><td>${formatDuration(delayMinutes(row.startTime, row.endTime) || 0)}</td><td class="text-left">${row.cause || ''}</td><td class="text-left" style="white-space: pre-wrap;">${row.description || ''}</td><td class="text-left">${row.affectedActivity || ''}</td>`)}
                            </tbody>
                        </table>
                        <div style="text-align: right; font-weight: bold; margin-top: 8px; margin-right: 12px; font-size: 14px;">
                            Total delay time today: ${formatDuration(totalDelayMinutes(data.delays))}
                        </div>
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
