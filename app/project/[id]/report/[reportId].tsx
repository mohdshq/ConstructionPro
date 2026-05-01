import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, CheckCircle, Share2 } from "lucide-react-native";
import BackButton from "../../../../components/BackButton";
import { useMemo, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as XLSX from 'xlsx';
import { useProjectsStore } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';

export default function ReportViewerScreen() {
    const { colors } = useThemeColors();
    const { reportId } = useLocalSearchParams<{ reportId: string }>();
    const router = useRouter();
    const { getReport, getProject, updateReport } = useProjectsStore();

    const [isGenerating, setIsGenerating] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    const report = useMemo(() => reportId ? getReport(reportId) : null, [reportId, getReport]);
    const project = useMemo(() => report ? getProject(report.projectId) : null, [report, getProject]);
    const data = useMemo(() => report ? JSON.parse(report.templateData) : null, [report]);

    if (!report || !project || !data) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Report Not Found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const generateSnaggingHTML = (options?: { hideMeta?: boolean }) => {
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
                                <tr>
                                    <th colspan="2" class="detail-header">Photo ${index + 1} - ${snag.system || 'SYSTEM'}</th>
                                </tr>
                                <tr>
                                    <td class="detail-label" style="width: 30%">Asset Name:</td>
                                    <td>${snag.assetName || ''}</td>
                                </tr>
                                <tr>
                                    <td class="detail-label">Location / Room:</td>
                                    <td>${snag.location || ''} ${snag.level ? `(Lvl: ${snag.level})` : ''} ${snag.room ? `[Room: ${snag.room}]` : ''}</td>
                                </tr>
                                <tr>
                                    <td class="detail-label">Issue:</td>
                                    <td>${snag.issue || ''}</td>
                                </tr>
                                <tr>
                                    <td class="detail-label">Recommendation:</td>
                                    <td>${snag.recommendation || ''}</td>
                                </tr>
                                <tr>
                                    <td class="detail-label">Contractor:</td>
                                    <td>${snag.contractor || ''}</td>
                                </tr>
                                <tr>
                                    <td class="detail-label">Severity:</td>
                                    <td style="color: ${severityColor}; font-weight: bold;">${snag.severity || ''}</td>
                                </tr>
                                <tr>
                                    <td class="detail-label">Target Date:</td>
                                    <td>${snag.targetDate || ''}</td>
                                </tr>
                                <tr>
                                    <td class="detail-label">Status:</td>
                                    <td style="color: ${statusColor}; font-weight: bold;">${snag.status || 'Pending'}</td>
                                </tr>
                                ${snag.reinspectionNotes ? `
                                <tr>
                                    <td class="detail-label">ReInspection Notes:</td>
                                    <td>${snag.reinspectionNotes || ''}</td>
                                </tr>
                                ` : ''}
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
                        
                        /* Banners */
                        .section-banner { display: flex; height: 30px; margin-bottom: 30px; }
                        .banner-text { background-color: #A3E635; color: #FFFFFF; font-weight: bold; font-size: 14px; padding: 0 20px; display: flex; align-items: center; letter-spacing: 0.5px; }
                        .banner-accent { background-color: #0EA5E9; flex: 1; height: 100%; }
                        
                        /* Summary List */
                        .summary-section { margin-bottom: 40px; font-size: 13px; font-weight: bold; }
                        .summary-title { font-size: 14px; font-weight: bold; margin-bottom: 15px; }
                        .no-border-table { width: 100%; border-collapse: collapse; }
                        .no-border-table td { padding: 8px 0; border: none; vertical-align: top; }
                        
                        /* Data Tables */
                        .grouped-table-container { margin-bottom: 30px; border: 1px solid #000; }
                        .grouped-table-header { background-color: #0EA5E9; color: #FFFFFF; font-weight: bold; padding: 6px; text-align: center; border-bottom: 1px solid #000; }
                        .data-table { width: 100%; border-collapse: collapse; }
                        .data-table th { background-color: #000; color: #FFFFFF; font-weight: bold; padding: 6px; border: 1px solid #000; font-size: 11px; }
                        .data-table td { padding: 6px; border: 1px solid #000; font-size: 11px; vertical-align: top; }
                        
                        /* Detail Rows */
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
    };

    const generateHSEHTML = () => {
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
    };

    const generateQuickLogHTML = () => {
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
                        ${(data.audioUris || (data.audioUri ? [data.audioUri] : [])).map((uri: string) => `
                            <audio controls src="${uri}" style="width: 100%; margin-top: 15px;"></audio>
                        `).join('')}
                        ` : ''}

                        ${renderPhotos()}
                    </div>
                </body>
            </html>
        `;
    };

    const generateHTML = (options?: { hideMeta?: boolean }) => {
        if (report.type === 'snagging') {
            return generateSnaggingHTML(options);
        }

        if (report.type === 'hse') {
            return generateHSEHTML();
        }

        if (report.type === 'quick-log') {
            return generateQuickLogHTML();
        }

        if (report.type !== 'daily') {
            return `<html><body style="font-family: sans-serif; padding: 40px;"><h2>Standard Report</h2><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
        }

        const dateStr = new Date(report.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        const rawLogos = data.logos || [];
        // Stricter check for base64 validity. Sometimes image picker passes a short string or undefined.
        const logos = rawLogos.filter((l: string) => l && typeof l === 'string' && l.length > 100 && l.startsWith('data:image') && !l.includes('undefined') && !l.includes('null'));
        const leftLogos = logos.length <= 2 ? logos.slice(0, 1) : logos.slice(0, 2);
        const rightLogos = logos.length === 2 ? logos.slice(1, 2) : (logos.length === 3 ? logos.slice(2, 3) : logos.slice(2, 4));

        const sumCount = (arr: any[]) => (arr || []).reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
        const sumTotal = (arr: any[]) => (arr || []).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

        const renderTableRows = (arr: any[], columns: (row: any, i: number) => string, minRows: number = 2) => {
            const dataToRender = arr && arr.length > 0 ? arr : [];
            if (dataToRender.length === 0) {
                return `<tr><td colspan="10" class="text-center" style="padding: 10px;">No entries</td></tr>`;
            }
            return dataToRender.map((row, i) => `<tr>${columns(row, i)}</tr>`).join('');
        };

        const renderPhotos = () => {
            if (!data.photos || data.photos.length === 0) return '';

            return `
                <div style="page-break-before: always; margin-top: 20px;">
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

                        .photo-grid { display: flex; flex-wrap: wrap; gap: 15px; }
                        .photo-wrapper { width: calc(33.333% - 10px); display: flex; flex-direction: column; page-break-inside: avoid; margin-bottom: 15px; }
                        .photo-item { width: 100%; aspect-ratio: 4/3; border: 1px solid #ccc; background-color: #f8fafc; display: block; }
                        .photo-caption { font-size: 11px; text-align: center; margin-top: 6px; font-weight: 500; color: #334155; word-wrap: break-word; }

                    @media print {
                    @page { size: auto; margin: 10mm; }
                    html, body { 
                        padding: 0; 
                        margin: 0; 
                        overflow: visible !important; 
                    }
                    .layout { 
                        width: 100%; 
                        max-width: 100%; 
                        margin: 0; 
                        overflow: visible !important; 
                        page-break-after: auto; 
                    }
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
                                    <thead>
                                        <tr><th class="blue-hdr" colspan="3">1. MAIN CONTRACTOR STAFF</th></tr>
                                        <tr><th>Sr.No.</th><th>Role / Description</th><th>Nos.</th></tr>
                                    </thead>
                                    <tbody>
                                        ${renderTableRows(data.mainContractorStaff, (row, i) => `
                                            <td style="width:10%">${i + 1}</td>
                                            <td class="text-left">${row.description || ''}</td>
                                            <td style="width:20%">${row.count || ''}</td>
                                        `)}
                                        <tr>
                                            <th colspan="2" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL</th>
                                            <th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.mainContractorStaff) || '0'}</th>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </td>
                        ` : ''}

                        ${!data.hiddenSections?.includes('subconStaff') ? `
                        <td style="width: 33.33%; padding: 0 5px; border: none;">
                            <div class="section-container" style="margin-bottom: 0;">
                                <table style="margin-bottom: 0;">
                                    <thead>
                                        <tr><th class="blue-hdr" colspan="2">2. SUBCONTRACTOR'S STAFF</th></tr>
                                        <tr><th>Company / Name</th><th>Nos</th></tr>
                                    </thead>
                                    <tbody>
                                        ${renderTableRows(data.subcontractorStaff, (row, i) => `
                                            <td class="text-left">${row.name || ''}</td>
                                            <td style="width:25%">${row.count || ''}</td>
                                        `)}
                                        <tr>
                                            <th class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL</th>
                                            <th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.subcontractorStaff) || '0'}</th>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </td>
                        ` : ''}

                        ${!data.hiddenSections?.includes('equip') ? `
                        <td style="width: 33.33%; padding: 0 0 0 5px; border: none;">
                            <div class="section-container" style="margin-bottom: 0;">
                                <table style="margin-bottom: 0;">
                                    <thead>
                                        <tr><th class="blue-hdr" colspan="2">3. EQUIPMENT & VEHICLES</th></tr>
                                        <tr><th>Description</th><th>Nos.</th></tr>
                                    </thead>
                                    <tbody>
                                        ${renderTableRows(data.equipment, (row, i) => `
                                            <td class="text-left">${row.description || ''}</td>
                                            <td style="width:25%">${row.count || ''}</td>
                                        `)}
                                        <tr>
                                            <th class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL</th>
                                            <th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.equipment) || '0'}</th>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </td>
                        ` : ''}
                    </tr>
                </table>
                ` : ''}

                    ${!data.hiddenSections?.includes('labor') ? `
                <div class="section-container">
                    <table>
                        <thead style="display: table-header-group;">
                            <tr><th class="blue-hdr" colspan="5">4. MAIN CONTRACTOR LABOR</th></tr>
                            <tr><th>S.NO</th><th>TRADES</th><th>IN HOUSE</th><th>SUPPLY</th><th>TOTAL</th></tr>
                        </thead>
                        <tbody>
                            ${renderTableRows(data.mainContractorLabor, (row, i) => `
                                    <td style="width:5%">${i + 1}</td>
                                    <td class="text-left" style="width:45%">${row.trade || ''}</td>
                                    <td style="width:15%">${row.inHouse || ''}</td>
                                    <td style="width:15%">${row.supply || ''}</td>
                                    <td class="font-bold" style="width:20%; background-color: #F8FAFC;">${row.total || ''}</td>
                                `)}
                            <tr>
                                <th colspan="4" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL MAIN CONTRACTOR LABOR</th>
                                <th class="font-bold" style="background-color: #F1F5F9;">${sumTotal(data.mainContractorLabor) || '0'}</th>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : ''}

                    ${!data.hiddenSections?.includes('subconLabor') ? `
                <div class="section-container">
                    <table>
                        <thead style="display: table-header-group;">
                            <tr><th class="blue-hdr" colspan="3">5. SUBCONTRACTOR LABOR</th></tr>
                            <tr><th>S.NO</th><th>SUBCON NAME</th><th>NOS.</th></tr>
                        </thead>
                        <tbody>
                            ${renderTableRows(data.subcontractorLabor, (row, i) => `
                                    <td style="width:10%">${i + 1}</td>
                                    <td class="text-left" style="width:60%">${row.name || ''}</td>
                                    <td style="width:30%">${row.count || ''}</td>
                                `)}
                            <tr>
                                <th colspan="2" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL SUBCON LABOR</th>
                                <th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.subcontractorLabor) || '0'}</th>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : ''}

                    ${!data.hiddenSections?.includes('nightShift') ? `
                <div class="section-container">
                    <table>
                        <thead style="display: table-header-group;">
                            <tr><th class="blue-hdr" colspan="3">6. NIGHT SHIFT</th></tr>
                            <tr><th>S.NO</th><th>Trade</th><th>NOS.</th></tr>
                        </thead>
                        <tbody>
                            ${renderTableRows(data.nightShift, (row, i) => `
                                <td style="width:15%">${i + 1}</td>
                                <td class="text-left">${row.trade || ''}</td>
                                <td style="width:25%">${row.count || ''}</td>
                            `)}
                            <tr>
                                <th colspan="2" class="text-left font-bold" style="background-color: #F1F5F9;">TOTAL NIGHT SHIFT</th>
                                <th class="font-bold" style="background-color: #F1F5F9;">${sumCount(data.nightShift) || '0'}</th>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : ''}

                    ${!data.hiddenSections?.includes('activities') ? `
                <div class="section-container">
                    <table>
                        <thead style="display: table-header-group;">
                            <tr><th class="blue-hdr" colspan="8">7. ON-GOING ACTIVITIES & PROGRESS</th></tr>
                            <tr>
                                <th style="width:5%">S.No</th>
                                <th class="text-left" style="width:35%">Activity Description</th>
                                <th style="width:8%">UOM</th>
                                <th style="width:10%">Total Qty</th>
                                <th style="width:10%">Prev Qty</th>
                                <th style="width:10%">Today Qty</th>
                                <th style="width:10%">Balance Qty</th>
                                <th style="width:12%">Progress indicator (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderTableRows(data.activitiesProgress, (row, i) => {
            const t = Number(row.totalQty) || 0;
            const p = Number(row.prevQty) || 0;
            const today = Number(row.todayQty) || 0;
            const cum = p + today;
            const bal = t > 0 ? Math.max(0, t - cum) : 0;
            const pct = t > 0 ? Math.min(100, Math.round((cum / t) * 100)) : 0;

            return `
                                    <td>${i + 1}</td>
                                    <td class="text-left">${row.activityName || ''}</td>
                                    <td>${row.uom || ''}</td>
                                    <td>${row.totalQty || ''}</td>
                                    <td>${row.prevQty || ''}</td>
                                    <td class="font-bold">${row.todayQty || ''}</td>
                                    <td>${row.totalQty ? bal : ''}</td>
                                    <td>
                                        ${row.totalQty ? `
                                        <div class="progress-bar-container">
                                            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                                            <div class="progress-text">${pct}%</div>
                                        </div>
                                        ` : ''}
                                    </td>
                                `;
        })}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                    ${!data.hiddenSections?.includes('concerns') ? `
                <div class="section-container">
                    <table>
                        <thead style="display: table-header-group;">
                            <tr><th class="blue-hdr" colspan="4">8. AREAS OF CONCERN / ISSUES</th></tr>
                            <tr>
                                <th style="width:5%">S.No</th>
                                <th class="text-left" style="width:25%">Location / Building No</th>
                                <th class="text-left" style="width:40%">Description of Concern</th>
                                <th class="text-left" style="width:30%">Corrective Action Required</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderTableRows(data.areasOfConcern, (row, i) => `
                                <td>${i + 1}</td>
                                <td class="text-left" style="white-space: pre-wrap;">${row.location || ''}</td>
                                <td class="text-left" style="color:red; white-space: pre-wrap;">${row.concern || ''}</td>
                                <td class="text-left" style="color:blue; white-space: pre-wrap;">${row.action || ''}</td>
                            `)}
                        </tbody>
                    </table>
                </div>
                ` : ''}

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
    };

    const handleSharePDF = async (hideMeta?: boolean) => {
        try {
            setIsGenerating(true);
            const html = generateHTML({ hideMeta });

            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                // Expo Print engine can aggressively truncate long pages if not height constrained correctly by standard A4 logic
                const { uri } = await Print.printToFileAsync({
                    html,
                    base64: false,
                    margins: { top: 30, right: 30, bottom: 30, left: 30 }
                });

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Daily Report PDF' });
                } else {
                    await Print.printAsync({ uri });
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate PDF document.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShareExcel = async () => {
        try {
            setIsGenerating(true);
            const dateStr = new Date(report.date).toLocaleDateString('en-GB');

            // 1. Prepare Workbook
            const wb = XLSX.utils.book_new();

            // 2. Sheet 1: General Info & Meta
            const wsGeneralData = [
                ['DAILY PROGRESS REPORT'],
                ['Project', project.name, 'Date', dateStr],
                ['Location', project.location],
                [],
                ['Dates & Weather'],
                ['Commencement Date', data.commencementDate || '-'],
                ['Completion Date', data.completionDate || '-'],
                ['Anticipated Completion', data.anticipatedCompletionDate || '-'],
                ['Humidity', data.climateHumidity || '-'],
                ['Temperature', data.climateTemp || '-'],
                ['Visibility', data.climateVisibility || '-'],
                ['Wind Speed', data.climateWindSpeed || '-'],
                [],
                ['Manpower Summary'],
                ['Main Contractor', data.manpowerMainContractor || '0'],
                ['Subcontractors', data.manpowerSubcontractors || '0'],
                ['Night Shift / Others', data.manpowerOthers || '0'],
                ['Total Manpower', data.manpowerTotal || '0'],
            ];
            const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
            XLSX.utils.book_append_sheet(wb, wsGeneral, "General Details");

            // 3. Sheet 2: Main Contractor Staff
            if (data.mainContractorStaff && data.mainContractorStaff.length > 0) {
                const wsMCStaff = XLSX.utils.json_to_sheet(data.mainContractorStaff.map((s: any) => ({
                    'Role / Description': s.description,
                    'Count': s.count
                })));
                XLSX.utils.book_append_sheet(wb, wsMCStaff, "Main Contractor Staff");
            }

            // 4. Sheet 3: Subcontractor Staff
            if (data.subcontractorStaff && data.subcontractorStaff.length > 0) {
                const wsSubStaff = XLSX.utils.json_to_sheet(data.subcontractorStaff.map((s: any) => ({
                    'Company / Name': s.name,
                    'Count': s.count
                })));
                XLSX.utils.book_append_sheet(wb, wsSubStaff, "Subcontractor Staff");
            }

            // 5. Sheet 4: Equipment
            if (data.equipment && data.equipment.length > 0) {
                const wsEquip = XLSX.utils.json_to_sheet(data.equipment.map((e: any) => ({
                    'Equipment Description': e.description,
                    'Count': e.count
                })));
                XLSX.utils.book_append_sheet(wb, wsEquip, "Equipment");
            }

            // 6. Sheet 5: Labor
            if (data.mainContractorLabor && data.mainContractorLabor.length > 0) {
                const wsLabor = XLSX.utils.json_to_sheet(data.mainContractorLabor.map((l: any) => ({
                    'Trade': l.trade,
                    'In House': l.inHouse,
                    'Supply': l.supply,
                    'Total': l.total
                })));
                XLSX.utils.book_append_sheet(wb, wsLabor, "MC Labor");
            }

            // 7. Sheet 6: Activities Progress
            if (data.activitiesProgress && data.activitiesProgress.length > 0) {
                const wsActivities = XLSX.utils.json_to_sheet(data.activitiesProgress.map((a: any) => ({
                    'Activity Name': a.activityName,
                    'UOM': a.uom,
                    'Total Qty': a.totalQty,
                    'Prev Qty': a.prevQty,
                    'Today Qty': a.todayQty,
                    'Balance Qty': a.balanceQty
                })));
                XLSX.utils.book_append_sheet(wb, wsActivities, "Progress Activities");
            }

            // 8. Sheet 7: Areas of Concern
            if (data.areasOfConcern && data.areasOfConcern.length > 0) {
                const wsConcerns = XLSX.utils.json_to_sheet(data.areasOfConcern.map((c: any) => ({
                    'Location': c.location,
                    'Issue / Concern': c.concern,
                    'Corrective Action': c.action
                })));
                XLSX.utils.book_append_sheet(wb, wsConcerns, "Areas of Concern");
            }

            // Write File
            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

            const safeName = project.name.split(' ').join('_');
            const safeDate = dateStr.split('/').join('-');
            const filename = `Daily_Report_${safeName}_${safeDate}.xlsx`;

            if (Platform.OS === 'web') {
                const byteCharacters = atob(wbout);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // @ts-ignore - Expo types occasionally mismatch locally
                const uri = FileSystem.cacheDirectory + filename;
                // @ts-ignore
                await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, { UTI: 'com.microsoft.excel.xls', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Share Excel Report' });
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate Excel document.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSharePress = () => {
        setShareModalVisible(true);
    };

    const runShareAction = (type: 'pdf' | 'excel' | 'pdf-nometa') => {
        setShareModalVisible(false);
        setTimeout(() => {
            if (type === 'pdf') handleSharePDF(false);
            else if (type === 'pdf-nometa') handleSharePDF(true);
            else handleShareExcel();
        }, 300);
    };

    const handleStatusUpdate = () => {
        if (!report) return;

        const nextStatus = report.status === 'draft' ? 'submitted' : report.status === 'submitted' ? 'approved' : 'draft';

        if (Platform.OS === 'web') {
            if (window.confirm(`Change report status to ${nextStatus.toUpperCase()}?`)) {
                updateReport(report.id, { status: nextStatus });
            }
        } else {
            Alert.alert(
                'Update Status',
                `Change report status to ${nextStatus.toUpperCase()}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Confirm', onPress: () => updateReport(report.id, { status: nextStatus }) }
                ]
            );
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <Text style={styles.headerTitle} numberOfLines={1}>{
                    report.type === 'daily' ? 'Daily Report Preview' : 'Document Viewer'
                }</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.actionIcon} onPress={handleStatusUpdate} disabled={isGenerating}>
                        <CheckCircle size={22} color={report.status === 'approved' ? '#22C55E' : report.status === 'submitted' ? '#F59E0B' : '#64748B'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIcon} onPress={handleSharePress} disabled={isGenerating}>
                        {isGenerating ? <ActivityIndicator size="small" color="#2563EB" /> : <Share2 size={22} color={colors.text} />}
                    </TouchableOpacity>
                </View>
            </View>

            <Modal visible={shareModalVisible} transparent={true} animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShareModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Share Report</Text>
                        <Text style={styles.modalSubtitle}>How would you like to share this daily report?</Text>
                        
                        <TouchableOpacity style={styles.modalOption} onPress={() => runShareAction('pdf')}>
                            <Text style={styles.modalOptionText}>View / Print PDF</Text>
                        </TouchableOpacity>
                        
                        {report.type === 'snagging' && (
                            <TouchableOpacity style={styles.modalOption} onPress={() => runShareAction('pdf-nometa')}>
                                <Text style={styles.modalOptionText}>Share PDF (Issues Only / No Meta)</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity style={[styles.modalOption, styles.modalOptionExcel]} onPress={() => runShareAction('excel')}>
                            <Text style={[styles.modalOptionText, styles.modalOptionExcelText]}>Download Excel (Data only)</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShareModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* We render exactly the same HTML engine output in the webview to prove it maps 1:1 on the device */}
                {Platform.OS === 'web' ? (
                    <iframe
                        srcDoc={generateHTML()}
                        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' }}
                        title="Report Preview"
                    />
                ) : (
                    <WebView
                        source={{ html: generateHTML() }}
                        style={styles.webview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        setBuiltInZoomControls={true}
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        originWhitelist={['*']}
                        allowFileAccess={true}
                        allowFileAccessFromFileURLs={true}
                        allowUniversalAccessFromFileURLs={true}
                        mediaPlaybackRequiresUserAction={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: "center",
        paddingHorizontal: 16, height: 60, backgroundColor: '#FFFFFF',
        borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10,
    },
    backButton: { padding: 8 },
    headerTitle: {  fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginHorizontal: 8 },
    headerActions: {
        position: "absolute",
        right: 20,
        bottom: 12,
        zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    actionIcon: { padding: 4 },
    webview: { flex: 1, backgroundColor: 'transparent' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 340, borderRadius: 16, padding: 24, alignItems: 'stretch' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
    modalOption: { backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
    modalOptionText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
    modalOptionExcel: { backgroundColor: '#ECFDF5' },
    modalOptionExcelText: { color: '#047857' },
    modalCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    modalCancelText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
});
