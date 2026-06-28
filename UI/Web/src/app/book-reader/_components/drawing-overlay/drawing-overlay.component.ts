import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component,
  ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, inject
} from '@angular/core';
import {NgClass} from '@angular/common';
import {FormsModule} from '@angular/forms';

interface DrawPoint { x: number; y: number; lineWidth: number; color: string; opacity: number; }
type Stroke = DrawPoint[];

type Tool = 'pen' | 'highlighter' | 'eraser';

const STORAGE_KEY = (chapterId: number, page: number) => `drawing_${chapterId}_${page}`;

@Component({
  selector: 'app-drawing-overlay',
  imports: [NgClass, FormsModule],
  templateUrl: './drawing-overlay.component.html',
  styleUrls: ['./drawing-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DrawingOverlayComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) chapterId!: number;
  @Input({ required: true }) pageNumber!: number;
  @Input() drawMode = false;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly cdRef = inject(ChangeDetectorRef);
  tool: Tool = 'pen';
  color = '#1a73e8';
  toolSize = 4;
  readonly colors = ['#1a73e8', '#e8390f', '#0f9e3e', '#f5a623', '#9b59b6', '#000000'];
  strokeHistory: Stroke[] = [];

  private ctx!: CanvasRenderingContext2D;
  private isDown = false;
  private currentStroke: DrawPoint[] = [];
  private resizeObserver?: ResizeObserver;
  private penSize = 4;
  private highlighterSize = 20;
  private eraserSize = 24;

  // ── lifecycle ──────────────────────────────────────────────────────────────

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.fitCanvas();
    this.loadStrokes();
    this.bindEvents();

    this.resizeObserver = new ResizeObserver(() => {
      this.fitCanvas();
      this.redraw();
    });
    this.resizeObserver.observe(canvas.parentElement!);
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['chapterId'] || changes['pageNumber']) && this.ctx) {
      this.saveStrokes();
      this.strokeHistory = [];
      this.loadStrokes();
      this.redraw();
    }
  }

  ngOnDestroy() {
    this.saveStrokes();
    this.resizeObserver?.disconnect();
    this.unbindEvents();
  }

  // ── canvas sizing ──────────────────────────────────────────────────────────

  private fitCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = parent.clientWidth + 'px';
    canvas.style.height = parent.clientHeight + 'px';
    this.ctx.scale(dpr, dpr);
  }

  // ── event binding ─────────────────────────────────────────────────────────

  private boundTouchStart!: (e: TouchEvent) => void;
  private boundTouchMove!: (e: TouchEvent) => void;
  private boundTouchEnd!: (e: TouchEvent) => void;

  private bindEvents() {
    const canvas = this.canvasRef.nativeElement;
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove  = this.onTouchMove.bind(this);
    this.boundTouchEnd   = this.onTouchEnd.bind(this);
    canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  this.boundTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   this.boundTouchEnd);
    canvas.addEventListener('touchcancel', this.boundTouchEnd);
    canvas.addEventListener('mousedown',  this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove',  this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup',    this.onMouseUp.bind(this));
  }

  private unbindEvents() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.removeEventListener('touchstart',  this.boundTouchStart);
    canvas.removeEventListener('touchmove',   this.boundTouchMove);
    canvas.removeEventListener('touchend',    this.boundTouchEnd);
  }

  // ── drawing ───────────────────────────────────────────────────────────────

  private point(x: number, y: number, pressure: number): DrawPoint {
    const tool = this.tool;
    let lineWidth: number;
    let opacity: number;
    let color: string;

    if (tool === 'pen') {
      lineWidth = this.penSize * (0.5 + Math.log(pressure + 1) * 0.8);
      opacity = 1;
      color = this.color;
    } else if (tool === 'highlighter') {
      lineWidth = this.highlighterSize;
      opacity = 0.35;
      color = this.color;
    } else {
      lineWidth = this.eraserSize;
      opacity = 1;
      color = '#eraser';
    }
    return { x, y, lineWidth: Math.max(1, lineWidth), color, opacity };
  }

  private drawStroke(stroke: Stroke) {
    if (stroke.length < 1) return;
    const ctx = this.ctx;
    const l = stroke.length - 1;
    const pt = stroke[l];

    ctx.globalAlpha = pt.opacity;

    if (pt.color === '#eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = pt.lineWidth;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = pt.lineWidth;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.length >= 3) {
      const xc = (stroke[l].x + stroke[l - 1].x) / 2;
      const yc = (stroke[l].y + stroke[l - 1].y) / 2;
      ctx.lineWidth = stroke[l - 1].lineWidth;
      ctx.quadraticCurveTo(stroke[l - 1].x, stroke[l - 1].y, xc, yc);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(xc, yc);
    } else {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private redraw() {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    for (const stroke of this.strokeHistory) {
      this.ctx.beginPath();
      const path: DrawPoint[] = [];
      for (const pt of stroke) {
        path.push(pt);
        this.drawStroke(path);
      }
    }
  }

  // ── touch handlers ────────────────────────────────────────────────────────

  private onTouchStart(e: TouchEvent) {
    if (!this.drawMode) return;
    const touch = e.touches[0];
    // Only draw with Apple Pencil (stylus) OR when draw mode is active for finger too
    e.preventDefault();
    this.isDown = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const pressure = (touch as any).force > 0 ? (touch as any).force : 0.5;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.currentStroke = [this.point(x, y, pressure)];
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.drawMode || !this.isDown) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const rawPressure = (touch as any).force;
    const pressure = rawPressure > 0 ? rawPressure : 0.5;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    // Smooth line width
    const newPt = this.point(x, y, pressure);
    if (this.currentStroke.length > 0) {
      const prev = this.currentStroke[this.currentStroke.length - 1];
      newPt.lineWidth = newPt.lineWidth * 0.2 + prev.lineWidth * 0.8;
    }
    this.currentStroke.push(newPt);
    this.drawStroke(this.currentStroke);
  }

  private onTouchEnd(_e: TouchEvent) {
    if (!this.isDown) return;
    this.isDown = false;
    this.strokeHistory.push([...this.currentStroke]);
    this.currentStroke = [];
    this.saveStrokes();
  }

  // ── mouse handlers (desktop) ──────────────────────────────────────────────

  private onMouseDown(e: MouseEvent) {
    if (!this.drawMode) return;
    this.isDown = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.currentStroke = [this.point(x, y, 0.5)];
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.drawMode || !this.isDown) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPt = this.point(x, y, 0.5);
    if (this.currentStroke.length > 0) {
      const prev = this.currentStroke[this.currentStroke.length - 1];
      newPt.lineWidth = newPt.lineWidth * 0.2 + prev.lineWidth * 0.8;
    }
    this.currentStroke.push(newPt);
    this.drawStroke(this.currentStroke);
  }

  private onMouseUp(_e: MouseEvent) {
    if (!this.isDown) return;
    this.isDown = false;
    this.strokeHistory.push([...this.currentStroke]);
    this.currentStroke = [];
    this.saveStrokes();
  }

  // ── toolbar actions ───────────────────────────────────────────────────────

  setTool(t: Tool) {
    this.tool = t;
    if (t === 'pen') this.toolSize = this.penSize;
    else if (t === 'highlighter') this.toolSize = this.highlighterSize;
    else this.toolSize = this.eraserSize;
    this.cdRef.markForCheck();
  }

  onSizeChange() {
    const size = this.toolSize;
    if (this.tool === 'pen') this.penSize = size;
    else if (this.tool === 'highlighter') this.highlighterSize = size;
    else this.eraserSize = size;
  }

  undo() {
    this.strokeHistory.pop();
    this.redraw();
    this.saveStrokes();
    this.cdRef.markForCheck();
  }

  clear() {
    this.strokeHistory = [];
    this.redraw();
    this.saveStrokes();
    this.cdRef.markForCheck();
  }

  // ── persistence ───────────────────────────────────────────────────────────

  private saveStrokes() {
    try {
      localStorage.setItem(
        STORAGE_KEY(this.chapterId, this.pageNumber),
        JSON.stringify(this.strokeHistory)
      );
    } catch {}
  }

  private loadStrokes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(this.chapterId, this.pageNumber));
      this.strokeHistory = raw ? JSON.parse(raw) : [];
    } catch {
      this.strokeHistory = [];
    }
    if (this.ctx) this.redraw();
  }

  get hasStrokes() { return this.strokeHistory.length > 0; }
}
