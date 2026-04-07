"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { PROMPTS, buildSubjectIdentityMetadata } from '../../../lib/prompts';
import type { CaptionModel, GenerationModel, ImageSource, PinterestImage, SavedGeneratedImage } from '../types';
import { orderImagesByPriority } from '../utils';

const MAX_INSPO = 5;

type DescriptionSourceBadge = 'db' | 'ai' | 'manual';

type DescriptionHistoryOption = {
  id: string;
  description: string;
  sourceType: 'ai' | 'manual';
  isActive: boolean;
  createdAt: string;
};

export function useGlowupStudio() {
  const MIN_WEBCAM_ZOOM = 1;
  const MAX_WEBCAM_ZOOM = 2.5;
  const WEBCAM_ZOOM_STEP = 0.25;

  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamZoom, setWebcamZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [imageSource, setImageSource] = useState<ImageSource>('pexels');
  const [searchQuery, setSearchQuery] = useState('');
  const [unsplashImages, setUnsplashImages] = useState<PinterestImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState('');
  const [imagesErrorDetail, setImagesErrorDetail] = useState('');
  const [imagesCount, setImagesCount] = useState(10);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [userImage, setUserImage] = useState('');
  const [userFile, setUserFile] = useState<File | null>(null);
  const [userImageDescription, setUserImageDescription] = useState('');
  const [isGeneratingUserImageDescription, setIsGeneratingUserImageDescription] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [savedGeneratedImages, setSavedGeneratedImages] = useState<SavedGeneratedImage[]>([]);
  const [error, setError] = useState('');
  const [descriptionsError, setDescriptionsError] = useState('');
  const [unifiedPromptError, setUnifiedPromptError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false);
  const [isGeneratingUnifiedPrompt, setIsGeneratingUnifiedPrompt] = useState(false);
  const [usedPrompt, setUsedPrompt] = useState('');
  const [inspoDescriptions, setInspoDescriptions] = useState<Record<number, string>>({});
  const [popupImg, setPopupImg] = useState<string | null>(null);
  const [openDescriptions, setOpenDescriptions] = useState<Record<number, boolean>>({});
  const [loadingDescIds, setLoadingDescIds] = useState<number[]>([]);
  const [captionModel, setCaptionModel] = useState<CaptionModel>('llava13b');
  const [generationModel, setGenerationModel] = useState<GenerationModel>('replicate-qwen');
  const [unifiedDescription, setUnifiedDescription] = useState('');
  const [isUnifiedDescriptionEditing, setIsUnifiedDescriptionEditing] = useState(false);
  const [autoCaptioning, setAutoCaptioning] = useState(false);
  const [autoUnifiedPrompt, setAutoUnifiedPrompt] = useState(false);
  const [inspoDirtyById, setInspoDirtyById] = useState<Record<number, boolean>>({});
  const [descriptionHistoryById, setDescriptionHistoryById] = useState<Record<number, DescriptionHistoryOption[]>>({});
  const [selectedDescriptionVersionById, setSelectedDescriptionVersionById] = useState<Record<number, string>>({});
  const [descriptionSourceById, setDescriptionSourceById] = useState<Record<number, DescriptionSourceBadge>>({});

  const shouldRefreshUnifiedPromptRef = useRef(false);
  const suppressUnifiedPromptRefreshRef = useRef(false);
  const unifiedPromptAbortControllerRef = useRef<AbortController | null>(null);
  const unifiedPromptRequestIdRef = useRef(0);
  const autoCaptioningRunRef = useRef(false);
  const skipAutoCaptioningForIdsRef = useRef<Set<number>>(new Set());

  const startDescriptionLoading = (id: number) => {
    setLoadingDescIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const stopDescriptionLoading = (id: number) => {
    setLoadingDescIds((prev) => prev.filter((item) => item !== id));
  };

  const selectedImages = useMemo(
    () => selectedIds
      .map((id) => unsplashImages.find((item) => item.id === id))
      .filter((item): item is PinterestImage => Boolean(item)),
    [selectedIds, unsplashImages]
  );

  const canGenerate = selectedIds.length >= 1 && Boolean(userImage) && !isGenerating;
  const canGenerateUnifiedPrompt = selectedImages.some((image) => Boolean(inspoDescriptions[image.id]?.trim()));
  const isCurrentImageSaved = generatedImage
    ? savedGeneratedImages.some((item) => item.src === generatedImage)
    : false;

  const getPriorityById = (id: number) => {
    const index = selectedIds.indexOf(id);
    return index >= 0 ? index + 1 : null;
  };

  useEffect(() => {
    return () => {
      unifiedPromptAbortControllerRef.current?.abort();
      webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!showWebcam || !videoRef.current || !webcamStreamRef.current) {
      return;
    }

    videoRef.current.srcObject = webcamStreamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [showWebcam]);

  useEffect(() => {
    if (!shouldRefreshUnifiedPromptRef.current) {
      return;
    }
    if (suppressUnifiedPromptRefreshRef.current) {
      return;
    }
    if (!autoUnifiedPrompt) {
      return;
    }
    shouldRefreshUnifiedPromptRef.current = false;
    const descriptions = selectedImages.map((img) => inspoDescriptions[img.id]).filter(Boolean);
    void generateUnifiedDescriptionAI(descriptions);
  }, [selectedImages, inspoDescriptions, autoUnifiedPrompt]);

  useEffect(() => {
    if (!userImage) {
      setUserImageDescription('');
      setIsGeneratingUserImageDescription(false);
      return;
    }

    let cancelled = false;
    setIsGeneratingUserImageDescription(true);

    const run = async () => {
      try {
        const response = await fetch('/api/img2text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_data: userImage,
            model: 'blip2',
            force_ai: true,
            skip_cache_read: true,
            skip_persist: true,
          }),
        });

        const text = await response.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setUserImageDescription(data?.error || 'Impossibile descrivere l\'immagine utente.');
          return;
        }

        setUserImageDescription(data?.description || '');
      } catch {
        if (!cancelled) {
          setUserImageDescription('Errore di rete nel caption veloce dell\'immagine utente.');
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingUserImageDescription(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [userImage]);

  useEffect(() => {
    if (!autoCaptioning) {
      return;
    }

    if (autoCaptioningRunRef.current || isGeneratingDescriptions || loadingDescIds.length > 0) {
      return;
    }

    const missingImages = selectedImages.filter(
      (img) => !inspoDescriptions[img.id]?.trim() && !skipAutoCaptioningForIdsRef.current.has(img.id)
    );
    if (missingImages.length === 0) {
      return;
    }

    let cancelled = false;
    autoCaptioningRunRef.current = true;

    const run = async () => {
      try {
        if (!cancelled) {
          await generateInspoDescriptions(missingImages);
        }
      } finally {
        autoCaptioningRunRef.current = false;
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [autoCaptioning, selectedImages, inspoDescriptions, isGeneratingDescriptions, loadingDescIds, captionModel]);

  async function generateUnifiedDescriptionAI(descriptions: string[]) {
    unifiedPromptRequestIdRef.current += 1;
    const requestId = unifiedPromptRequestIdRef.current;
    unifiedPromptAbortControllerRef.current?.abort();

    if (descriptions.length === 0) {
      unifiedPromptAbortControllerRef.current = null;
      setIsGeneratingUnifiedPrompt(false);
      setUnifiedDescription('');
      setIsUnifiedDescriptionEditing(false);
      return;
    }

    if (descriptions.length === 1) {
      unifiedPromptAbortControllerRef.current = null;
      setIsGeneratingUnifiedPrompt(false);
      setUnifiedDescription(descriptions[0]?.trim() || '');
      setIsUnifiedDescriptionEditing(false);
      return;
    }

    const abortController = new AbortController();
    unifiedPromptAbortControllerRef.current = abortController;
    setIsGeneratingUnifiedPrompt(true);
    setUnifiedPromptError('');
    const subjectIdentityMetadata = buildSubjectIdentityMetadata(userImageDescription);

    try {
      const response = await fetch('/api/unify-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptions, subjectIdentityMetadata }),
        signal: abortController.signal,
      });

      if (requestId !== unifiedPromptRequestIdRef.current) {
        return;
      }

      const rawResponse = await response.text();
      let data: any = null;
      try {
        data = rawResponse ? JSON.parse(rawResponse) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const debugParts = [data?.error || 'Errore AI'];
        if (data?.status || response.status) {
          debugParts.push(`Status: ${data?.status || response.status}`);
        }
        if (data?.statusText) {
          debugParts.push(`Status text: ${data.statusText}`);
        }
        if (data?.detail) {
          debugParts.push(`Detail: ${typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail, null, 2)}`);
        } else if (rawResponse && !data) {
          debugParts.push(`Raw response: ${rawResponse}`);
        }
        setUnifiedPromptError(debugParts.join('\n'));
        setUnifiedDescription('');
        setIsUnifiedDescriptionEditing(false);
      } else {
        setUnifiedDescription(data?.prompt || '');
        setIsUnifiedDescriptionEditing(false);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return;
      }
      if (requestId !== unifiedPromptRequestIdRef.current) {
        return;
      }
      setUnifiedPromptError('Errore di rete nella fusione AI.');
      setUnifiedDescription('');
      setIsUnifiedDescriptionEditing(false);
    } finally {
      if (requestId === unifiedPromptRequestIdRef.current) {
        unifiedPromptAbortControllerRef.current = null;
        setIsGeneratingUnifiedPrompt(false);
      }
    }
  }

  const stopWebcamStream = () => {
    webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    webcamStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeWebcam = () => {
    setShowWebcam(false);
    setWebcamZoom(MIN_WEBCAM_ZOOM);
    stopWebcamStream();
  };

  const startWebcam = async () => {
    setUploadError('');
    try {
      stopWebcamStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setUploadError('La webcam non e supportata da questo browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      setWebcamZoom(MIN_WEBCAM_ZOOM);
      setShowWebcam(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }
    } catch (e: any) {
      setShowWebcam(false);
      stopWebcamStream();
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setUploadError('Permesso webcam negato dal browser.');
        return;
      }
      if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
        setUploadError('Nessuna webcam disponibile rilevata.');
        return;
      }
      if (e?.name === 'NotReadableError' || e?.name === 'TrackStartError') {
        setUploadError('La webcam e occupata da un altra applicazione.');
        return;
      }
      setUploadError('Impossibile aprire la webcam.');
    }
  };

  const captureWebcam = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const sourceWidth = video.videoWidth / webcamZoom;
        const sourceHeight = video.videoHeight / webcamZoom;
        const sourceX = (video.videoWidth - sourceWidth) / 2;
        const sourceY = (video.videoHeight - sourceHeight) / 2;

        ctx.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
        const dataUrl = canvas.toDataURL('image/png');
        setUserImage(dataUrl);
        setUserFile(null);
        setUploadError('');
        setShowWebcam(false);
        setWebcamZoom(MIN_WEBCAM_ZOOM);
        stopWebcamStream();
      }
    }
  };

  const zoomInWebcam = () => {
    setWebcamZoom((current) => Math.min(MAX_WEBCAM_ZOOM, Number((current + WEBCAM_ZOOM_STEP).toFixed(2))));
  };

  const zoomOutWebcam = () => {
    setWebcamZoom((current) => Math.max(MIN_WEBCAM_ZOOM, Number((current - WEBCAM_ZOOM_STEP).toFixed(2))));
  };

  const fetchUnsplashImages = async () => {
    setIsLoadingImages(true);
    setImagesError('');
    setImagesErrorDetail('');
    try {
      const response = await fetch('/api/unsplash-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, count: imagesCount, source: imageSource }),
      });
      const data = await response.json();
      if (!response.ok) {
        setImagesError(data.error || 'Errore nella ricerca immagini.');
        setImagesErrorDetail(data.detail || '');
        setUnsplashImages([]);
      } else {
        setUnsplashImages((prev) => {
          const selectedImagesInOrder = prev
            .filter((img) => selectedIds.includes(img.id))
            .sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));
          const newImages = (data.images || []).filter((img: PinterestImage) => !selectedIds.includes(img.id));
          return [...selectedImagesInOrder, ...newImages];
        });
      }
    } catch (e: any) {
      setImagesError('Errore di rete nella ricerca immagini.');
      setImagesErrorDetail(e?.message || '');
      setUnsplashImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleRemoveUnselected = () => {
    setUnsplashImages(unsplashImages.filter((img) => selectedIds.includes(img.id)));
  };

  const handleImageToggle = (id: number) => {
    setError('');
    setGeneratedImage('');
    let newSelected: number[];
    if (selectedIds.includes(id)) {
      shouldRefreshUnifiedPromptRef.current = true;
      newSelected = selectedIds.filter((selectedId) => selectedId !== id);
    } else {
      if (selectedIds.length >= MAX_INSPO) {
        return;
      }
      if (inspoDescriptions[id]?.trim()) {
        shouldRefreshUnifiedPromptRef.current = true;
      }
      newSelected = [...selectedIds, id];
    }
    setSelectedIds(newSelected);
    setUnsplashImages((prev) => orderImagesByPriority(prev, newSelected));
  };

  const removeSelectedInspiration = (id: number) => {
    if (!selectedIds.includes(id)) {
      return;
    }

    setError('');
    setGeneratedImage('');
    shouldRefreshUnifiedPromptRef.current = true;

    const newSelected = selectedIds.filter((selectedId) => selectedId !== id);
    setSelectedIds(newSelected);
    setUnsplashImages((prev) => orderImagesByPriority(prev, newSelected));
    setOpenDescriptions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDescriptionHistoryById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedDescriptionVersionById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDescriptionSourceById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setInspoDirtyById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const moveSelectedPriority = (id: number, direction: 'up' | 'down') => {
    setError('');
    setGeneratedImage('');
    shouldRefreshUnifiedPromptRef.current = true;
    setSelectedIds((prev) => {
      const currentIndex = prev.indexOf(id);
      if (currentIndex === -1) {
        return prev;
      }
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      setUnsplashImages((currentImages) => orderImagesByPriority(currentImages, next));
      return next;
    });
  };

  const handleFileUpload = (file?: File) => {
    setUploadError('');
    if (!file) {
      return;
    }
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setUploadError('Solo JPG e PNG sono supportati.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUserImage(reader.result as string);
      setUserFile(file);
      setGeneratedImage('');
      setUploadError('');
    };
    reader.onerror = () => {
      setUploadError('Impossibile leggere il file selezionato.');
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlUpload = (url: string) => {
    const trimmedUrl = url.trim();
    setUploadError('');

    if (!trimmedUrl) {
      setUploadError('Inserisci un URL immagine.');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setUploadError('URL non valido.');
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      setUploadError('Sono supportati solo URL http(s).');
      return;
    }

    setUserImage(parsedUrl.toString());
    setUserFile(null);
    setGeneratedImage('');
  };

  const resetUserImage = () => {
    setUserImage('');
    setUserFile(null);
    setUserImageDescription('');
    setIsGeneratingUserImageDescription(false);
    setUploadError('');
  };

  const handleInspoChange = (id: number, value: string) => {
    skipAutoCaptioningForIdsRef.current.delete(id);
    setInspoDescriptions((prev) => ({ ...prev, [id]: value }));
    setDescriptionSourceById((prev) => ({ ...prev, [id]: 'manual' }));
    setInspoDirtyById((prev) => ({ ...prev, [id]: true }));
  };

  const toggleDescription = (id: number) => {
    setOpenDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const saveManualInspoDescription = async (id: number, description: string) => {
    const image = unsplashImages.find((img) => img.id === id);
    if (!image) {
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      return;
    }

    try {
      const response = await fetch('/api/img2text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: image.src,
          model: captionModel,
          manual_description: trimmedDescription,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
        setDescriptionsError(data?.error || 'Salvataggio descrizione manuale fallito.');
      } else {
        const text = await response.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        if (Array.isArray(data?.history)) {
          setDescriptionHistoryById((prev) => ({ ...prev, [id]: data.history }));
        }
        if (data?.selectedDescriptionId) {
          setSelectedDescriptionVersionById((prev) => ({ ...prev, [id]: data.selectedDescriptionId }));
        }
        setDescriptionSourceById((prev) => ({ ...prev, [id]: 'manual' }));
      }
    } catch {
      setDescriptionsError('Errore di rete nel salvataggio descrizione manuale.');
    }
  };

  const selectDescriptionVersion = (id: number, versionId: string) => {
    skipAutoCaptioningForIdsRef.current.delete(id);
    const options = descriptionHistoryById[id] || [];
    const selected = options.find((item) => item.id === versionId);
    if (!selected) {
      return;
    }

    setSelectedDescriptionVersionById((prev) => ({ ...prev, [id]: versionId }));
    setInspoDescriptions((prev) => ({ ...prev, [id]: selected.description }));
    setDescriptionSourceById((prev) => ({ ...prev, [id]: selected.sourceType === 'manual' ? 'manual' : 'db' }));

    if (autoUnifiedPrompt) {
      const descriptions = selectedImages.map((img) => (img.id === id ? selected.description : inspoDescriptions[img.id])).filter(Boolean);
      void generateUnifiedDescriptionAI(descriptions);
    }
  };

  const deleteDescriptionVersion = async (id: number, versionId?: string) => {
    const image = unsplashImages.find((img) => img.id === id);
    if (!image) {
      return;
    }

    const targetVersionId = versionId || selectedDescriptionVersionById[id];
    if (!targetVersionId) {
      return;
    }

    setDescriptionsError('');
    startDescriptionLoading(id);
    try {
      const response = await fetch('/api/img2text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: image.src,
          model: captionModel,
          delete_description_id: targetVersionId,
        }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        setDescriptionsError(data?.error || 'Eliminazione descrizione fallita.');
        return;
      }

      const history = Array.isArray(data?.history) ? data.history : [];
      setDescriptionHistoryById((prev) => ({ ...prev, [id]: history }));

      const nextSelectedId = data?.selectedDescriptionId || history[0]?.id || '';
      if (nextSelectedId) {
        setSelectedDescriptionVersionById((prev) => ({ ...prev, [id]: nextSelectedId }));
      } else {
        setSelectedDescriptionVersionById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }

      const nextDescription = data?.description || '';
      if (!nextDescription) {
        skipAutoCaptioningForIdsRef.current.add(id);
      } else {
        skipAutoCaptioningForIdsRef.current.delete(id);
      }
      setInspoDescriptions((prev) => ({ ...prev, [id]: nextDescription }));
      setInspoDirtyById((prev) => ({ ...prev, [id]: false }));

      if (!nextDescription) {
        setDescriptionSourceById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else if (data?.source === 'cache_manual') {
        setDescriptionSourceById((prev) => ({ ...prev, [id]: 'manual' }));
      } else {
        setDescriptionSourceById((prev) => ({ ...prev, [id]: 'db' }));
      }

      if (autoUnifiedPrompt) {
        const descriptions = selectedImages.map((img) => (img.id === id ? nextDescription : inspoDescriptions[img.id])).filter(Boolean);
        void generateUnifiedDescriptionAI(descriptions);
      }
    } catch {
      setDescriptionsError('Errore di rete nell\'eliminazione descrizione.');
    } finally {
      stopDescriptionLoading(id);
    }
  };

  const handleInspoBlur = (id: number) => {
    setOpenDescriptions((prev) => ({ ...prev, [id]: false }));
    shouldRefreshUnifiedPromptRef.current = true;
    if (inspoDirtyById[id]) {
      const value = (inspoDescriptions[id] || '').trim();
      if (!value) {
        void deleteDescriptionVersion(id);
      } else {
        void saveManualInspoDescription(id, value);
      }
      setInspoDirtyById((prev) => ({ ...prev, [id]: false }));
    }
    if (autoUnifiedPrompt) {
      const descriptions = selectedImages.map((img) => inspoDescriptions[img.id]).filter(Boolean);
      void generateUnifiedDescriptionAI(descriptions);
    }
  };

  const handleUnifiedDescriptionBlur = () => {
    setIsUnifiedDescriptionEditing(false);
  };

  const startUnifiedDescriptionEditing = () => {
    setIsUnifiedDescriptionEditing(true);
  };

  const regenerateUnifiedDescription = () => {
    const descriptions = selectedImages.map((img) => inspoDescriptions[img.id]).filter(Boolean);
    if (descriptions.length <= 1) {
      setUnifiedDescription(descriptions[0]?.trim() || '');
      setIsUnifiedDescriptionEditing(false);
      return;
    }
    void generateUnifiedDescriptionAI(descriptions);
  };

  const generateSingleInspoDescription = async (
    id: number,
    src: string,
    options?: { triggerUnifiedPrompt?: boolean; forceAI?: boolean; checkCacheOnly?: boolean }
  ) => {
    const triggerUnifiedPrompt = options?.triggerUnifiedPrompt ?? true;
    const forceAI = options?.forceAI ?? false;
    const checkCacheOnly = options?.checkCacheOnly ?? false;
    skipAutoCaptioningForIdsRef.current.delete(id);
    setDescriptionsError('');
    startDescriptionLoading(id);
    try {
      const response = await fetch('/api/img2text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: src, model: captionModel, force_ai: forceAI, check_only_cache: checkCacheOnly }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setDescriptionsError('Risposta non valida dal backend img2text.');
        stopDescriptionLoading(id);
        return;
      }
      if (data?.cacheMiss) {
        return null;
      }
      if (data.description) {
        setInspoDescriptions((prev) => ({ ...prev, [id]: data.description }));
        setInspoDirtyById((prev) => ({ ...prev, [id]: false }));
        if (Array.isArray(data.history)) {
          setDescriptionHistoryById((prev) => ({ ...prev, [id]: data.history }));
        }
        if (data.selectedDescriptionId) {
          setSelectedDescriptionVersionById((prev) => ({ ...prev, [id]: data.selectedDescriptionId }));
        }
        if (data.source === 'cache_ai' || data.source === 'cache_manual') {
          setDescriptionSourceById((prev) => ({ ...prev, [id]: data.source === 'cache_manual' ? 'manual' : 'db' }));
        } else if (data.source === 'manual_saved') {
          setDescriptionSourceById((prev) => ({ ...prev, [id]: 'manual' }));
        } else {
          setDescriptionSourceById((prev) => ({ ...prev, [id]: 'ai' }));
        }
        if (triggerUnifiedPrompt && !suppressUnifiedPromptRefreshRef.current) {
          shouldRefreshUnifiedPromptRef.current = true;
        }
        return data.description as string;
      }
      if (data.error) {
        setDescriptionsError(`Errore img2text: ${data.error}`);
      }
    } catch {
      setDescriptionsError('Errore di rete img2text.');
    } finally {
      stopDescriptionLoading(id);
    }
    return null;
  };

  const generateInspoDescriptions = async (imagesToProcess?: PinterestImage[] | Event) => {
    const targetImages = Array.isArray(imagesToProcess) ? imagesToProcess : selectedImages;
    if (targetImages.length === 0) {
      return;
    }
    setDescriptionsError('');
    setIsGeneratingDescriptions(true);
    suppressUnifiedPromptRefreshRef.current = true;
    const nextDescriptions = { ...inspoDescriptions };
    try {
      const cacheChecks = await Promise.all(
        targetImages.map(async (img) => {
          const cachedDescription = await generateSingleInspoDescription(img.id, img.src, {
            triggerUnifiedPrompt: false,
            checkCacheOnly: true,
          });
          return { img, cachedDescription };
        })
      );

      const misses = cacheChecks
        .filter((item) => !item.cachedDescription)
        .map((item) => item.img);

      for (const item of cacheChecks) {
        if (item.cachedDescription) {
          nextDescriptions[item.img.id] = item.cachedDescription;
        }
      }

      const aiResults = await Promise.all(
        misses.map(async (img) => {
          const generatedDescription = await generateSingleInspoDescription(img.id, img.src, {
            triggerUnifiedPrompt: false,
            forceAI: true,
          });
          return { id: img.id, generatedDescription };
        })
      );

      for (const result of aiResults) {
        if (result.generatedDescription) {
          nextDescriptions[result.id] = result.generatedDescription;
        }
      }
    } finally {
      suppressUnifiedPromptRefreshRef.current = false;
      setIsGeneratingDescriptions(false);
    }
    const descriptions = selectedImages.map((img) => nextDescriptions[img.id]).filter(Boolean);
    if (autoUnifiedPrompt) {
      await generateUnifiedDescriptionAI(descriptions);
    }
  };

  const generateAspirational = async () => {
    setError('');
    setGeneratedImage('');
    if (!userImage) {
      setError('Devi caricare una foto prima.');
      return;
    }
    if (selectedIds.length < 1) {
      setError('Devi selezionare almeno 1 immagine dalla moodboard.');
      return;
    }
    const identityPreservationInstruction = PROMPTS.generateImage.identityPreservationInstruction;
    const glowupInstruction = PROMPTS.generateImage.glowupInstruction;
    const fullPrompt = `${unifiedDescription?.trim() || ''}\n${identityPreservationInstruction}\n${glowupInstruction}`;
    setUsedPrompt(fullPrompt);
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: userImage, prompt: unifiedDescription, model: generationModel }),
      });
      const data = await response.json();
      if (!response.ok) {
        let debugMessage = data.error || 'Errore nella generazione dell’immagine.';
        if (data.provider) {
          debugMessage += `\nProvider: ${data.provider}`;
        }
        if (data.replicate_status || data.replicate_detail) {
          debugMessage += '\nStatus: ' + (data.replicate_status || '');
          debugMessage += '\nDetail: ' + JSON.stringify(data.replicate_detail, null, 2);
        }
        setError(debugMessage);
      } else {
        setGeneratedImage(data.generatedImage);
      }
    } catch {
      setError('Si è verificato un errore di rete. Riprova.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveCurrentGeneratedImage = () => {
    if (!generatedImage || isCurrentImageSaved) {
      return;
    }
    setSavedGeneratedImages((prev) => [
      {
        id: `${Date.now()}-${prev.length}`,
        src: generatedImage,
        prompt: usedPrompt,
      },
      ...prev,
    ]);
  };

  const removeSavedGeneratedImage = (id: string) => {
    setSavedGeneratedImages((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    videoRef,
    canvasRef,
    showWebcam,
    webcamZoom,
    imageSource,
    searchQuery,
    unsplashImages,
    isLoadingImages,
    imagesError,
    imagesErrorDetail,
    imagesCount,
    selectedIds,
    userImage,
    userFile,
    userImageDescription,
    isGeneratingUserImageDescription,
    uploadError,
    generatedImage,
    savedGeneratedImages,
    error,
    descriptionsError,
    unifiedPromptError,
    isGenerating,
    isGeneratingDescriptions,
    isGeneratingUnifiedPrompt,
    usedPrompt,
    inspoDescriptions,
    popupImg,
    openDescriptions,
    loadingDescIds,
    captionModel,
    generationModel,
    unifiedDescription,
    isUnifiedDescriptionEditing,
    autoCaptioning,
    autoUnifiedPrompt,
    descriptionHistoryById,
    selectedDescriptionVersionById,
    descriptionSourceById,
    selectedImages,
    canGenerate,
    canGenerateUnifiedPrompt,
    isCurrentImageSaved,
    canZoomInWebcam: webcamZoom < MAX_WEBCAM_ZOOM,
    canZoomOutWebcam: webcamZoom > MIN_WEBCAM_ZOOM,
    setImageSource,
    setSearchQuery,
    setImagesCount,
    setPopupImg,
    setCaptionModel,
    setGenerationModel,
    setUnifiedDescription,
    setAutoCaptioning,
    setAutoUnifiedPrompt,
    getPriorityById,
    closeWebcam,
    startWebcam,
    captureWebcam,
    zoomInWebcam,
    zoomOutWebcam,
    fetchUnsplashImages,
    handleRemoveUnselected,
    handleImageToggle,
    removeSelectedInspiration,
    moveSelectedPriority,
    handleFileUpload,
    handleImageUrlUpload,
    resetUserImage,
    handleInspoChange,
    toggleDescription,
    handleInspoBlur,
    deleteDescriptionVersion,
    selectDescriptionVersion,
    handleUnifiedDescriptionBlur,
    startUnifiedDescriptionEditing,
    regenerateUnifiedDescription,
    generateSingleInspoDescription,
    generateInspoDescriptions,
    generateAspirational,
    downloadImage,
    saveCurrentGeneratedImage,
    removeSavedGeneratedImage,
  };
}