import React, { useEffect, useState } from 'react';
import { Image, ImageProps } from 'react-native';
import { getSignedUrl } from '../lib/supabaseSync';
import { useAuthStore } from '../store/useAuthStore';

interface ProjectImageProps extends Omit<ImageProps, 'source'> {
    photoUri?: string | null;
}

export default function ProjectImage({ photoUri, style, ...props }: ProjectImageProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchUrl() {
            if (!photoUri) {
                setSignedUrl(null);
                return;
            }

            if (photoUri.includes('://') || photoUri.startsWith('data:') || photoUri.startsWith('blob:')) {
                if (isMounted) setSignedUrl(photoUri);
                return;
            }

            // It's a Supabase storage path
            try {
                const url = await getSignedUrl('report-photos', photoUri);
                if (isMounted) setSignedUrl(url);
            } catch (error) {
                console.error('Failed to get signed URL for project photo:', error);
                if (isMounted) setSignedUrl(null);
            }
        }

        fetchUrl();

        return () => {
            isMounted = false;
        };
    }, [photoUri]);

    if (!signedUrl) return null;

    return <Image source={{ uri: signedUrl }} style={style} {...props} />;
}
