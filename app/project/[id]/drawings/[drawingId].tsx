import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { AlertCircle, Compass, Share2, UploadCloud } from "lucide-react-native";
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import BackButton from "../../../../components/BackButton";
import { resolveMediaUri } from '@/lib/attachments/resolveMediaUri';
import { usePowerSyncProject } from '@/lib/powersync/useProjects';
import { usePowerSyncDrawings } from '@/lib/powersync/useDrawings';
import { useProjectsStore } from '../../../../store/projectsStore';
import { useThemeColors } from '../../../../store/useThemeColors';

export default function DrawingViewerScreen() {
    const { id, drawingId } = useLocalSearchParams<{ id: string, drawingId: string }>();
    const router = useRouter();
    const { getProject, drawings } = useProjectsStore();
    const { colors } = useThemeColors();

    const { data: powerSyncProject } = usePowerSyncProject(id);
    const project = powerSyncProject || getProject(id);
    const powerSyncDrawings = usePowerSyncDrawings(id);
    const allDrawings = powerSyncDrawings.length > 0 ? powerSyncDrawings : drawings;
    const drawing = useMemo(() => allDrawings.find(d => d.id === drawingId && d.projectId === id), [drawingId, id, allDrawings]);

    const [isLoading, setIsLoading] = useState(true);
    const [base64Data, setBase64Data] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [localFileUri, setLocalFileUri] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [convertedUrl, setConvertedUrl] = useState<string | null>(null);

    const [cloudViewerUrl, setCloudViewerUrl] = useState<string | null>(null);
    const [isUploadingCloud, setIsUploadingCloud] = useState(false);

    const isCad = drawing?.type === 'cad' || drawing?.name?.toLowerCase().match(/\.(dwg|dxf)$/);
    const isOffice = drawing?.type === 'word' || drawing?.type === 'excel' || drawing?.name?.toLowerCase().match(/\.(doc|docx|xls|xlsx)$/);

    const handleLoadCloud = async (viewerType: 'cad' | 'office') => {
        if (!drawing) return;
        setIsUploadingCloud(true);
        setErrorMsg(null);
        try {
            let resultJson;

            if (Platform.OS === 'web') {
                if (!signedUrl) throw new Error("URL not resolved");
                const response = await fetch(signedUrl);
                const blob = await response.blob();
                const formData = new FormData();
                formData.append('file', blob, drawing.name);

                const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
                    method: 'POST',
                    body: formData as any,
                });
                resultJson = await uploadRes.json();
            } else {
                if (!localFileUri) throw new Error("Local file not downloaded yet");
                const uploadRes = await FileSystem.uploadAsync('https://tmpfiles.org/api/v1/upload', localFileUri, {
                    fieldName: 'file',
                    httpMethod: 'POST',
                    uploadType: 1 as any, // FileSystemUploadType.MULTIPART
                });
                resultJson = JSON.parse(uploadRes.body);
            }

            if (resultJson?.data?.url) {
                const directUrl = resultJson.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                if (viewerType === 'cad') {
                    setCloudViewerUrl(`https://sharecad.org/cadframe/load?url=${encodeURIComponent(directUrl)}`);
                } else if (viewerType === 'office') {
                    setCloudViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`);
                }
            } else {
                throw new Error("Failed to upload file to rendering server.");
            }
        } catch (e: any) {
            console.error("Cloud Upload Error:", e);
            setErrorMsg(e.message || "Failed to initiate cloud viewer.");
        } finally {
            setIsUploadingCloud(false);
        }
    };

    useEffect(() => {
        if (!drawing) return;

        const loadFile = async () => {
            setIsLoading(true);
            try {
                const resolved = await resolveMediaUri(drawing.uri, {
                    bucket: 'drawings',
                    projectId: project?.id,
                });

                if (!resolved) {
                    setErrorMsg('Could not load file from storage.');
                    setIsLoading(false);
                    return;
                }
                setSignedUrl(resolved);

                const needsLocal = Platform.OS !== 'web';
                if (needsLocal) {
                    if (resolved.startsWith('file:')) {
                        setLocalFileUri(resolved);
                        if (Platform.OS === 'android' && drawing.type === 'pdf') {
                            const b64 = await FileSystem.readAsStringAsync(resolved, { encoding: 'base64' });
                            setBase64Data(b64);
                        }
                    } else {
                        const target = FileSystem.cacheDirectory + (drawing.name || `dl_${drawing.id}`);
                        const dl = await FileSystem.downloadAsync(resolved, target);
                        setLocalFileUri(dl.uri);
                        if (Platform.OS === 'android' && drawing.type === 'pdf') {
                            const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: 'base64' });
                            setBase64Data(b64);
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading file:", error);
                setErrorMsg("Failed to load the document securely.");
            } finally {
                setIsLoading(false);
            }
        };

        loadFile();
    }, [drawing, project?.id]);

    if (!project || !drawing) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, justifyContent: 'center' }]}>
                    <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>File Not Found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const handleShare = async () => {
        try {
            if (Platform.OS === 'web') {
                if (navigator.share && signedUrl) {
                    await navigator.share({
                        title: drawing.name,
                        url: signedUrl
                    });
                } else {
                    alert("Sharing not supported on this browser.");
                }
            } else {
                const canShare = await Sharing.isAvailableAsync();
                const shareUri = localFileUri ?? signedUrl;
                if (canShare && shareUri) {
                    await Sharing.shareAsync(shareUri, { dialogTitle: 'Share Drawing' });
                } else {
                    Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
                }
            }
        } catch (error: any) {
            console.error(error.message);
        }
    };

    const renderViewer = () => {
        if (isLoading || (!signedUrl && !errorMsg)) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#0EA5E9" />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Document...</Text>
                </View>
            );
        }

        if (errorMsg) {
            return (
                <View style={styles.centerContainer}>
                    <AlertCircle size={48} color="#EF4444" />
                    <Text style={[styles.errorText, { color: colors.textMuted }]}>{errorMsg}</Text>
                </View>
            );
        }

        const needsCloudViewer = drawing.type === 'cad' || (['word', 'excel'].includes(drawing.type) && Platform.OS !== 'ios');

        if (needsCloudViewer) {
            if (cloudViewerUrl) {
                if (Platform.OS === 'web') {
                    return <iframe src={cloudViewerUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={drawing.name} />;
                }
                return <WebView source={{ uri: cloudViewerUrl }} style={styles.webview} originWhitelist={['*']} />;
            }

            const isOffice = ['word', 'excel'].includes(drawing.type);

            return (
                <View style={styles.centerContainer}>
                    {isOffice ? <UploadCloud size={64} color="#0EA5E9" style={{ marginBottom: 16 }} /> : <Compass size={64} color="#F59E0B" style={{ marginBottom: 16 }} />}
                    <Text style={[styles.cadTitle, { color: colors.text }]}>Cloud Document Viewer</Text>
                    <Text style={[styles.cadWarning, { color: colors.textMuted }]}>
                        To view this {isOffice ? 'document' : 'CAD file'} natively, it will be temporarily processed by a secure online cloud viewer.
                        Please note this involves uploading the file to a temporary public server for rendering.
                    </Text>

                    <TouchableOpacity
                        style={styles.uploadCadButton}
                        onPress={() => handleLoadCloud(isOffice ? 'office' : 'cad')}
                        disabled={isUploadingCloud}
                    >
                        {isUploadingCloud ? (
                            <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
                        ) : (
                            <UploadCloud size={20} color="white" style={{ marginRight: 8 }} />
                        )}
                        <Text style={styles.uploadCadButtonText}>
                            {isUploadingCloud ? "Preparing Cloud Viewer..." : "View Online"}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (Platform.OS === 'web') {
            if (drawing.type === 'pdf') {
                return (
                    <iframe
                        src={signedUrl!}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title={drawing.name}
                    />
                );
            } else if (drawing.type === 'image') {
                return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', backgroundColor: '#F1F5F9' }}>
                        <img
                            src={signedUrl!}
                            alt={drawing.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                    </div>
                );
            }
            return (
                <View style={styles.centerContainer}>
                    <Text style={{ color: colors.text }}>Preview not supported for this file type.</Text>
                </View>
            );
        }

        // --- Native (iOS/Android) Viewer ---

        let htmlSource = '';

        if (drawing.type === 'image') {
            // Using a full-screen HTML wrapper for mobile image ensures pinch-to-zoom works universally inside the WebView.
            htmlSource = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, user-scalable=yes" />
                        <style>
                            body { margin: 0; padding: 0; background: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; }
                            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                        </style>
                    </head>
                    <body>
                        <img src="${signedUrl}" />
                    </body>
                </html>
            `;
            return <WebView source={{ html: htmlSource }} style={styles.webview} originWhitelist={['*']} />;
        }

        if (['pdf', 'word', 'excel'].includes(drawing.type)) {
            if (Platform.OS === 'ios') {
                // iOS handles PDF and Office URIs beautifully out of the box with QuickLook built into WKWebView
                return <WebView source={{ uri: signedUrl! }} style={styles.webview} originWhitelist={['*']} />;
            } else if (Platform.OS === 'android' && drawing.type === 'pdf') {
                // Android requires PDF.js or base64 injection for local PDFs. We inject via base64 application/pdf.
                htmlSource = `
                    <html>
                        <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
                            <style>
                                body { margin: 0; padding: 0; background: #e2e8f0; height: 100vh; overflow: hidden; }
                                object { width: 100%; height: 100%; }
                            </style>
                        </head>
                        <body>
                            <object data="data:application/pdf;base64,${base64Data}" type="application/pdf">
                                <p>PDF cannot be displayed. Try sharing or exporting the file.</p>
                            </object>
                        </body>
                    </html>
                `;
                return <WebView source={{ html: htmlSource }} style={styles.webview} originWhitelist={['*']} allowFileAccess={true} allowUniversalAccessFromFileURLs={true} />;
            }
        }

        return (
            <View style={styles.centerContainer}>
                <Text style={[styles.errorText, { color: colors.textMuted }]}>Preview not supported natively. Please use the Share button to open the file externally.</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{drawing.name}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{(drawing.size / 1024 / 1024).toFixed(2)} MB</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                        <Share2 size={24} color="#0EA5E9" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Viewer Content */}
            <View style={[styles.content, { backgroundColor: colors.background }]}>
                {renderViewer()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 8,
    },
    headerTextContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: "center",
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748B',
    },
    headerActions: {
        position: "absolute",
        right: 20,
        bottom: 12,
        zIndex: 20,
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    content: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    errorText: {
        marginTop: 16,
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    cadTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    cadWarning: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    uploadCadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0EA5E9',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    uploadCadButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    }
});
