import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Slider,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Download as DownloadIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeOffIcon
} from '@mui/icons-material';
import { logger } from '../../utils/logger';

interface AudioPlayerProps {
  open: boolean;
  onClose: () => void;
  url: string;
  fileName: string;
  fileType: 'mp3' | 'mp4';
  onDownload?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  open,
  onClose,
  url,
  fileName,
  fileType,
  onDownload
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Auto-play quand le dialog s'ouvre
  useEffect(() => {
    if (open && audioRef.current && url) {
      // Petit délai pour s'assurer que l'audio est chargé
      const timer = setTimeout(() => {
        audioRef.current?.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            logger.error('Erreur lors de la lecture automatique:', error);
            // Si l'auto-play échoue (politique du navigateur), on ne fait rien
            // L'utilisateur devra cliquer sur le bouton play
          });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open, url]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (_event: Event, value: number | number[]) => {
    const time = value as number;
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (_event: Event, value: number | number[]) => {
    const vol = value as number;
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
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
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 3 }}>
          {/* Audio element */}
          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Waveform placeholder / Album art */}
          <Box
            sx={{
              width: '100%',
              height: 200,
              backgroundColor: 'action.hover',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3
            }}
          >
            <Typography variant="h1" color="text.secondary">
              🎵
            </Typography>
          </Box>

          {/* Progress bar */}
          <Box sx={{ mb: 2 }}>
            <Slider
              value={currentTime}
              max={duration || 100}
              onChange={handleSeek}
              aria-label="Time"
              sx={{ color: 'primary.main' }}
            />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(duration)}
              </Typography>
            </Box>
          </Box>

          {/* Controls */}
          <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
            {/* Play/Pause button */}
            <IconButton
              onClick={togglePlay}
              color="primary"
              sx={{
                width: 64,
                height: 64,
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark'
                }
              }}
            >
              {isPlaying ? <PauseIcon sx={{ fontSize: 32 }} /> : <PlayIcon sx={{ fontSize: 32 }} />}
            </IconButton>
          </Box>

          {/* Volume control */}
          <Box display="flex" alignItems="center" gap={2} mt={3}>
            <IconButton onClick={toggleMute} size="small">
              {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeIcon />}
            </IconButton>
            <Slider
              value={isMuted ? 0 : volume}
              max={1}
              step={0.01}
              onChange={handleVolumeChange}
              aria-label="Volume"
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
