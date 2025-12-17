import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  CircularProgress,
  Typography,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { logger } from '../../utils/logger';

// Configuration du worker PDF.js - utilise le worker local
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

interface PDFViewerProps {
  open: boolean;
  onClose: () => void;
  url: string;
  fileName: string;
  onDownload?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  open,
  onClose,
  url,
  fileName,
  onDownload
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(false);
  };

  const onDocumentLoadError = (error: Error) => {
    logger.error('Erreur lors du chargement du PDF:', error);
    setLoading(false);
    setError(true);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div" noWrap sx={{ flex: 1, mr: 2 }}>
            {fileName}
          </Typography>
          <Box display="flex" gap={1}>
            {onDownload && (
              <IconButton onClick={onDownload} color="primary">
                <DownloadIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 2,
          overflow: 'auto'
        }}
      >
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
            <Typography color="error">
              Erreur lors du chargement du PDF
            </Typography>
          </Box>
        )}

        {!error && url && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<CircularProgress />}
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={Math.min(window.innerWidth * 0.8, 800)}
              />
            </Document>

            {numPages > 0 && (
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  position: 'sticky',
                  bottom: 0,
                  backgroundColor: 'background.paper',
                  p: 2,
                  borderRadius: 1,
                  boxShadow: 2
                }}
              >
                <Button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  startIcon={<PrevIcon />}
                  size="small"
                >
                  Précédent
                </Button>
                <Typography>
                  Page {pageNumber} sur {numPages}
                </Typography>
                <Button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  endIcon={<NextIcon />}
                  size="small"
                >
                  Suivant
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
