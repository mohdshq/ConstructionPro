import { Report, Project } from '../../../../../store/projectsStore';

/**
 * Generates the HSE (Health, Safety & Environment) HTML report.
 * Extracted from the monolithic [reportId].tsx for maintainability.
 */
export function generateHSEHTML(
    data: any,
    report: Report,
    project: Project,
): string {
    const renderChecklists = () => {
        if (!data.checklists || data.checklists.length === 0) return '';
        const categories = Array.from(new Set(data.checklists.map((c: any) => c.category)));
        let html = '';
        categories.forEach((cat: any) => {
            html += `
                <div class="section-container" style="margin-top: 20px; page-break-inside: avoid;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr><th colspan="3" style="background-color: #0EA5E9; color: white; padding: 8px; text-align: left; font-size: 12px;">${cat}</th></tr>
                            <tr>
                                <th style="width: 60%; background-color: #F1F5F9; padding: 6px; text-align: left; border: 1px solid #CBD5E1; font-size: 11px;">Checklist Item</th>
                                <th style="width: 15%; background-color: #F1F5F9; padding: 6px; border: 1px solid #CBD5E1; font-size: 11px;">Status</th>
                                <th style="width: 25%; background-color: #F1F5F9; padding: 6px; border: 1px solid #CBD5E1; font-size: 11px;">Notes / Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            data.checklists.filter((c: any) => c.category === cat).forEach((item: any) => {
                let statusColor = '#000';
                if (item.status === 'Pass') statusColor = '#16A34A';
                if (item.status === 'Fail') statusColor = '#DC2626';

                html += `
                    <tr>
                        <td style="padding: 6px; border: 1px solid #CBD5E1; text-align: left; font-size: 11px;">${item.item}</td>
                        <td style="padding: 6px; border: 1px solid #CBD5E1; color: ${statusColor}; font-weight: bold; text-align: center; font-size: 11px;">${item.status}</td>
                        <td style="padding: 6px; border: 1px solid #CBD5E1; text-align: left; font-size: 11px;">${item.notes || ''}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        });
        return html;
    };

    const renderIncidents = () => {
        if (!data.incidents || data.incidents.length === 0) return '';
        let html = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 25px; page-break-inside: avoid;">
                <thead>
                    <tr><th colspan="4" style="background-color: #EF4444; color: white; padding: 8px; text-align: left; font-size: 12px;">Reported Incidents & Near Misses</th></tr>
                    <tr>
                        <th style="background-color: #FEE2E2; padding: 6px; border: 1px solid #FCA5A5; width: 5%; font-size: 11px; color: #991B1B;">#</th>
                        <th style="background-color: #FEE2E2; padding: 6px; border: 1px solid #FCA5A5; width: 25%; font-size: 11px; color: #991B1B;">Type</th>
                        <th style="background-color: #FEE2E2; padding: 6px; border: 1px solid #FCA5A5; width: 35%; font-size: 11px; color: #991B1B;">Description</th>
                        <th style="background-color: #FEE2E2; padding: 6px; border: 1px solid #FCA5A5; width: 35%; font-size: 11px; color: #991B1B;">Immediate Action Taken</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.incidents.forEach((inc: any, index: number) => {
            html += `
                <tr>
                    <td style="padding: 6px; border: 1px solid #FCA5A5; text-align: center; font-size: 11px;">${index + 1}</td>
                    <td style="padding: 6px; border: 1px solid #FCA5A5; text-align: center; font-weight: bold; font-size: 11px;">${inc.type}</td>
                    <td style="padding: 6px; border: 1px solid #FCA5A5; text-align: left; font-size: 11px;">${inc.description || ''}</td>
                    <td style="padding: 6px; border: 1px solid #FCA5A5; text-align: left; font-size: 11px;">${inc.actionTaken || ''}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        return html;
    };

    const renderTrainings = () => {
        if (!data.trainings || data.trainings.length === 0) return '';
        let html = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 25px; page-break-inside: avoid;">
                <thead>
                    <tr><th colspan="4" style="background-color: #F59E0B; color: white; padding: 8px; text-align: left; font-size: 12px;">Toolbox Talks & Safety Training</th></tr>
                    <tr>
                        <th style="background-color: #FEF3C7; padding: 6px; border: 1px solid #FCD34D; width: 5%; font-size: 11px; color: #92400E;">#</th>
                        <th style="background-color: #FEF3C7; padding: 6px; border: 1px solid #FCD34D; width: 50%; text-align: left; font-size: 11px; color: #92400E;">Topic</th>
                        <th style="background-color: #FEF3C7; padding: 6px; border: 1px solid #FCD34D; width: 25%; text-align: left; font-size: 11px; color: #92400E;">Trainer</th>
                        <th style="background-color: #FEF3C7; padding: 6px; border: 1px solid #FCD34D; width: 20%; font-size: 11px; color: #92400E;">No. Attendees</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.trainings.forEach((tr: any, index: number) => {
            html += `
                <tr>
                    <td style="padding: 6px; border: 1px solid #FCD34D; text-align: center; font-size: 11px;">${index + 1}</td>
                    <td style="padding: 6px; border: 1px solid #FCD34D; text-align: left; font-size: 11px; font-weight: bold;">${tr.topic || ''}</td>
                    <td style="padding: 6px; border: 1px solid #FCD34D; text-align: left; font-size: 11px;">${tr.trainer || ''}</td>
                    <td style="padding: 6px; border: 1px solid #FCD34D; text-align: center; font-size: 11px;">${tr.numberOfParticipants || ''}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        return html;
    };

    const renderPhotos = () => {
        if (!data.photos || data.photos.length === 0) return '';
        return `
            <div style="page-break-before: always; margin-top: 20px;">
                <h2 style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-top:0;">Photographic Evidence</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                    ${data.photos.filter((p: any) => { const u = typeof p === 'string' ? p : p.uri; return u && typeof u === 'string' && u.length > 100; }).map((photo: any) => {
                        const uri = typeof photo === 'string' ? photo : photo.uri;
                        const caption = typeof photo === 'string' ? '' : (photo.caption || '');
                        return `
                            <div style="width: calc(33.333% - 10px); display: flex; flex-direction: column; page-break-inside: avoid; margin-bottom: 15px;">
                                <div style="width: 100%; aspect-ratio: 4/3; border: 1px solid #ccc; background-image: url('${uri}'); background-size: contain; background-repeat: no-repeat; background-position: center; background-color: #f8fafc; border-radius: 4px;"></div>
                                ${caption ? `<div style="font-size: 11px; text-align: center; margin-top: 6px; font-weight: 500;">${caption}</div>` : ''}
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
                    html, body { margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                    body { background: #FFFFFF; font-size: 12px; color: #0F172A; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                    .page { padding: 40px; box-sizing: border-box; width: 100%; position: relative; min-height: 100vh; }
                    .header-banner { background-color: #16A34A; color: white; padding: 25px 15px; text-align: center; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    .header-banner h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
                    .header-banner h2 { margin: 8px 0 0 0; font-size: 16px; font-weight: normal; opacity: 0.9; }
                    
                    .summary-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px; }
                    .summary-box { flex: 1; min-width: 200px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 16px; background: #F8FAFC; page-break-inside: avoid; border-left: 4px solid #16A34A; }
                    .summary-label { font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: bold; margin-bottom: 6px; }
                    .summary-value { font-size: 16px; color: #0F172A; font-weight: bold; }
                    
                    .obs-section { margin-top: 25px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 15px; background: #F8FAFC; page-break-inside: avoid; }
                    .obs-section h3 { margin-top: 0; color: #0EA5E9; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #CBD5E1; padding-bottom: 8px; margin-bottom: 12px; }
                    
                    @media print {
                        @page { size: auto; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header-banner">
                        <h1>HEALTH, SAFETY & ENVIRONMENT REPORT</h1>
                        <h2>${project.name} - ${project.location || ''}</h2>
                    </div>
                    
                    <div class="summary-grid">
                        <div class="summary-box">
                            <div class="summary-label">Inspection Date</div>
                            <div class="summary-value">${data.inspectionDate || 'N/A'}</div>
                        </div>
                        <div class="summary-box">
                            <div class="summary-label">Site Inspector</div>
                            <div class="summary-value">${data.inspectorName || 'N/A'}</div>
                        </div>
                        <div class="summary-box">
                            <div class="summary-label">Weather Conditions</div>
                            <div class="summary-value">${data.weatherConditions || 'N/A'}</div>
                        </div>
                        <div class="summary-box">
                            <div class="summary-label">Total Man-Hours</div>
                            <div class="summary-value">${data.totalManHours || 'N/A'}</div>
                        </div>
                    </div>

                    ${renderChecklists()}
                    ${renderIncidents()}
                    ${renderTrainings()}
                    
                    <div style="page-break-inside: avoid;">
                        <div class="obs-section">
                            <h3>General Safety Observations & Positive Findings</h3>
                            <p style="white-space: pre-wrap; font-size: 12px; margin: 0;">${data.generalObservations || 'None noted.'}</p>
                        </div>
                        <div class="obs-section" style="margin-top: 15px;">
                            <h3>General Corrective Actions & Recommendations</h3>
                            <p style="white-space: pre-wrap; font-size: 12px; margin: 0;">${data.correctiveActions || 'None noted.'}</p>
                        </div>
                    </div>

                    <div style="margin-top: 60px; text-align: right; margin-right: 20px; page-break-inside: avoid;">
                        <strong>Safety Audit Prepared By:</strong><br/>
                        <div style="font-size: 18px; font-style: italic; margin-top: 10px; color: #16A34A; display: inline-block; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; min-width: 150px;">${report.author}</div>
                    </div>

                    ${renderPhotos()}
                </div>
            </body>
        </html>
    `;
}
