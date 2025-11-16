import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuration du worker PDF.js - utilise le worker local
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

interface PDFThumbnailProps {
  url: string | Promise<string>;
  width?: number;
  height?: number;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({
  url,
  width = 150,
  height = 200
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  // Résoudre l'URL si c'est une Promise
  useEffect(() => {
    const resolveUrl = async () => {
      try {
        if (typeof url === 'string') {
          // Si l'URL est vide, on attend
          if (!url) {
            setLoading(true);
            return;
          }
          setResolvedUrl(url);
        } else {
          const resolved = await url;
          setResolvedUrl(resolved);
        }
      } catch (err) {
        console.error('Erreur lors de la résolution de l\'URL:', err);
        setError(true);
        setLoading(false);
      }
    };

    resolveUrl();
  }, [url]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('[PDFThumbnail] PDF chargé avec succès, nombre de pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('[PDFThumbnail] Erreur lors du chargement du PDF:', error);
    console.error('[PDFThumbnail] URL utilisée:', resolvedUrl);
    setLoading(false);
    setError(true);
  };

  return (
    <Box
      sx={{
        width: width,
        height: height,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.paper',
        position: 'relative'
      }}
    >
      {loading && (
        <CircularProgress size={24} />
      )}

      {error && (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="caption" color="error" display="block" gutterBottom>
            ⚠️ Erreur de chargement
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
            Vérifiez la console (F12)
          </Typography>
        </Box>
      )}

      {!error && resolvedUrl && (
        <Document
          file={resolvedUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
        >
          <Page
            pageNumber={1}
            width={width}
            height={height}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      )}
    </Box>
  );
};
