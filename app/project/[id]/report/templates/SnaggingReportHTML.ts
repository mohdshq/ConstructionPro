import { Report, Project } from '../../../../../store/projectsStore';

/**
 * Generates the Snagging / Property Condition Audit HTML report.
 * Extracted from the monolithic [reportId].tsx for maintainability.
 */
export function generateSnaggingHTML(
    data: any,
    report: Report,
    project: Project,
    options?: { hideMeta?: boolean },
): string {
    const snags = data.snags || [];

    // Group snags by location for the summary tables
    const snagsByLocation = snags.reduce((acc: any, snag: any) => {
        const loc = snag.location || 'Unspecified';
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push(snag);
        return acc;
    }, {});

    const renderCoverPage = () => `
        <div class="page cover-page" style="display: flex; flex-direction: column; justify-content: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #E0F2FE 0%, #FFFFFF 50%, #bae6fd 100%); z-index: -1;"></div>
            <div style="position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: rgba(14, 165, 233, 0.1); border-radius: 50%; z-index: -1;"></div>
            <div style="position: absolute; bottom: -50px; left: -50px; width: 300px; height: 300px; background: rgba(132, 204, 22, 0.1); border-radius: 50%; z-index: -1;"></div>
            
            <div style="margin-top: 50px;">
                <h1 style="font-size: 32px; font-weight: 900; color: #0F172A; text-transform: uppercase;">${data.propertyName || 'Property Name'}</h1>
                <h2 style="font-size: 24px; font-weight: 400; color: #475569; margin-bottom: 60px;">${data.propertyAddress || ''}<br/>${data.city || ''}</h2>
                
                <h1 style="font-size: 36px; font-weight: 900; color: #0F172A; margin-top: 100px;">PROPERTY CONDITION AUDIT (PCA)<br/>REPORT</h1>
            </div>
            
            <div style="position: absolute; bottom: 40px; left: 40px;">
                <div style="font-size: 16px; color: #475569; border-left: 2px solid #0EA5E9; padding-left: 10px;">
                    ${data.email || 'info@starinspect.com'}<br/>
                    ${data.inspectionCompany || 'Star Property Inspection'}
                </div>
            </div>
        </div>
    `;

    const renderPropertySummary = () => `
        <div class="page">
            <div class="section-banner">
                <div class="banner-text">1.0 PROPERTY SUMMARY</div>
                <div class="banner-accent"></div>
            </div>

            <div class="summary-section">
                <div class="summary-title" style="color: #0EA5E9;">1.1 INSPECTION DETAILS</div>
                <table class="no-border-table">
                    <tr><td style="width: 30%;">Inspection Date :</td><td>${data.inspectionDate || ''}</td></tr>
                    <tr><td>Inspection Company :</td><td>${data.inspectionCompany || ''}</td></tr>
                    <tr><td>Inspector :</td><td>${data.inspectorName || ''}</td></tr>
                    <tr><td>Office Details :</td><td>${data.officeDetails || ''}</td></tr>
                    <tr><td>Contact Details :</td><td>${data.contactDetails || ''}</td></tr>
                    <tr><td>Email :</td><td>${data.email || ''}</td></tr>
                </table>
            </div>

            <div class="summary-section">
                <div class="summary-title" style="color: #0EA5E9;">1.2 PROPERTY DETAILS</div>
                <table class="no-border-table">
                    <tr><td style="width: 30%;">Property Type :</td><td>${data.propertyType || 'Apartment'}</td></tr>
                    <tr><td>Property Name :</td><td>${data.propertyName || ''}</td></tr>
                    <tr><td>Property Address :</td><td>${data.propertyAddress || ''}</td></tr>
                    <tr><td>City :</td><td>${data.city || ''}</td></tr>
                    ${data.buildingName ? `<tr><td>Building Name :</td><td>${data.buildingName}</td></tr>` : ''}
                    ${data.floorLevel ? `<tr><td>Floor Level :</td><td>${data.floorLevel}</td></tr>` : ''}
                    ${data.apartmentNumber ? `<tr><td>Apartment / Unit :</td><td>${data.apartmentNumber}</td></tr>` : ''}
                    <tr><td>Zoning/Land Use :</td><td>${data.zoning || ''}</td></tr>
                    <tr><td>Types Of Construction :</td><td>${data.constructionType || ''}</td></tr>
                </table>
            </div>

            <div class="summary-section">
                <div class="summary-title" style="color: #0EA5E9;">1.3 EXISTING UTILITIES</div>
                <table class="no-border-table">
                    <tr><td style="width: 30%;">Water Service Provider :</td><td>${data.waterProvider || ''}</td></tr>
                    <tr><td>Sanitary / Sewer Service Provider :</td><td>${data.sanitaryProvider || ''}</td></tr>
                    <tr><td>Electricity Service Provider :</td><td>${data.electricityProvider || ''}</td></tr>
                </table>
            </div>
        </div>
    `;

    const renderPropertyPhoto = () => `
        <div class="page text-center">
            <div class="section-banner">
                <div class="banner-text">PROPERTY CONDITION AUDIT</div>
                <div class="banner-accent"></div>
            </div>
            
            <h3 style="margin-top: 40px; font-size: 16px;">${data.propertyName || ''}<br/>${data.city || ''}</h3>
            
            ${data.pcaMainPhotoUri 
                ? `<div style="margin: 40px auto; width: 80%; aspect-ratio: 4/3; background-image: url('${data.pcaMainPhotoUri}'); background-size: cover; background-position: center; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>` 
                : `<div style="margin: 40px auto; width: 80%; height: 400px; background: #E2E8F0; display: flex; align-items: center; justify-content: center; border-radius: 8px;">No Property Photo Provided</div>`
            }
            
            <div style="margin-top: 40px; text-align: center; font-size: 14px; font-weight: bold;">
                <div>Date of Inspection: ${data.inspectionDate || ''}</div>
                <div style="margin-top: 15px;">Size of the Property: ${data.propertySize || ''}</div>
                <div style="margin-top: 15px;">Inspection Company: ${data.inspectionCompany || ''}</div>
            </div>
        </div>
    `;

    const renderIssueSummaryTables = () => {
        let html = `
            <div class="page">
                <div class="section-banner">
                    <div class="banner-text">4.0 SUMMARY OF ISSUES AND RECOMMENDATIONS</div>
                    <div class="banner-accent"></div>
                </div>
        `;

        let globalIndex = 1;
        for (const [location, locationSnags] of Object.entries(snagsByLocation)) {
            html += `
                <div class="grouped-table-container">
                    <div class="grouped-table-header">${location}</div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 5%">SN</th>
                                <th style="width: 15%">Asset</th>
                                <th style="width: 15%">Room</th>
                                <th style="width: 25%">Issue & Recommendation</th>
                                <th style="width: 15%">Contractor</th>
                                <th style="width: 15%">Deadline</th>
                                <th style="width: 10%">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            (locationSnags as any[]).forEach((snag: any) => {
                let statusColor = '#000';
                if (snag.status === 'Completed') statusColor = '#16A34A';
                else if (snag.status === 'In Progress') statusColor = '#0284C7';
                else if (snag.status === 'Defect Remains') statusColor = '#DC2626';

                let severityColor = snag.severity === 'High' ? '#DC2626' : (snag.severity === 'Low' ? '#16A34A' : '#EA580C');

                html += `
                    <tr>
                        <td class="text-center font-bold">${globalIndex++}</td>
                        <td class="font-bold">
                            ${snag.assetName || ''}<br/>
                            <span style="font-size: 10px; color: ${severityColor};">${snag.severity || ''}</span>
                        </td>
                        <td>${snag.room || ''}</td>
                        <td>
                            <strong>Issue:</strong> ${snag.issue || ''}<br/>
                            <strong>Rec:</strong> ${snag.recommendation || ''}
                        </td>
                        <td>${snag.contractor || ''}</td>
                        <td>${snag.targetDate || ''}</td>
                        <td class="text-center font-bold" style="color: ${statusColor};">${snag.status || 'Pending'}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    };

    const renderIssueDetails = () => {
        let html = `
            <div class="page">
                <div class="section-banner">
                    <div class="banner-text">5.0 OBSERVED ISSUES AND RECOMMENDATIONS</div>
                    <div class="banner-accent"></div>
                </div>
        `;

        snags.forEach((snag: any, index: number) => {
            let statusColor = '#000';
            if (snag.status === 'Completed') statusColor = '#16A34A';
            else if (snag.status === 'In Progress') statusColor = '#0284C7';
            else if (snag.status === 'Defect Remains') statusColor = '#DC2626';

            let severityColor = snag.severity === 'High' ? '#DC2626' : (snag.severity === 'Low' ? '#16A34A' : '#EA580C');

            html += `
                <div class="detail-row" style="${index > 0 && index % 3 === 0 ? 'page-break-before: always;' : ''}">
                    <div class="detail-photo">
                        ${snag.photoUri 
                            ? `<div style="width: 100%; height: 100%; background-image: url('${snag.photoUri}'); background-size: cover; background-position: center; border: 1px solid #CBD5E1;"></div>`
                            : `<div style="width: 100%; height: 100%; background: #F1F5F9; border: 1px solid #CBD5E1; display:flex; align-items:center; justify-content:center; color:#94A3B8;">No Photo</div>`
                        }
                    </div>
                    <div class="detail-info">
                        <table class="detail-table">
                            <tr><th colspan="2" class="detail-header">Photo ${index + 1} - ${snag.system || 'SYSTEM'}</th></tr>
                            <tr><td class="detail-label" style="width: 30%">Asset Name:</td><td>${snag.assetName || ''}</td></tr>
                            <tr><td class="detail-label">Location / Room:</td><td>${snag.location || ''} ${snag.level ? `(Lvl: ${snag.level})` : ''} ${snag.room ? `[Room: ${snag.room}]` : ''}</td></tr>
                            <tr><td class="detail-label">Issue:</td><td>${snag.issue || ''}</td></tr>
                            <tr><td class="detail-label">Recommendation:</td><td>${snag.recommendation || ''}</td></tr>
                            <tr><td class="detail-label">Contractor:</td><td>${snag.contractor || ''}</td></tr>
                            <tr><td class="detail-label">Severity:</td><td style="color: ${severityColor}; font-weight: bold;">${snag.severity || ''}</td></tr>
                            <tr><td class="detail-label">Target Date:</td><td>${snag.targetDate || ''}</td></tr>
                            <tr><td class="detail-label">Status:</td><td style="color: ${statusColor}; font-weight: bold;">${snag.status || 'Pending'}</td></tr>
                            ${snag.reinspectionNotes ? `<tr><td class="detail-label">ReInspection Notes:</td><td>${snag.reinspectionNotes || ''}</td></tr>` : ''}
                        </table>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    };

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=yes" />
                <style>
                    html, body { margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                    body { background: #FFFFFF; font-size: 12px; color: #0F172A; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                    
                    .page { padding: 40px; box-sizing: border-box; width: 100%; position: relative; page-break-after: always; min-height: 100vh; }
                    .text-center { text-align: center; }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    
                    .section-banner { display: flex; height: 30px; margin-bottom: 30px; }
                    .banner-text { background-color: #A3E635; color: #FFFFFF; font-weight: bold; font-size: 14px; padding: 0 20px; display: flex; align-items: center; letter-spacing: 0.5px; }
                    .banner-accent { background-color: #0EA5E9; flex: 1; height: 100%; }
                    
                    .summary-section { margin-bottom: 40px; font-size: 13px; font-weight: bold; }
                    .summary-title { font-size: 14px; font-weight: bold; margin-bottom: 15px; }
                    .no-border-table { width: 100%; border-collapse: collapse; }
                    .no-border-table td { padding: 8px 0; border: none; vertical-align: top; }
                    
                    .grouped-table-container { margin-bottom: 30px; border: 1px solid #000; }
                    .grouped-table-header { background-color: #0EA5E9; color: #FFFFFF; font-weight: bold; padding: 6px; text-align: center; border-bottom: 1px solid #000; }
                    .data-table { width: 100%; border-collapse: collapse; }
                    .data-table th { background-color: #000; color: #FFFFFF; font-weight: bold; padding: 6px; border: 1px solid #000; font-size: 11px; }
                    .data-table td { padding: 6px; border: 1px solid #000; font-size: 11px; vertical-align: top; }
                    
                    .detail-row { display: flex; width: 100%; margin-bottom: 30px; gap: 10px; page-break-inside: avoid; }
                    .detail-photo { width: 200px; height: 150px; flex-shrink: 0; }
                    .detail-info { flex: 1; }
                    .detail-table { width: 100%; border-collapse: collapse; border: 1px solid #CBD5E1; }
                    .detail-table th, .detail-table td { border: 1px solid #CBD5E1; padding: 6px; font-size: 11px; vertical-align: top; }
                    .detail-header { background-color: #94A3B8; color: #000; text-align: left; font-weight: bold; }
                    .detail-label { background-color: #F1F5F9; font-weight: bold; }
                    
                    @media print {
                        @page { size: auto; margin: 0; }
                        html, body { padding: 0; margin: 0; }
                        .page { page-break-after: always; padding: 15mm; }
                    }
                </style>
            </head>
            <body>
                ${(options && options.hideMeta === true) ? '' : renderCoverPage()}
                ${(options && options.hideMeta === true) ? '' : renderPropertySummary()}
                ${(options && options.hideMeta === true) ? '' : renderPropertyPhoto()}
                ${snags.length > 0 ? renderIssueSummaryTables() : ''}
                ${snags.length > 0 ? renderIssueDetails() : ''}
            </body>
        </html>
    `;
}
