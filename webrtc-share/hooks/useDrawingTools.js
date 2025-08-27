import { useState, useRef, useCallback } from 'react';

const useDrawingTools = () => {
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Store canvas references and drawing data
  const canvasRefs = useRef({});
  const contextRefs = useRef({});
  const drawingData = useRef({});
  const startPoints = useRef({});
  const tempCanvas = useRef({});
  const initializedCanvases = useRef(new Set());
  const backgroundImages = useRef({});
  
  // Add preview layer for shapes
  const previewCanvases = useRef({});

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#000000', '#ffffff',
    '#ff8000', '#8000ff', '#008000', '#800000'
  ];

const tools = [
  { name: 'brush', icon: '🖌️', title: 'Brush - Free drawing' },
  { name: 'line', icon: '📏', title: 'Line - Draw straight lines between two points' },
  { name: 'rectangle', icon: '⬜', title: 'Rectangle - Draw rectangular shapes' },
  { name: 'circle', icon: '⭕', title: 'Circle - Draw circular shapes from center point' },
  { name: 'arrow', icon: '➡️', title: 'Arrow - Draw directional arrows' }
];

  const getDevicePixelRatio = () => {
    return window.devicePixelRatio || 1;
  };

  // Fixed coordinate calculation - more consistent
  const getMousePos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    
    // Use simple coordinate transformation without complex scaling
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Redraw all strokes on canvas WITHOUT FLASH - IMPROVED
  const redrawCanvas = useCallback((canvasId) => {
    const canvas = canvasRefs.current[canvasId];
    const ctx = contextRefs.current[canvasId];
    const data = drawingData.current[canvasId];
    const bgImage = backgroundImages.current[canvasId];
    
    if (!canvas || !ctx || !data) return;

    // Use requestAnimationFrame to prevent flash
    requestAnimationFrame(() => {
      // Store current state
      const currentStrokeStyle = ctx.strokeStyle;
      const currentLineWidth = ctx.lineWidth;
      const currentCompositeOp = ctx.globalCompositeOperation;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background immediately if available
      if (bgImage) {
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(bgImage, 0, 0, rect.width, rect.height);
        
        // Draw all strokes with FIXED positioning
        if (data.strokes && data.strokes.length > 0) {
          data.strokes.forEach(stroke => {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
            
            if (stroke.type === 'path' && stroke.points) {
              ctx.beginPath();
              stroke.points.forEach((point, index) => {
                if (index === 0) {
                  ctx.moveTo(point.x, point.y);
                } else {
                  ctx.lineTo(point.x, point.y);
                }
              });
              ctx.stroke();
            } else if (stroke.type === 'shape') {
              ctx.beginPath();
              drawShape(ctx, stroke.startPos, stroke.endPos, stroke.tool);
              ctx.stroke();
            }
          });
        }
      }
      
      // Restore previous state
      ctx.strokeStyle = currentStrokeStyle;
      ctx.lineWidth = currentLineWidth;
      ctx.globalCompositeOperation = currentCompositeOp;
    });
  }, []);

  // FIXED Initialize canvas with proper reinitialization support
  const initializeCanvas = useCallback((canvas, backgroundImage, canvasId) => {
    
    if (!canvas || !backgroundImage || !canvasId) {
      return;
    }

    // Check if this is a maximized canvas reinitialization
    const isReinitializing = initializedCanvases.current.has(canvasId);
    
    if (isReinitializing) {
      // Don't prevent reinitialization for maximized canvases, just clean up first
      if (canvasRefs.current[canvasId]) {
        // Clean up existing canvas reference for reinitialization
      }
    }

    // Store existing drawing data if reinitializing
    let existingStrokes = [];
    if (isReinitializing && drawingData.current[canvasId] && drawingData.current[canvasId].strokes) {
      existingStrokes = [...drawingData.current[canvasId].strokes];
    }

    const rect = canvas.getBoundingClientRect();
    
    // FIXED: Ensure minimum canvas size
    const canvasWidth = Math.max(rect.width, 100);
    const canvasHeight = Math.max(rect.height, 100);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    
    // FIXED: Clear any existing content first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Enhanced context setup
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    
    canvasRefs.current[canvasId] = canvas;
    contextRefs.current[canvasId] = ctx;
    
    // FIXED: Create fresh drawing data with complete structure, preserving existing strokes
    drawingData.current[canvasId] = {
      strokes: existingStrokes, // Preserve existing strokes
      backgroundImage: backgroundImage,
      originalWidth: 0,
      originalHeight: 0,
      displayWidth: canvasWidth,
      displayHeight: canvasHeight,
      canvasId: canvasId,
      initialized: true
    };


    // CRITICAL: Mark as initialized
    initializedCanvases.current.add(canvasId);

    // Create a colored background while image loads
    ctx.fillStyle = '#f0f0f0';  // Light gray background
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // FIX: Clean and validate the URL
    let imageUrl;
    try {
      // Handle both data URLs and regular URLs
      if (typeof backgroundImage === 'string') {
        if (backgroundImage.startsWith('data:')) {
          // For data URLs, split at the first # to remove any unique IDs
          imageUrl = backgroundImage.split('#')[0];
        } else {
          // For HTTP URLs, create a proper URL object to validate/clean it
          const url = new URL(backgroundImage);
          imageUrl = url.toString();
        }
      } else {
        // Create a fallback colored background
        createFallbackBackground(ctx, canvasWidth, canvasHeight, canvasId);
        return;
      }
    } catch (urlError) {
      // Create a fallback colored background
      createFallbackBackground(ctx, canvasWidth, canvasHeight, canvasId);
      return;
    }

    // FIX: Enhanced image loading with better error handling and retry
    let retryCount = 0;
    const maxRetries = 2;

    const loadImage = () => {
      const img = new Image();
      
      // FIX: Set crossOrigin to anonymous to avoid CORS issues
      if (!imageUrl.startsWith('data:')) {
        img.crossOrigin = "anonymous";
      }
      
      // FIX: Handle successful image load
      img.onload = () => {
        
        // FIXED: Double-check canvas still exists and matches
        if (canvasRefs.current[canvasId] === canvas && 
            drawingData.current[canvasId]?.backgroundImage === backgroundImage &&
            initializedCanvases.current.has(canvasId)) {
          
          backgroundImages.current[canvasId] = img;
          drawingData.current[canvasId].originalWidth = img.naturalWidth;
          drawingData.current[canvasId].originalHeight = img.naturalHeight;
          
          // Draw background with proper error handling
          requestAnimationFrame(() => {
            const currentCtx = contextRefs.current[canvasId];
            const currentCanvas = canvasRefs.current[canvasId];
            
            if (currentCtx && currentCanvas === canvas && initializedCanvases.current.has(canvasId)) {
              try {
                currentCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                currentCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                
                // Mark as fully initialized
                drawingData.current[canvasId].fullyInitialized = true;
                
                // IMPORTANT: Redraw existing strokes after background is loaded
                const existingStrokes = drawingData.current[canvasId].strokes;
                if (existingStrokes && existingStrokes.length > 0) {
                  redrawCanvas(canvasId);
                }
                
              } catch (drawError) {
                // Create a fallback colored background
                createFallbackBackground(currentCtx, canvasWidth, canvasHeight, canvasId);
              }
            }
          });
        }
      };
      
      // FIX: Enhanced error handling for image loading
      img.onerror = (error) => {

        // Retry logic
        if (retryCount < maxRetries) {
          retryCount++;
          
          // Add a small delay before retry
          setTimeout(loadImage, 500);
        } else {
          // Create a fallback colored background
          createFallbackBackground(ctx, canvasWidth, canvasHeight, canvasId);
        }
      };
      
      // FIX: Add a timeout to handle stalled image loads
      const timeout = setTimeout(() => {
        if (!backgroundImages.current[canvasId]) {
          img.src = '';  // Cancel current load
          
          if (retryCount < maxRetries) {
            retryCount++;
            loadImage();
          } else {
            // Create a fallback colored background
            createFallbackBackground(ctx, canvasWidth, canvasHeight, canvasId);
          }
        }
      }, 5000);  // 5 second timeout
      
      // FIX: Start image loading with clean URL
      img.src = imageUrl;
      
      // FIX: Handle immediate errors
      if (img.complete && img.naturalWidth === 0) {
        clearTimeout(timeout);
        createFallbackBackground(ctx, canvasWidth, canvasHeight, canvasId);
      }
    };
    
    // Start the image loading process
    loadImage();
  }, []);

  // FIXED: Fallback background creation function - no longer tries to set read-only properties
  const createFallbackBackground = (ctx, width, height, canvasId) => {
    
    try {
      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f8f9fa');
      gradient.addColorStop(1, '#e9ecef');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Add some text to indicate it's a fallback
      ctx.fillStyle = '#6c757d';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Drawing canvas', width/2, height/2);
      
      // FIXED: Create a proper fallback image using canvas instead of trying to modify Image properties
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = width;
      fallbackCanvas.height = height;
      const fallbackCtx = fallbackCanvas.getContext('2d');
      
      // Draw the same background on the fallback canvas
      const fallbackGradient = fallbackCtx.createLinearGradient(0, 0, width, height);
      fallbackGradient.addColorStop(0, '#f8f9fa');
      fallbackGradient.addColorStop(1, '#e9ecef');
      
      fallbackCtx.fillStyle = fallbackGradient;
      fallbackCtx.fillRect(0, 0, width, height);
      
      // Create an Image object from the canvas data
      const fallbackImage = new Image();
      fallbackImage.src = fallbackCanvas.toDataURL();
      
      // Store the fallback image - this will have proper naturalWidth/naturalHeight once loaded
      fallbackImage.onload = () => {
        backgroundImages.current[canvasId] = fallbackImage;
      };
      
      // Mark as fully initialized
      if (drawingData.current[canvasId]) {
        drawingData.current[canvasId].fullyInitialized = true;
        drawingData.current[canvasId].originalWidth = width;
        drawingData.current[canvasId].originalHeight = height;
        drawingData.current[canvasId].useFallback = true;
      }
      
    } catch (error) {
      // Error creating fallback background
    }
  };

  const updateCanvasContext = useCallback((canvasId) => {
    const ctx = contextRefs.current[canvasId];
    if (ctx) {
      ctx.strokeStyle = selectedTool === 'eraser' ? 'transparent' : selectedColor;
      ctx.lineWidth = lineWidth;
      ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    }
  }, [selectedColor, selectedTool, lineWidth]);

  const startDrawing = useCallback((e) => {
    const canvas = e.target;
    const canvasId = canvas.getAttribute('data-canvas-id');
    
    if (!canvas || !canvasId) return;

    setIsDrawing(true);
    const mousePos = getMousePos(canvas, e);
    startPoints.current[canvasId] = mousePos;

    const ctx = contextRefs.current[canvasId];
    if (!ctx) return;

    updateCanvasContext(canvasId);

    if (selectedTool === 'brush' || selectedTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(mousePos.x, mousePos.y);
      
      // Initialize strokes array if needed
      if (!drawingData.current[canvasId].strokes) {
        drawingData.current[canvasId].strokes = [];
      }
      
      // Add new stroke
      drawingData.current[canvasId].strokes.push({
        tool: selectedTool,
        color: selectedColor,
        lineWidth: lineWidth,
        points: [mousePos],
        type: 'path'
      });
    } else {
      // FIXED: For shapes, create a clean snapshot without clearing everything
      const canvas = canvasRefs.current[canvasId];
      if (canvas) {
        const tempCanvasEl = document.createElement('canvas');
        tempCanvasEl.width = canvas.width;
        tempCanvasEl.height = canvas.height;
        
        const tempCtx = tempCanvasEl.getContext('2d');
        // Copy EXACTLY what's on the main canvas
        tempCtx.drawImage(canvas, 0, 0);
        
        tempCanvas.current[canvasId] = tempCanvasEl;
      }
    }
  }, [selectedColor, selectedTool, lineWidth, updateCanvasContext]);

  // FIXED draw function - no more position shifting
  const draw = useCallback((e) => {
    if (!isDrawing) return;
    
    const canvas = e.target;
    const canvasId = canvas.getAttribute('data-canvas-id');
    
    if (!canvas || !canvasId) return;

    const ctx = contextRefs.current[canvasId];
    if (!ctx) return;

    const mousePos = getMousePos(canvas, e);

    if (selectedTool === 'brush' || selectedTool === 'eraser') {
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      
      // Add point to current stroke
      const strokes = drawingData.current[canvasId].strokes;
      if (strokes && strokes.length > 0) {
        const currentStroke = strokes[strokes.length - 1];
        currentStroke.points.push(mousePos);
        
        // Sync with corresponding canvas during drawing
        const correspondingId = canvasId.includes('maximized-canvas-') 
          ? canvasId.replace('maximized-canvas-', '')
          : `maximized-canvas-${canvasId}`;
        
        if (drawingData.current[correspondingId]) {
          const sourceData = drawingData.current[canvasId];
          const targetData = drawingData.current[correspondingId];
          
          if (sourceData && targetData && sourceData.strokes) {
            targetData.strokes = [...sourceData.strokes];
            if (targetData.fullyInitialized) {
              redrawCanvas(correspondingId);
            }
          }
        }
      }
    } else {
      // FIXED: For shapes preview - no more shifting
      const tempCanvasEl = tempCanvas.current[canvasId];
      if (tempCanvasEl && canvas) {
        // Clear and restore from temp canvas WITHOUT affecting stored strokes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvasEl, 0, 0);
        
        // Draw preview shape with consistent context
        const currentStrokeStyle = ctx.strokeStyle;
        const currentLineWidth = ctx.lineWidth;
        const currentCompositeOp = ctx.globalCompositeOperation;
        
        updateCanvasContext(canvasId);
        ctx.beginPath();
        drawShape(ctx, startPoints.current[canvasId], mousePos, selectedTool);
        ctx.stroke();
        
        // Restore context
        ctx.strokeStyle = currentStrokeStyle;
        ctx.lineWidth = currentLineWidth;
        ctx.globalCompositeOperation = currentCompositeOp;
      }
    }
  }, [isDrawing, selectedTool, updateCanvasContext]);

  // FIXED drawShape function with consistent coordinates
  const drawShape = (ctx, startPos, endPos, tool) => {
    if (!startPos || !endPos) return;

    switch (tool) {
      case 'line':
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        break;
        
      case 'rectangle':
        const width = endPos.x - startPos.x;
        const height = endPos.y - startPos.y;
        ctx.rect(startPos.x, startPos.y, width, height);
        break;
        
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
        );
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        break;
        
      case 'arrow':
        drawArrow(ctx, startPos.x, startPos.y, endPos.x, endPos.y);
        break;
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
  };

  // FIXED stopDrawing - proper shape finalization and data syncing
  const stopDrawing = useCallback((e) => {
    if (!isDrawing) return;
    
    const canvas = e.target;
    const canvasId = canvas.getAttribute('data-canvas-id');
    
    if (!canvas || !canvasId) return;

    setIsDrawing(false);
    
    if (selectedTool !== 'brush' && selectedTool !== 'eraser') {
      const mousePos = getMousePos(canvas, e);
      const startPos = startPoints.current[canvasId];
      
      if (startPos && mousePos) {
        // Initialize strokes array if needed
        if (!drawingData.current[canvasId].strokes) {
          drawingData.current[canvasId].strokes = [];
        }
        
        // Add final shape to strokes with EXACT coordinates
        drawingData.current[canvasId].strokes.push({
          tool: selectedTool,
          color: selectedColor,
          lineWidth: lineWidth,
          startPos: { ...startPos }, // Create copy to avoid reference issues
          endPos: { ...mousePos },   // Create copy to avoid reference issues
          type: 'shape'
        });
      }
      
      // Clean up temp canvas
      delete tempCanvas.current[canvasId];
    }

    // IMPORTANT: Sync drawing data between minimize and maximize views
    const correspondingId = canvasId.includes('maximized-canvas-') 
      ? canvasId.replace('maximized-canvas-', '')
      : `maximized-canvas-${canvasId}`;
    
    if (drawingData.current[correspondingId]) {
      const sourceData = drawingData.current[canvasId];
      const targetData = drawingData.current[correspondingId];
      
      if (sourceData && targetData && sourceData.strokes) {
        targetData.strokes = [...sourceData.strokes];
        if (targetData.fullyInitialized) {
          redrawCanvas(correspondingId);
        }
      }
    }
  }, [isDrawing, selectedTool, selectedColor, lineWidth, redrawCanvas]);

  const clearCanvas = useCallback((canvasId) => {
    
    const canvas = canvasRefs.current[canvasId];
    const ctx = contextRefs.current[canvasId];
    const data = drawingData.current[canvasId];
    
    if (!canvas || !ctx || !data) {
      return;
    }

    // Clear strokes data
    data.strokes = [];
    
    // FIXED: Force complete refresh with better error handling
    try {
      requestAnimationFrame(() => {
        if (canvasRefs.current[canvasId] === canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const bgImage = backgroundImages.current[canvasId];
          if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
            try {
              const rect = canvas.getBoundingClientRect();
              ctx.drawImage(bgImage, 0, 0, rect.width, rect.height);
            } catch (drawError) {
              // Create fallback background
              createFallbackBackground(ctx, canvas.width, canvas.height, canvasId);
            }
          }
        }
      });
    } catch (error) {
      // Error during canvas clear
    }
  }, []);

  // Custom setters
  const setSelectedColorWithUpdate = useCallback((color) => {
    setSelectedColor(color);
  }, []);

  const setSelectedToolWithUpdate = useCallback((tool) => {
    setSelectedTool(tool);
  }, []);

  const setLineWidthWithUpdate = useCallback((width) => {
    setLineWidth(width);
  }, []);

  // Add function to get the corresponding canvas ID (minimize <-> maximize)
  const getCorrespondingCanvasId = useCallback((canvasId) => {
    if (canvasId.includes('maximized-canvas-')) {
      // Convert maximized to minimize
      const screenshotId = canvasId.replace('maximized-canvas-', '');
      return screenshotId; // This should be the minimize canvas ID
    } else {
      // Convert minimize to maximized
      return `maximized-canvas-${canvasId}`;
    }
  }, []);

  // Add function to synchronize drawing data between minimize and maximize views
  const syncDrawingData = useCallback((sourceCanvasId, targetCanvasId) => {
    const sourceData = drawingData.current[sourceCanvasId];
    const targetData = drawingData.current[targetCanvasId];
    
    if (sourceData && targetData && sourceData.strokes) {
      // Copy strokes from source to target
      targetData.strokes = [...sourceData.strokes];
      
      // Redraw target canvas with new strokes
      if (targetData.fullyInitialized) {
        redrawCanvas(targetCanvasId);
      }
    }
  }, [redrawCanvas]);

  // IMPROVED Merge with background - better scaling and debugging
  const mergeWithBackground = useCallback(async (backgroundImage, canvasId) => {

    return new Promise((resolve, reject) => {
      const bgImage = backgroundImages.current[canvasId];
      const data = drawingData.current[canvasId];

      if (!data) {
        // Return original image if no drawing data
        resolve(backgroundImage);
        return;
      }

      if (!data.strokes || data.strokes.length === 0) {
        // Return original image if no strokes
        resolve(backgroundImage);
        return;
      }

      // FIX: Handle both cached and non-cached scenarios more robustly
      try {
        // Create merged canvas
        const mergeCanvas = document.createElement('canvas');
        const mergeCtx = mergeCanvas.getContext('2d');
        
        // Set up canvas with proper dimensions
        let canvasWidth, canvasHeight;
        
        if (bgImage && !data.useFallback) {
          canvasWidth = bgImage.naturalWidth || 1920;
          canvasHeight = bgImage.naturalHeight || 1080;
        } else {
          canvasWidth = 1920; // Default high-res width
          canvasHeight = 1080; // Default high-res height
        }
        
        mergeCanvas.width = canvasWidth;
        mergeCanvas.height = canvasHeight;
        
        mergeCtx.imageSmoothingEnabled = true;
        mergeCtx.imageSmoothingQuality = 'high';
        
        // Draw background image - either from cache or load it fresh
        if (bgImage && !data.useFallback) {
          // Use cached image
          mergeCtx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
        } else {
          // Load image fresh
          const img = new Image();
          
          // Set proper onload handler before setting src
          img.onload = () => {
            // Draw the background
            mergeCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            
            // Draw strokes
            drawStrokesOnContext(mergeCtx, data, canvasWidth, canvasHeight);
            
            // Generate output and resolve
            const dataURL = mergeCanvas.toDataURL('image/png', 1.0);
            resolve(dataURL);
          };
          
          img.onerror = (error) => {
            // Create a fallback gradient background
            const gradient = mergeCtx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            gradient.addColorStop(0, '#f8f9fa');
            gradient.addColorStop(1, '#e9ecef');
            
            mergeCtx.fillStyle = gradient;
            mergeCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Still try to draw strokes
            drawStrokesOnContext(mergeCtx, data, canvasWidth, canvasHeight);
            
            const dataURL = mergeCanvas.toDataURL('image/png', 1.0);
            resolve(dataURL);
          };
          
          // FIX: Handle both data URLs and regular URLs safely
          if (typeof backgroundImage === 'string') {
            if (backgroundImage.startsWith('data:')) {
              img.src = backgroundImage.split('#')[0]; // Clean URL
            } else {
              try {
                const url = new URL(backgroundImage);
                img.crossOrigin = "anonymous";
                img.src = url.toString();
              } catch (urlError) {
                console.error('❌ Invalid URL for merge:', urlError);
                // Still create a fallback image
                img.onerror(new Error('Invalid URL'));
              }
            }
          } else {
            console.error('❌ Invalid background image format for merge');
            img.onerror(new Error('Invalid image format'));
          }
          
          return; // Return here as we're handling async in the onload/onerror
        }
        
        // If we got here, we have a cached image and already drew the background
        // Now draw all the strokes
        drawStrokesOnContext(mergeCtx, data, canvasWidth, canvasHeight);
        
        // Generate output and resolve
        const dataURL = mergeCanvas.toDataURL('image/png', 1.0);
        resolve(dataURL);
        
      } catch (error) {
        // Return original image on error
        resolve(backgroundImage);
      }
    });
  }, []);

  // FIX: Extract stroke drawing to reusable function
  const drawStrokesOnContext = (ctx, data, canvasWidth, canvasHeight) => {
    if (!data || !data.strokes || !data.strokes.length) return;
    
    // Calculate scaling factors
    const scaleX = canvasWidth / (data.displayWidth || canvasWidth);
    const scaleY = canvasHeight / (data.displayHeight || canvasHeight);
    
    // Draw all strokes
    data.strokes.forEach((stroke, index) => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth * Math.min(scaleX, scaleY);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      
      if (stroke.type === 'path' && stroke.points) {
        ctx.beginPath();
        stroke.points.forEach((point, pointIndex) => {
          const scaledX = point.x * scaleX;
          const scaledY = point.y * scaleY;
          
          if (pointIndex === 0) {
            ctx.moveTo(scaledX, scaledY);
          } else {
            ctx.lineTo(scaledX, scaledY);
          }
        });
        ctx.stroke();
      } else if (stroke.type === 'shape') {
        const startX = stroke.startPos.x * scaleX;
        const startY = stroke.startPos.y * scaleY;
        const endX = stroke.endPos.x * scaleX;
        const endY = stroke.endPos.y * scaleY;
        
        ctx.beginPath();
        
        switch (stroke.tool) {
          case 'line':
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            break;
            
          case 'rectangle':
            const width = endX - startX;
            const height = endY - startY;
            ctx.rect(startX, startY, width, height);
            break;
            
          case 'circle':
            const radius = Math.sqrt(
              Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
            );
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            break;
            
          case 'arrow':
            const headLength = 15 * Math.min(scaleX, scaleY);
            const angle = Math.atan2(endY - startY, endX - startX);
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            
            ctx.lineTo(
              endX - headLength * Math.cos(angle - Math.PI / 6),
              endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLength * Math.cos(angle + Math.PI / 6),
              endY - headLength * Math.sin(angle + Math.PI / 6)
            );
            break;
        }
        
        ctx.stroke();
      }
    });
  };

  return {
    colors,
    tools,
    selectedColor,
    setSelectedColor: setSelectedColorWithUpdate,
    selectedTool,
    setSelectedTool: setSelectedToolWithUpdate,
    lineWidth,
    setLineWidth: setLineWidthWithUpdate,
    initializeCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    mergeWithBackground,
    syncDrawingData,
    getCorrespondingCanvasId,
    drawingData: drawingData.current
  };
};

export default useDrawingTools;