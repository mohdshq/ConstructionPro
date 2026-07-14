import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, TouchableOpacity, Text, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import { X, Check, Pen, Circle as CircleIcon, Square as SquareIcon, MoveRight, Type, Undo2, Redo2, Trash2, MousePointer2, Plus, Minus, PaintBucket } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- TYPES ---
export type ToolType = 'freehand' | 'arrow' | 'circle' | 'rect' | 'text';
export type ModeType = 'draw' | 'select';

type BaseAnnotation = { id: string; color: string; strokeWidth: number };
export type ArrowAnnotation = BaseAnnotation & { type: 'arrow'; x1: number; y1: number; x2: number; y2: number };
export type RectAnnotation = BaseAnnotation & { type: 'rect'; x: number; y: number; width: number; height: number };
export type CircleAnnotation = BaseAnnotation & { type: 'circle'; cx: number; cy: number; r: number };
export type FreehandAnnotation = BaseAnnotation & { type: 'freehand'; points: {x: number, y: number}[] };
export type TextAnnotation = BaseAnnotation & { type: 'text'; x: number; y: number; text: string; fontSize: number };

export type Annotation = ArrowAnnotation | RectAnnotation | CircleAnnotation | FreehandAnnotation | TextAnnotation;

export interface PhotoMarkupProps {
    visible: boolean;
    imageUri: string;
    onDone: (base64: string) => void;
    onSkip: () => void;
}

// --- CONSTANTS ---
const COLORS = ['#FF0000', '#FF9900', '#FFD700', '#32CD32', '#1E90FF', '#000000', '#FFFFFF'];
const HIT_TOLERANCE = 20;
const HANDLE_RADIUS = 10;

// --- UTILS ---
const generateId = () => Math.random().toString(36).substring(2, 9);

