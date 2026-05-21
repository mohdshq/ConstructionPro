import { Report, Project } from '../../../../../store/projectsStore';

/**
 * Generates the Quick Log HTML report.
 * Extracted from the monolithic [reportId].tsx for maintainability.
 */
export function generateQuickLogHTML(
    data: any,
    report: Report,
    project: Project,
): string {
    const renderPhotos = () => {
        if (!data.photos || data.photos.length === 0) return '';
        return `
            <div style="margin-top: 30px;">
                <h3 style="color: #10B981; border-bottom: 1px solid #10B981; padding-bottom: 8px;">Attached Photos</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px;">
                    ${data.photos.map((photo: any) => {
                        const uri = typeof photo === 'string' ? photo : photo.uri;
                        return `<div style="width: calc(50% - 10px); aspect-ratio: 4/3; background-image: url('${uri}'); background-size: cover; background-position: center; border-radius: 8px; border: 1px solid #CBD5E1;"></div>`;
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
                    html, body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #FFFFFF; }
                    .page { padding: 40px; box-sizing: border-box; width: 100%; min-height: 100vh; color: #0F172A; }
                    .header { background: #10B981; color: #FFFFFF; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
                    .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                    .header h2 { margin: 5px 0 0 0; font-size: 16px; font-weight: 500; opacity: 0.9; }
                    .info-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px; }
                    .info-box { flex: 1; min-width: 200px; padding: 15px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; border-left: 4px solid #10B981; }
                    .info-label { font-size: 12px; color: #64748B; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                    .info-value { font-size: 16px; font-weight: bold; }
                    .notes-section { background: #F1F5F9; padding: 20px; border-radius: 8px; border: 1px solid #E2E8F0; }
                    .notes-section h3 { margin-top: 0; color: #10B981; font-size: 16px; }
                    .audio-badge { display: inline-block; padding: 8px 16px; background: #DBEAFE; color: #1D4ED8; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <h1>Quick Site Log</h1>
                        <h2>${project.name}</h2>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-box">
                            <div class="info-label">Date Logged</div>
                            <div class="info-value">${new Date(report.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Logged By</div>
                            <div class="info-value">${report.author}</div>
                        </div>
                        ${data.location ? `
                        <div class="info-box">
                            <div class="info-label">Location / Area</div>
                            <div class="info-value">${data.location}</div>
                        </div>
                        ` : ''}
                    </div>

                    ${data.notes ? `
                    <div class="notes-section">
                        <h3>Observations / Notes</h3>
                        <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; margin: 0;">${data.notes}</p>
                    </div>
                    ` : ''}

                    ${(data.audioUris && data.audioUris.length > 0) || data.audioUri ? `
                    <div class="audio-badge">
                        🎤 Voice Memos Attached
                    </div>
                    ${(data.audioUris || (data.audioUri ? [data.audioUri] : [])).map((uri: string) => {
                        return `<audio controls src="${uri}" style="width: 100%; margin-top: 15px;"></audio>`;
                    }).join('')}
                    ` : ''}

                    ${renderPhotos()}
                </div>
            </body>
        </html>
    `;
}