const distanceToLine = (p: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    const A = p.x - p1.x;
    const B = p.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;
    if (param < 0) {
        xx = p1.x; yy = p1.y;
    } else if (param > 1) {
        xx = p2.x; yy = p2.y;
    } else {
        xx = p1.x + param * C;
        yy = p1.y + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
};

const hitTestAnnotation = (ann: Annotation, x: number, y: number): boolean => {
    switch (ann.type) {
        case 'arrow':
            return distanceToLine({x, y}, {x: ann.x1, y: ann.y1}, {x: ann.x2, y: ann.y2}) <= HIT_TOLERANCE;
        case 'freehand':
            for (let i = 0; i < ann.points.length - 1; i++) {
                if (distanceToLine({x, y}, ann.points[i], ann.points[i+1]) <= HIT_TOLERANCE) return true;
            }
            return false;
        case 'rect': {
            const rx = Math.min(ann.x, ann.x + ann.width);
            const ry = Math.min(ann.y, ann.y + ann.height);
            const rw = Math.abs(ann.width);
            const rh = Math.abs(ann.height);
            return (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh);
        }
        case 'circle': {
            const dx = x - ann.cx;
            const dy = y - ann.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist <= ann.r;
        }
        case 'text': {
            // Rough bounding box assumption based on fontSize
            const estimatedWidth = ann.text.length * (ann.fontSize * 0.6);
            const estimatedHeight = ann.fontSize;
            return (x >= ann.x && x <= ann.x + estimatedWidth && y >= ann.y - estimatedHeight && y <= ann.y + estimatedHeight * 0.2);
        }
    }
};

export default function PhotoMarkup({ visible, imageUri, onDone, onSkip }: PhotoMarkupProps) {
    const [mode, setMode] = useState<ModeType>('draw');
    const [tool, setTool] = useState<ToolType>('freehand');
    const [color, setColor] = useState<string>(COLORS[0]);
    
    // Undo/Redo & Annotations
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
    const [redoStack, setRedoStack] = useState<Annotation[][]>([]);
    
    // In-progress draw
    const [currentShape, setCurrentShape] = useState<Annotation | null>(null);
    
    // Selection
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragType, setDragType] = useState<'body' | 'handle_start' | 'handle_end' | 'handle_r' | 'handle_tl' | 'handle_tr' | 'handle_bl' | 'handle_br' | null>(null);
    
    // Text Modal
    const [textModalVisible, setTextModalVisible] = useState(false);
    const [textValue, setTextValue] = useState('');
    const [textPos, setTextPos] = useState<{x: number, y: number} | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const viewRef = useRef<View>(null);

    // --- HISTORY ---
    const commitMutation = useCallback((newAnnotations: Annotation[]) => {
        setUndoStack(prev => [...prev, annotations]);
        setRedoStack([]);
        setAnnotations(newAnnotations);
    }, [annotations]);

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        setRedoStack(r => [...r, annotations]);
        setUndoStack(u => u.slice(0, -1));
        setAnnotations(prev);
        setSelectedId(null);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(u => [...u, annotations]);
        setRedoStack(r => r.slice(0, -1));
        setAnnotations(next);
        setSelectedId(null);
    };

    const handleClear = () => {
        Alert.alert("Clear All", "Are you sure you want to clear all annotations?", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: () => {
                commitMutation([]);
                setSelectedId(null);
            }}
        ]);
    };

    // --- ACTIONS ---
    const handleDeleteSelected = () => {
        if (!selectedId) return;
        commitMutation(annotations.filter(a => a.id !== selectedId));
        setSelectedId(null);
    };

    const changeColor = (c: string) => {
        setColor(c);
        if (mode === 'select' && selectedId) {
            commitMutation(annotations.map(a => a.id === selectedId ? { ...a, color: c } : a));
        }
    };

    const updateSelectedTextSize = (delta: number) => {
        if (mode !== 'select' || !selectedId) return;
        setAnnotations(prev => {
            const next = prev.map(a => {
                if (a.id === selectedId && a.type === 'text') {
                    return { ...a, fontSize: Math.max(10, a.fontSize + delta) };
                }
                return a;
            });
            // We only push to undo stack occasionally to avoid spam, or on button press it's fine.
            return next;
        });
        // We do a delayed commit or explicit commit.
        // Actually, for button presses, we can just commit directly.
    };

    const commitSelectedTextSize = (delta: number) => {
        if (mode !== 'select' || !selectedId) return;
        const next = annotations.map(a => {
            if (a.id === selectedId && a.type === 'text') {
                return { ...a, fontSize: Math.max(10, a.fontSize + delta) };
            }
            return a;
        });
        commitMutation(next);
    };

    // --- GESTURES ---

    // Temp variables for gesture drag deltas to avoid complex re-rendering issues, 
    // but React state updates onJS thread are fast enough for simple SVG shapes.
    // We will use state.

    // Used to track initial selection geometry before drag
    const initialDragGeom = useRef<Annotation | null>(null);

    const handleTap = useCallback((x: number, y: number) => {
        if (mode === 'draw') {
            if (tool === 'text') {
                setTextPos({ x, y });
                setTextValue('');
                setEditingTextId(null);
                setTextModalVisible(true);
            }
        } else if (mode === 'select') {
            // Hit test in reverse order (topmost first)
            for (let i = annotations.length - 1; i >= 0; i--) {
                const ann = annotations[i];
                if (hitTestAnnotation(ann, x, y)) {
                    // Double tap for text edit check could be done via timestamp, but let's just do single tap selects.
                    // If already selected and it's text, edit it.
                    if (selectedId === ann.id && ann.type === 'text') {
                        setTextPos({ x: ann.x, y: ann.y });
                        setTextValue(ann.text);
                        setEditingTextId(ann.id);
                        setTextModalVisible(true);
                    } else {
                        setSelectedId(ann.id);
                    }
                    return;
                }
            }
            // Tap empty -> deselect
            setSelectedId(null);
        }
    }, [mode, tool, annotations, selectedId]);

    const handlePanStart = useCallback((x: number, y: number) => {
        if (mode === 'draw') {
            setSelectedId(null);
            if (tool === 'text') return; // Handled by tap
            
            const id = generateId();
            if (tool === 'freehand') {
                setCurrentShape({ id, type: 'freehand', color, strokeWidth: 3, points: [{x, y}] });
            } else if (tool === 'arrow') {
                setCurrentShape({ id, type: 'arrow', color, strokeWidth: 3, x1: x, y1: y, x2: x, y2: y });
            } else if (tool === 'rect') {
                setCurrentShape({ id, type: 'rect', color, strokeWidth: 3, x, y, width: 0, height: 0 });
            } else if (tool === 'circle') {
                setCurrentShape({ id, type: 'circle', color, strokeWidth: 3, cx: x, cy: y, r: 0 });
            }
        } else if (mode === 'select') {
            if (!selectedId) return;
            const ann = annotations.find(a => a.id === selectedId);
            if (!ann) return;
            initialDragGeom.current = JSON.parse(JSON.stringify(ann)); // Deep copy

            // Check handles
            if (ann.type === 'arrow') {
                if (distanceToLine({x, y}, {x: ann.x1, y: ann.y1}, {x: ann.x1, y: ann.y1}) <= HANDLE_RADIUS * 2) { setDragType('handle_start'); return; }
                if (distanceToLine({x, y}, {x: ann.x2, y: ann.y2}, {x: ann.x2, y: ann.y2}) <= HANDLE_RADIUS * 2) { setDragType('handle_end'); return; }
            } else if (ann.type === 'circle') {
                const rx = ann.cx + ann.r;
                if (distanceToLine({x, y}, {x: rx, y: ann.cy}, {x: rx, y: ann.cy}) <= HANDLE_RADIUS * 2) { setDragType('handle_r'); return; }
            } else if (ann.type === 'rect') {
                const x1 = Math.min(ann.x, ann.x + ann.width);
                const x2 = Math.max(ann.x, ann.x + ann.width);
                const y1 = Math.min(ann.y, ann.y + ann.height);
                const y2 = Math.max(ann.y, ann.y + ann.height);
                if (distanceToLine({x, y}, {x: x1, y: y1}, {x: x1, y: y1}) <= HANDLE_RADIUS * 2) { setDragType('handle_tl'); return; }
                if (distanceToLine({x, y}, {x: x2, y: y1}, {x: x2, y: y1}) <= HANDLE_RADIUS * 2) { setDragType('handle_tr'); return; }
                if (distanceToLine({x, y}, {x: x1, y: y2}, {x: x1, y: y2}) <= HANDLE_RADIUS * 2) { setDragType('handle_bl'); return; }
                if (distanceToLine({x, y}, {x: x2, y: y2}, {x: x2, y: y2}) <= HANDLE_RADIUS * 2) { setDragType('handle_br'); return; }
            }

            // Hit body
            if (hitTestAnnotation(ann, x, y)) {
                setDragType('body');
                return;
            }
            
            // Missed handles and body
            setDragType(null);
            setSelectedId(null);
        }
    }, [mode, tool, color, selectedId, annotations]);

    const handlePanUpdate = useCallback((x: number, y: number, translationX: number, translationY: number) => {
        if (mode === 'draw' && currentShape) {
            setCurrentShape(prev => {
                if (!prev) return prev;
                if (prev.type === 'freehand') return { ...prev, points: [...prev.points, {x, y}] };
                if (prev.type === 'arrow') return { ...prev, x2: x, y2: y };
                if (prev.type === 'rect') return { ...prev, width: x - prev.x, height: y - prev.y };
                if (prev.type === 'circle') return { ...prev, r: Math.sqrt(Math.pow(x - prev.cx, 2) + Math.pow(y - prev.cy, 2)) };
                return prev;
            });
        } else if (mode === 'select' && dragType && initialDragGeom.current) {
            const orig = initialDragGeom.current;
            setAnnotations(prevList => prevList.map(ann => {
                if (!ann || ann.id !== selectedId) return ann;
                let next = { ...ann };

                if (dragType === 'body') {
                    if (next.type === 'freehand' && orig.type === 'freehand') {
                        next.points = orig.points.map(p => ({ x: p.x + translationX, y: p.y + translationY }));
                    } else if (next.type === 'arrow' && orig.type === 'arrow') {
                        next.x1 = orig.x1 + translationX; next.y1 = orig.y1 + translationY;
                        next.x2 = orig.x2 + translationX; next.y2 = orig.y2 + translationY;
                    } else if (next.type === 'circle' && orig.type === 'circle') {
                        next.cx = orig.cx + translationX; next.cy = orig.cy + translationY;
                    } else if (next.type === 'rect' && orig.type === 'rect') {
                        next.x = orig.x + translationX; next.y = orig.y + translationY;
                    } else if (next.type === 'text' && orig.type === 'text') {
                        next.x = orig.x + translationX; next.y = orig.y + translationY;
                    }
                } else {
                    // Handles
                    if (next.type === 'arrow' && orig.type === 'arrow') {
                        if (dragType === 'handle_start') { next.x1 = orig.x1 + translationX; next.y1 = orig.y1 + translationY; }
                        if (dragType === 'handle_end') { next.x2 = orig.x2 + translationX; next.y2 = orig.y2 + translationY; }
                    } else if (next.type === 'circle' && orig.type === 'circle') {
                        if (dragType === 'handle_r') { next.r = Math.abs(x - orig.cx); }
                    } else if (next.type === 'rect' && orig.type === 'rect') {
                        // Normalize the rect for resizing
                        const x1 = Math.min(orig.x, orig.x + orig.width);
                        const x2 = Math.max(orig.x, orig.x + orig.width);
                        const y1 = Math.min(orig.y, orig.y + orig.height);
                        const y2 = Math.max(orig.y, orig.y + orig.height);
                        
                        let nx1 = x1, ny1 = y1, nx2 = x2, ny2 = y2;
                        if (dragType === 'handle_tl') { nx1 = x; ny1 = y; }
                        if (dragType === 'handle_tr') { nx2 = x; ny1 = y; }
                        if (dragType === 'handle_bl') { nx1 = x; ny2 = y; }
                        if (dragType === 'handle_br') { nx2 = x; ny2 = y; }
                        
                        next.x = nx1;
                        next.y = ny1;
                        next.width = nx2 - nx1;
                        next.height = ny2 - ny1;
                    }
                }
                return next as any;
            }));
        }
    }, [mode, currentShape, dragType, selectedId]);

    const handlePanEnd = useCallback(() => {
        if (mode === 'draw' && currentShape) {
            // Commit draw
            commitMutation([...annotations, currentShape]);
            setCurrentShape(null);
        } else if (mode === 'select' && dragType) {
            // Commit drag: keep the moved annotations live, push the pre-drag
            // snapshot onto the undo stack. Guard against a null snapshot so we
            // never write null into the annotations array.
            const orig = initialDragGeom.current;
            if (orig) {
                const listBeforeDrag = annotations.map(a =>
                    a && a.id === selectedId ? orig : a
                );
                setUndoStack(u => [...u, listBeforeDrag]);
                setRedoStack([]);
            }
            initialDragGeom.current = null;
            setDragType(null);
        }
    }, [mode, currentShape, dragType, selectedId, annotations, commitMutation]);


    const panGesture = Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onStart((e) => handlePanStart(e.x, e.y))
        .onUpdate((e) => handlePanUpdate(e.x, e.y, e.translationX, e.translationY))
        .onEnd(() => handlePanEnd());

    const tapGesture = Gesture.Tap()
        .runOnJS(true)
        .onEnd((e) => handleTap(e.x, e.y));

    const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

    // --- SAVE ---
    const handleSaveView = async () => {
        if (!viewRef.current) return;
        setIsSaving(true);
        // Deselect before capture so handles disappear
        setSelectedId(null);
        // Wait a tick for react to remove handles
        setTimeout(async () => {
            try {
                const result = await captureRef(viewRef as any, {
                    format: 'jpg',
                    quality: 0.8,
                    result: 'base64'
                });
                onDone(`data:image/jpeg;base64,${result}`);
            } catch (e) {
                console.error('Failed to capture view', e);
                setIsSaving(false);
            }
        }, 100);
    };

    const handleSkip = () => {
        onSkip();
    };

    const handleTextSubmit = () => {
        if (textValue.trim()) {
            if (editingTextId) {
                const next = annotations.map(a => a.id === editingTextId ? { ...a, text: textValue } : a);
                commitMutation(next);
            } else if (textPos) {
                const newText: TextAnnotation = {
                    id: generateId(),
                    type: 'text',
                    x: textPos.x,
                    y: textPos.y,
                    text: textValue,
                    color,
                    strokeWidth: 0,
                    fontSize: 24,
                };
                commitMutation([...annotations, newText]);
                setSelectedId(newText.id);
                setMode('select');
            }
        }
        setTextModalVisible(false);
        setTextPos(null);
        setEditingTextId(null);
    };

    // --- RENDER ---
    const renderShape = (shape: Annotation, isCurrent: boolean) => {
        const isSelected = selectedId === shape.id;
        const color = shape.color;
        const width = shape.strokeWidth;
        const opacity = isSelected ? 0.8 : 1.0;
        const key = isCurrent ? 'current' : shape.id;

        let element = null;

        if (shape.type === 'freehand') {
            const pathData = shape.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            element = <Path d={pathData} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
        } else if (shape.type === 'arrow') {
            const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
            const headlen = 15;
            const x1 = shape.x2 - headlen * Math.cos(angle - Math.PI / 6);
            const y1 = shape.y2 - headlen * Math.sin(angle - Math.PI / 6);
            const x2 = shape.x2 - headlen * Math.cos(angle + Math.PI / 6);
            const y2 = shape.y2 - headlen * Math.sin(angle + Math.PI / 6);
            element = (
                <G opacity={opacity}>
                    <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={color} strokeWidth={width} />
                    <Line x1={shape.x2} y1={shape.y2} x2={x1} y2={y1} stroke={color} strokeWidth={width} strokeLinecap="round" />
                    <Line x1={shape.x2} y1={shape.y2} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
                </G>
            );
        } else if (shape.type === 'circle') {
            element = <Circle cx={shape.cx} cy={shape.cy} r={shape.r} stroke={color} strokeWidth={width} fill="none" opacity={opacity} />;
        } else if (shape.type === 'rect') {
            element = <Rect x={Math.min(shape.x, shape.x + shape.width)} y={Math.min(shape.y, shape.y + shape.height)} width={Math.abs(shape.width)} height={Math.abs(shape.height)} stroke={color} strokeWidth={width} fill="none" opacity={opacity} />;
        } else if (shape.type === 'text') {
            element = <SvgText x={shape.x} y={shape.y} fill={color} fontSize={shape.fontSize} fontWeight="bold" opacity={opacity}>{shape.text}</SvgText>;
        }

        // Draw Handles if selected
        if (isSelected && mode === 'select' && !isCurrent) {
            const handleColor = "#FFF";
            const handleStroke = "#000";
            
            let handles = null;
            if (shape.type === 'arrow') {
                handles = (
                    <G>
                        <Circle cx={shape.x1} cy={shape.y1} r={HANDLE_RADIUS} fill={handleColor} stroke={handleStroke} strokeWidth={2} />
                        <Circle cx={shape.x2} cy={shape.y2} r={HANDLE_RADIUS} fill={handleColor} stroke={handleStroke} strokeWidth={2} />
                    </G>
                );
            } else if (shape.type === 'circle') {
                handles = <Circle cx={shape.cx + shape.r} cy={shape.cy} r={HANDLE_RADIUS} fill={handleColor} stroke={handleStroke} strokeWidth={2} />;
            } else if (shape.type === 'rect') {
                const rx1 = Math.min(shape.x, shape.x + shape.width);
                const rx2 = Math.max(shape.x, shape.x + shape.width);
                const ry1 = Math.min(shape.y, shape.y + shape.height);
                const ry2 = Math.max(shape.y, shape.y + shape.height);
                handles = (
                    <G>
                        <Circle cx={rx1} cy={ry1} r={HANDLE_RADIUS} fill={handleColor} stroke={handleStroke} strokeWidth={2} />
                        <Circle cx={rx2} cy={ry1} r={HANDLE_RADIUS} fill={handleColor} stroke={handleStroke} strokeWidth={2} />
                        <Circle cx={rx1} cy={ry2} r={HANDLE_RADIUS} fill={handleColor} stroke={handleStroke} strokeWidth={2} />
                        <Circle cx={rx2} cy={ry2} r={HANDLE_RADIUS} fill={handleColor} stroke={handleStroke} strokeWidth={2} />
                        {/* Bounding box dashed line */}
                        <Rect x={rx1} y={ry1} width={rx2-rx1} height={ry2-ry1} stroke="#FFF" strokeWidth={1} strokeDasharray="4,4" fill="none" />
                    </G>
                );
            } else if (shape.type === 'freehand' || shape.type === 'text') {
                // Approximate bounding box just for visual feedback
                let minX=0, maxX=0, minY=0, maxY=0;
                if (shape.type === 'freehand') {
                    minX = Math.min(...shape.points.map(p => p.x));
                    maxX = Math.max(...shape.points.map(p => p.x));
                    minY = Math.min(...shape.points.map(p => p.y));
                    maxY = Math.max(...shape.points.map(p => p.y));
                } else if (shape.type === 'text') {
                    minX = shape.x;
                    maxX = shape.x + shape.text.length * (shape.fontSize * 0.6);
                    minY = shape.y - shape.fontSize;
                    maxY = shape.y + shape.fontSize * 0.2;
                }
                handles = <Rect x={minX-5} y={minY-5} width={maxX-minX+10} height={maxY-minY+10} stroke="#FFF" strokeWidth={1} strokeDasharray="4,4" fill="none" />;
            }

            return (
                <G key={key}>
                    {element}
                    {handles}
                </G>
            );
        }

        return React.cloneElement(element as any, { key });
    };

    return (
        <Modal visible={visible} transparent={false} animationType="fade">
            <GestureHandlerRootView style={styles.container}>
                {/* TOP TOOLBAR */}
                <View style={styles.topToolbar}>
                    <TouchableOpacity onPress={handleSkip} style={styles.headerBtn}>
                        <X size={24} color="#FFF" />
                        <Text style={styles.headerBtnText}>Skip</Text>
                    </TouchableOpacity>

                    <View style={styles.centerActions}>
                        <TouchableOpacity onPress={handleUndo} disabled={undoStack.length === 0} style={{ opacity: undoStack.length > 0 ? 1 : 0.4 }}>
                            <Undo2 size={22} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleRedo} disabled={redoStack.length === 0} style={{ opacity: redoStack.length > 0 ? 1 : 0.4 }}>
                            <Redo2 size={22} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleClear} style={{ marginLeft: 15 }}>
                            <Trash2 size={22} color="#FF4444" />
                        </TouchableOpacity>
                        {selectedId && (
                            <TouchableOpacity onPress={handleDeleteSelected} style={{ marginLeft: 15 }}>
                                <Text style={{ color: '#FF4444', fontWeight: 'bold' }}>Del</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity onPress={handleSaveView} style={styles.headerBtn} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : (
                            <>
                                <Check size={24} color="#FFF" />
                                <Text style={styles.headerBtnText}>Done</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* CANVAS */}
                <View style={styles.content}>
                    <GestureDetector gesture={composedGesture}>
                        <View ref={viewRef} style={styles.imageContainer} collapsable={false}>
                            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
                            <Svg style={StyleSheet.absoluteFill}>
                                {annotations.filter(Boolean).map((shape) => renderShape(shape, false))}
                                {currentShape && renderShape(currentShape, true)}
                            </Svg>
                        </View>
                    </GestureDetector>
                </View>

                {/* BOTTOM TOOLBAR */}
                <View style={styles.bottomToolbar}>
                    {/* Top row: Mode + Tools */}
                    <View style={styles.toolsRow}>
                        <View style={styles.modeToggle}>
                            <TouchableOpacity onPress={() => setMode('draw')} style={[styles.modeBtn, mode === 'draw' && styles.modeBtnActive]}>
                                <Pen size={20} color={mode === 'draw' ? '#FFF' : '#AAA'} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMode('select')} style={[styles.modeBtn, mode === 'select' && styles.modeBtnActive]}>
                                <MousePointer2 size={20} color={mode === 'select' ? '#FFF' : '#AAA'} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.toolGroup}>
                            {(['freehand', 'arrow', 'circle', 'rect', 'text'] as ToolType[]).map(t => {
                                let Icon = Pen;
                                if (t === 'arrow') Icon = MoveRight;
                                else if (t === 'circle') Icon = CircleIcon;
                                else if (t === 'rect') Icon = SquareIcon;
                                else if (t === 'text') Icon = Type;

                                const isActive = mode === 'draw' && tool === t;
                                return (
                                    <TouchableOpacity key={t} onPress={() => { setTool(t); setMode('draw'); setSelectedId(null); }} style={[styles.toolBtn, isActive && styles.toolBtnActive]}>
                                        <Icon size={22} color={isActive ? '#FFF' : '#AAA'} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Bottom row: Colors / Text Size */}
                    <View style={styles.colorsRow}>
                        {mode === 'select' && selectedId && annotations.find(a => a.id === selectedId)?.type === 'text' ? (
                            <View style={styles.textSizeGroup}>
                                <Text style={styles.textSizeLabel}>Font Size</Text>
                                <TouchableOpacity onPress={() => commitSelectedTextSize(-4)} style={styles.sizeBtn}><Minus size={20} color="#FFF" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => commitSelectedTextSize(4)} style={styles.sizeBtn}><Plus size={20} color="#FFF" /></TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.colorPalette}>
                                {COLORS.map(c => (
                                    <TouchableOpacity key={c} onPress={() => changeColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]} />
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </GestureHandlerRootView>

            {/* TEXT INPUT MODAL */}
            <Modal visible={textModalVisible} transparent={true} animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.textModalContainer}>
                    <View style={styles.textModalContent}>
                        <TextInput
                            style={styles.textInput}
                            value={textValue}
                            onChangeText={setTextValue}
                            placeholder="Enter text..."
                            placeholderTextColor="#888"
                            autoFocus
                            onSubmitEditing={handleTextSubmit}
                        />
                        <View style={styles.textModalActions}>
                            <TouchableOpacity onPress={() => { setTextModalVisible(false); setTextPos(null); setEditingTextId(null); }} style={styles.textModalBtn}>
                                <Text style={{ color: '#FF4444', fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleTextSubmit} style={styles.textModalBtn}>
                                <Text style={{ color: '#32CD32', fontSize: 16, fontWeight: 'bold' }}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    topToolbar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#1A1A1A',
        zIndex: 10,
    },
    headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    headerBtnText: { color: '#FFF', fontSize: 16 },
    centerActions: { flexDirection: 'row', gap: 15, alignItems: 'center' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 180 }, // approx
    image: { width: '100%', height: '100%' },
    bottomToolbar: {
        backgroundColor: '#1A1A1A', paddingBottom: 30, paddingTop: 15, paddingHorizontal: 15, gap: 15
    },
    toolsRow: { flexDirection: 'row', alignItems: 'center' },
    modeToggle: { flexDirection: 'row', backgroundColor: '#333', borderRadius: 8, padding: 2 },
    modeBtn: { padding: 10, borderRadius: 6 },
    modeBtnActive: { backgroundColor: '#555' },
    divider: { width: 1, height: 30, backgroundColor: '#444', marginHorizontal: 10 },
    toolGroup: { flexDirection: 'row', gap: 5, flex: 1, justifyContent: 'space-between' },
    toolBtn: { padding: 10, borderRadius: 8 },
    toolBtnActive: { backgroundColor: '#444' },
    colorsRow: { flexDirection: 'row', justifyContent: 'center' },
    colorPalette: { flexDirection: 'row', gap: 15 },
    colorSwatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#333' },
    colorSwatchActive: { borderColor: '#FFF', transform: [{ scale: 1.1 }] },
    textSizeGroup: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 5, borderRadius: 20 },
    textSizeLabel: { color: '#FFF', fontSize: 14 },
    sizeBtn: { backgroundColor: '#555', padding: 5, borderRadius: 15 },
    
    textModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    textModalContent: { width: '80%', backgroundColor: '#222', borderRadius: 12, padding: 20 },
    textInput: { backgroundColor: '#111', color: '#FFF', fontSize: 18, padding: 15, borderRadius: 8, marginBottom: 20 },
    textModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
    textModalBtn: { padding: 10 }
});
